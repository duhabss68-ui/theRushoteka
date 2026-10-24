"""Servidor del administrador: acepta las conexiones de los agentes cliente,
los autentica, recibe sus fotogramas y les envía órdenes.

Es agnóstico de la interfaz: la consola (Tkinter) consulta el registro de
clientes y llama a los métodos de envío. Toda la concurrencia vive aquí.
"""

from __future__ import annotations

import logging
import socket
import threading
import time
from typing import Callable, Dict, List, Optional

from .. import protocol as proto
from .. import security
from .. import tlsutil
from ..config import AdminConfig

log = logging.getLogger("classroomcontrol")

# Latido: cada cuánto se envía PING y cuándo se considera caído un cliente.
HEARTBEAT_INTERVAL = 3.0   # segundos entre pings
DEAD_TIMEOUT = 12.0        # sin noticias -> conexión muerta, se cierra


class ClientConn:
    """Estado y socket de un equipo cliente conectado."""

    def __init__(self, cid: int, sock: socket.socket, addr) -> None:
        self.id = cid
        self.sock = sock
        self.addr = addr
        self.host = "?"
        self.user = "?"
        self.width = 0
        self.height = 0
        self.connected_at = time.time()

        # Último fotograma recibido (JPEG) y un contador para que la GUI sepa
        # si hay algo nuevo que decodificar.
        self.frame_jpeg: bytes = b""
        self.frame_w = 0
        self.frame_h = 0
        self.frame_counter = 0
        self.last_frame_at = 0.0
        # Último instante en que llegó CUALQUIER mensaje (fotograma o pong).
        # Sirve para detectar conexiones muertas con el latido.
        self.last_seen = time.time()

        self.controlled = False
        self.focused = False
        self.locked = False
        self.alive = True
        self._send_lock = threading.Lock()

    def send(self, obj, blob: bytes = b"") -> None:
        if not self.alive:
            return
        try:
            with self._send_lock:
                proto.send_msg(self.sock, obj, blob)
        except OSError:
            self.alive = False

    def label(self) -> str:
        return f"{self.host} ({self.user})"


class AdminServer:
    def __init__(self, cfg: AdminConfig) -> None:
        self.cfg = cfg
        self._clients: Dict[int, ClientConn] = {}
        self._lock = threading.Lock()
        self._next_id = 1
        self._srv: Optional[socket.socket] = None
        self._stop = threading.Event()
        self._ssl_ctx = None
        self.on_change: Optional[Callable[[], None]] = None  # aviso a la GUI

    # --- Arranque/parada ----------------------------------------------------
    def start(self) -> None:
        if self.cfg.use_tls:
            self._ssl_ctx = tlsutil.make_server_context(self.cfg.certfile, self.cfg.keyfile)
        self._srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._srv.bind((self.cfg.listen_host, self.cfg.listen_port))
        self._srv.listen(64)
        threading.Thread(target=self._accept_loop, daemon=True).start()
        threading.Thread(target=self._heartbeat_loop, daemon=True).start()
        tls = "TLS" if self._ssl_ctx else "sin cifrar"
        log.info("Escuchando en %s:%s (%s)", self.cfg.listen_host, self.cfg.listen_port, tls)

    def stop(self) -> None:
        self._stop.set()
        if self._srv is not None:
            try:
                self._srv.close()
            except Exception:
                pass
        with self._lock:
            for c in self._clients.values():
                c.alive = False
                try:
                    c.sock.close()
                except Exception:
                    pass
            self._clients.clear()

    def _accept_loop(self) -> None:
        assert self._srv is not None
        while not self._stop.is_set():
            try:
                sock, addr = self._srv.accept()
            except OSError:
                break
            threading.Thread(target=self._handle, args=(sock, addr), daemon=True).start()

    # --- Ciclo de vida de una conexión -------------------------------------
    def _handle(self, sock: socket.socket, addr) -> None:
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE, 1)
        sock.settimeout(15)
        # Envoltura TLS (si está activada) antes de cualquier intercambio.
        if self._ssl_ctx is not None:
            try:
                sock = self._ssl_ctx.wrap_socket(sock, server_side=True)
            except Exception as exc:  # noqa: BLE001
                log.warning("Handshake TLS fallido desde %s: %s", addr, exc)
                try:
                    sock.close()
                except Exception:
                    pass
                return
        try:
            # Autenticación con tiempo límite para no dejar hilos colgados.
            nonce = security.make_nonce()
            proto.send_msg(sock, {"t": proto.T_CHALLENGE, "nonce": nonce})
            msg, _ = proto.recv_msg(sock)
            if msg.get("t") != proto.T_AUTH or not security.verify(
                self.cfg.token, nonce, msg.get("mac", "")
            ):
                proto.send_msg(sock, {"t": proto.T_AUTH_FAIL})
                sock.close()
                log.warning("Autenticación fallida desde %s", addr)
                return
            proto.send_msg(sock, {"t": proto.T_AUTH_OK})
            sock.settimeout(None)
        except Exception as exc:  # noqa: BLE001
            try:
                sock.close()
            except Exception:
                pass
            log.warning("Handshake fallido desde %s: %s", addr, exc)
            return

        with self._lock:
            cid = self._next_id
            self._next_id += 1
            conn = ClientConn(cid, sock, addr)
            conn.host = str(msg.get("host", addr[0]))
            conn.user = str(msg.get("user", "?"))
            conn.width = int(msg.get("w", 0))
            conn.height = int(msg.get("h", 0))
            self._clients[cid] = conn
        log.info("Conectado #%s: %s desde %s", cid, conn.label(), addr[0])
        self._notify()

        try:
            while not self._stop.is_set() and conn.alive:
                m, blob = proto.recv_msg(sock)
                self._on_client_msg(conn, m, blob)
        except Exception:
            pass
        finally:
            conn.alive = False
            with self._lock:
                self._clients.pop(cid, None)
            try:
                sock.close()
            except Exception:
                pass
            log.info("Desconectado #%s: %s", cid, conn.label())
            self._notify()

    def _on_client_msg(self, conn: ClientConn, msg, blob: bytes) -> None:
        t = msg.get("t")
        conn.last_seen = time.time()  # cualquier mensaje cuenta como señal de vida
        if t == proto.T_FRAME:
            conn.frame_jpeg = blob
            conn.frame_w = int(msg.get("w", 0))
            conn.frame_h = int(msg.get("h", 0))
            conn.frame_counter += 1
            conn.last_frame_at = conn.last_seen
        # T_PONG solo sirve para refrescar last_seen (ya hecho arriba).

    # --- Latido: detecta y cierra conexiones muertas -----------------------
    def _heartbeat_loop(self) -> None:
        while not self._stop.wait(HEARTBEAT_INTERVAL):
            now = time.time()
            for conn in self.clients():
                if now - conn.last_seen > DEAD_TIMEOUT:
                    log.info("Sin respuesta de #%s (%s); cerrando conexión muerta.",
                             conn.id, conn.label())
                    conn.alive = False
                    # shutdown() (no solo close()) desbloquea el recv() del hilo
                    # lector, que entonces ejecuta su limpieza y quita el cliente.
                    try:
                        conn.sock.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass
                    try:
                        conn.sock.close()
                    except OSError:
                        pass
                else:
                    conn.send({"t": proto.T_PING})

    def _notify(self) -> None:
        if self.on_change:
            try:
                self.on_change()
            except Exception:
                pass

    # --- Consultas y órdenes (usadas por la GUI) ---------------------------
    def clients(self) -> List[ClientConn]:
        with self._lock:
            return sorted(self._clients.values(), key=lambda c: (c.host.lower(), c.id))

    def get(self, cid: int) -> Optional[ClientConn]:
        with self._lock:
            return self._clients.get(cid)

    def set_stream(self, cid: int, *, enabled: bool, fps: float, scale: float, quality: int) -> None:
        c = self.get(cid)
        if c:
            c.send({"t": proto.T_STREAM, "enabled": enabled, "fps": fps,
                    "scale": scale, "quality": quality})

    def set_grid_quality(self, cid: int) -> None:
        """Devuelve un cliente a la calidad ligera de la rejilla."""
        c = self.get(cid)
        if c:
            c.focused = False
            # Recupera los valores por defecto del cliente dejándolo decidir:
            # enviamos escala/fps bajos típicos de rejilla.
            c.send({"t": proto.T_STREAM, "enabled": True, "fps": 2.0,
                    "scale": 0.25, "quality": 35})

    def set_focus_quality(self, cid: int) -> None:
        c = self.get(cid)
        if c:
            c.focused = True
            c.send({"t": proto.T_STREAM, "enabled": True, "fps": self.cfg.focus_fps,
                    "scale": self.cfg.focus_scale, "quality": self.cfg.focus_quality})

    def set_control(self, cid: int, on: bool) -> None:
        c = self.get(cid)
        if c:
            c.controlled = on
            c.send({"t": proto.T_CONTROL, "on": on})

    def send_input(self, cid: int, event: dict) -> None:
        c = self.get(cid)
        if c and c.controlled:
            payload = {"t": proto.T_INPUT}
            payload.update(event)
            c.send(payload)

    def send_message(self, cid: int, text: str, show: bool = True) -> None:
        c = self.get(cid)
        if c:
            c.send({"t": proto.T_MESSAGE, "text": text, "show": show})

    def set_lock(self, cid: int, on: bool, text: str = "") -> None:
        c = self.get(cid)
        if c:
            c.locked = on
            c.send({"t": proto.T_LOCK, "on": on, "text": text})

    def send_power(self, cid: int, action: str, delay: int = 5) -> None:
        c = self.get(cid)
        if c:
            c.send({"t": proto.T_POWER, "action": action, "delay": delay})

    # --- Acciones masivas ---------------------------------------------------
    def broadcast_message(self, text: str, show: bool = True) -> None:
        for c in self.clients():
            c.send({"t": proto.T_MESSAGE, "text": text, "show": show})

    def broadcast_power(self, action: str, delay: int = 5) -> None:
        for c in self.clients():
            c.send({"t": proto.T_POWER, "action": action, "delay": delay})

    def broadcast_lock(self, on: bool, text: str = "") -> None:
        for c in self.clients():
            c.locked = on
            c.send({"t": proto.T_LOCK, "on": on, "text": text})

    # --- Proyección de la pantalla del profesor ----------------------------
    def broadcast_show(self, on: bool) -> None:
        """Abre/cierra en todos los clientes la ventana de proyección."""
        for c in self.clients():
            c.send({"t": proto.T_BCAST, "on": on})

    def broadcast_frame(self, jpeg: bytes, w: int, h: int) -> None:
        """Envía a todos los clientes un fotograma de la pantalla del profesor."""
        for c in self.clients():
            c.send({"t": proto.T_BCAST_FRAME, "w": w, "h": h}, jpeg)
