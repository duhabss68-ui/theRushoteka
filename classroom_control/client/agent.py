"""Agente cliente: conecta con la consola del profesor, transmite la pantalla
y ejecuta las órdenes recibidas (control remoto, mensajes, energía).

Hilos:
  - Principal      : bucle de la GUI (OverlayManager) para indicador y mensajes.
  - Red            : ciclo de conexión/reconexión + lectura de mensajes del admin.
  - Transmisión    : captura y envío de fotogramas al ritmo configurado.

El agente se conecta HACIA el administrador (el admin es el servidor). Así solo
hay que configurar en cada equipo la IP del profesor; los equipos pueden tener
IP dinámica y reconectan solos si la consola arranca después.
"""

from __future__ import annotations

import getpass
import logging
import socket
import threading
import time
from dataclasses import dataclass

from .. import protocol as proto
from .. import security
from .. import tlsutil
from . import actions
from ..config import ClientConfig, load_client_config
from ..logutil import install_excepthook, setup_logging

log = logging.getLogger("classroomcontrol")
from .inputctl import InputInjector
from .overlay import OverlayManager
from .power import execute as power_execute
from .screen import ScreenGrabber


@dataclass
class _StreamParams:
    enabled: bool = True
    fps: float = 2.0
    scale: float = 0.25
    quality: int = 35


class Agent:
    def __init__(self, cfg: ClientConfig) -> None:
        self.cfg = cfg
        self.overlay = OverlayManager(show_indicator=cfg.show_indicator)
        self.overlay.root.report_callback_exception = lambda *a: log.error(
            "Excepción en callback de Tkinter (overlay)", exc_info=a)

        self._stop = threading.Event()
        self._sock: socket.socket | None = None
        self._send_lock = threading.Lock()

        self._params = _StreamParams(True, cfg.grid_fps, cfg.grid_scale, cfg.grid_quality)
        self._params_lock = threading.Lock()
        self._wake = threading.Event()  # despierta al transmisor al cambiar params

        self._controlled = False
        self._screen_size = (1920, 1080)
        self._injector: InputInjector | None = None

        # Contexto TLS (si está activado). Se crea una vez; se reutiliza al
        # reconectar. Si el certificado falta, falla pronto y con claridad.
        self._ssl_ctx = tlsutil.make_client_context(cfg.ca_cert) if cfg.use_tls else None

        # Gestión de aula (procesos / apps / webs).
        self._appblocker = actions.AppBlocker()
        self._webblocker = actions.WebBlocker()

    # --- Envío con bloqueo para no entrelazar fotogramas y respuestas ------
    def _send(self, obj, blob: bytes = b"") -> None:
        sock = self._sock
        if sock is None:
            return
        with self._send_lock:
            proto.send_msg(sock, obj, blob)

    # --- Hilo de red: conexión + reconexión --------------------------------
    def run_network(self) -> None:
        while not self._stop.is_set():
            try:
                self._session()
            except Exception as exc:  # noqa: BLE001 - reconexión ante cualquier fallo
                log.warning("Conexión perdida: %s", exc)
            finally:
                self._close_socket()
                self._controlled = False
                # Anti-cuelgue: si caemos conectados, liberamos cualquier
                # bloqueo, mensaje o proyección para no dejar el equipo inutilizable.
                self.overlay.unlock()
                self.overlay.hide_message()
                self.overlay.broadcast_stop()
                # Si perdemos al profesor, no dejamos el equipo con webs/apps
                # bloqueadas de forma permanente.
                self._webblocker.set_blocked([], False)
                self._appblocker.stop()
                self.overlay.set_state(connected=False, controlled=False)
            if self._stop.is_set():
                break
            time.sleep(self.cfg.reconnect_seconds)

    def _session(self) -> None:
        log.info("Conectando a %s:%s ...", self.cfg.admin_host, self.cfg.admin_port)
        sock = socket.create_connection((self.cfg.admin_host, self.cfg.admin_port), timeout=10)
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        if self._ssl_ctx is not None:
            # Verifica el certificado del profesor (fijado) y cifra el canal.
            sock = self._ssl_ctx.wrap_socket(sock)
        sock.settimeout(None)
        self._sock = sock

        # 1) Desafío-respuesta.
        challenge, _ = proto.recv_msg(sock)
        if challenge.get("t") != proto.T_CHALLENGE:
            raise proto.ProtocolError("se esperaba un desafío de autenticación")
        nonce = challenge.get("nonce", "")
        mac = security.sign(self.cfg.token, nonce)

        # Tamaño real de pantalla (instancia efímera de mss en este hilo).
        grabber = ScreenGrabber()
        self._screen_size = grabber.size
        grabber.close()
        self._injector = InputInjector(self._screen_size)

        self._send({
            "t": proto.T_AUTH,
            "mac": mac,
            "host": socket.gethostname(),
            "user": self._safe_user(),
            "w": self._screen_size[0],
            "h": self._screen_size[1],
        })

        result, _ = proto.recv_msg(sock)
        if result.get("t") != proto.T_AUTH_OK:
            raise proto.ProtocolError("autenticación rechazada por el administrador")

        log.info("Autenticado. Transmitiendo pantalla.")
        self.overlay.set_state(connected=True, controlled=False)

        # 2) Hilo transmisor, atado a ESTE socket: si reconectamos, el socket
        #    cambia y el transmisor antiguo termina solo (no escribe en el nuevo).
        self._wake.set()
        streamer = threading.Thread(target=self._stream_loop, args=(sock,), daemon=True)
        streamer.start()

        # 3) Bucle de lectura de órdenes.
        try:
            while not self._stop.is_set():
                msg, blob = proto.recv_msg(sock)
                self._handle(msg, blob)
        finally:
            self._wake.set()  # libera al transmisor para que termine

    @staticmethod
    def _safe_user() -> str:
        try:
            return getpass.getuser()
        except Exception:
            return "desconocido"

    # --- Transmisión de pantalla -------------------------------------------
    def _stream_loop(self, sock: socket.socket) -> None:
        grabber = ScreenGrabber()
        seq = 0
        try:
            # Solo mientras ESTE socket siga siendo el activo.
            while not self._stop.is_set() and self._sock is sock:
                with self._params_lock:
                    p = _StreamParams(self._params.enabled, self._params.fps,
                                      self._params.scale, self._params.quality)
                if not p.enabled or p.fps <= 0:
                    self._wake.wait(timeout=0.5)
                    self._wake.clear()
                    continue
                start = time.time()
                try:
                    jpeg, w, h = grabber.capture_jpeg(p.scale, p.quality)
                    seq += 1
                    with self._send_lock:
                        proto.send_msg(sock, {"t": proto.T_FRAME, "w": w, "h": h, "seq": seq}, jpeg)
                except OSError:
                    break  # socket caído -> termina el hilo, la red reconectará
                except Exception as exc:  # noqa: BLE001
                    log.warning("Error al capturar/enviar: %s", exc)
                    time.sleep(0.2)
                    continue
                # Mantener el ritmo de fotogramas.
                elapsed = time.time() - start
                time.sleep(max(0.0, (1.0 / p.fps) - elapsed))
        finally:
            grabber.close()

    # --- Manejo de órdenes del administrador -------------------------------
    def _handle(self, msg, blob: bytes) -> None:
        t = msg.get("t")
        if t == proto.T_STREAM:
            with self._params_lock:
                self._params.enabled = bool(msg.get("enabled", True))
                self._params.fps = float(msg.get("fps", self._params.fps))
                self._params.scale = float(msg.get("scale", self._params.scale))
                self._params.quality = int(msg.get("quality", self._params.quality))
            self._wake.set()
        elif t == proto.T_INPUT:
            if self._controlled and self.cfg.allow_remote_control and self._injector:
                self._injector.apply(msg)
        elif t == proto.T_CONTROL:
            self._controlled = bool(msg.get("on", False)) and self.cfg.allow_remote_control
            self.overlay.set_state(connected=True, controlled=self._controlled)
        elif t == proto.T_MESSAGE:
            if msg.get("show", True):
                self.overlay.show_message(msg.get("text", ""))
            else:
                self.overlay.hide_message()
        elif t == proto.T_LOCK:
            if self.cfg.allow_lock:
                if msg.get("on", False):
                    self.overlay.lock(msg.get("text", ""))
                else:
                    self.overlay.unlock()
        elif t == proto.T_POWER:
            if self.cfg.allow_power:
                power_execute(msg.get("action", ""), int(msg.get("delay", 5)))
        elif t == proto.T_BCAST:
            if msg.get("on", False):
                self.overlay.broadcast_start()
            else:
                self.overlay.broadcast_stop()
        elif t == proto.T_BCAST_FRAME:
            self.overlay.broadcast_frame(blob)
        elif t == proto.T_PROCLIST:
            if self.cfg.allow_manage:
                self._send({"t": proto.T_PROCLIST_RESP, "procs": actions.list_processes()})
        elif t == proto.T_KILL:
            if self.cfg.allow_manage:
                actions.kill_process(pid=msg.get("pid"), name=msg.get("name"))
        elif t == proto.T_APPBLOCK:
            if self.cfg.allow_manage:
                self._appblocker.set_blocked(msg.get("names", []), bool(msg.get("on", False)))
        elif t == proto.T_WEBBLOCK:
            if self.cfg.allow_manage:
                self._webblocker.set_blocked(msg.get("domains", []), bool(msg.get("on", False)))
        elif t == proto.T_FILE:
            if self.cfg.allow_files:
                path = actions.save_file(msg.get("name", ""), blob, self.cfg.download_dir)
                if path:
                    log.info("Archivo recibido: %s", path)
        elif t == proto.T_PING:
            self._send({"t": proto.T_PONG})

    # --- Ciclo de vida ------------------------------------------------------
    def _close_socket(self) -> None:
        if self._sock is not None:
            try:
                self._sock.close()
            except Exception:
                pass
            self._sock = None

    def start(self) -> None:
        net = threading.Thread(target=self.run_network, daemon=True)
        net.start()
        try:
            self.overlay.run()  # bloquea en el hilo principal (GUI)
        except KeyboardInterrupt:
            pass
        finally:
            self._stop.set()
            self._wake.set()
            self._close_socket()

    def stop(self) -> None:
        self._stop.set()
        self._wake.set()
        self.overlay.quit()


def main(config_path: str | None = None) -> None:
    setup_logging("ClassroomClient")
    install_excepthook(log, gui_title="ClassroomControl - Agente")
    log.info("Iniciando agente cliente (supervisión transparente de aula).")
    cfg = load_client_config(config_path)
    Agent(cfg).start()


if __name__ == "__main__":
    import sys

    main(sys.argv[1] if len(sys.argv) > 1 else None)
