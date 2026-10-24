"""Consola gráfica del administrador (Tkinter + ttk, tema oscuro moderno).

Muestra una rejilla con la pantalla en vivo de cada equipo del aula. Al hacer
clic en uno se abre una vista ampliada en la que el profesor puede tomar el
control remoto (ratón/teclado), inmovilizar el equipo, enviar un mensaje de
atención o ejecutar apagado/reinicio/cierre de sesión. La barra superior ofrece
las mismas acciones para TODOS los equipos a la vez.

Toda la red vive en ``AdminServer`` (hilos aparte); esta GUI solo consulta el
registro y pinta. El refresco periódico (``after``) decodifica únicamente los
fotogramas nuevos, comparando un contador por cliente.
"""

from __future__ import annotations

import io
import logging
import threading
import time
import tkinter as tk
from tkinter import messagebox, simpledialog, ttk
from typing import Dict, Optional

from PIL import Image, ImageTk

from ..config import AdminConfig, load_admin_config
from ..client.screen import ScreenGrabber
from ..logutil import install_excepthook, setup_logging
from .server import AdminServer, ClientConn
from .theme import apply_theme

log = logging.getLogger("classroomcontrol")

# Tamaño de cada miniatura en la rejilla (16:9).
THUMB_W, THUMB_H = 260, 146
# Tamaño máximo de la vista ampliada.
FOCUS_MAX_W, FOCUS_MAX_H = 1024, 576
REFRESH_MS = 150
# Si no llega un fotograma nuevo en este tiempo, el equipo se marca "sin señal".
STALE_SECONDS = 6.0
# Calidad de la proyección de la pantalla del profesor hacia los alumnos.
BCAST_FPS = 8.0
BCAST_SCALE = 0.7
BCAST_QUALITY = 55


def _jpeg_to_photo(data: bytes, max_w: int, max_h: int) -> Optional[ImageTk.PhotoImage]:
    if not data:
        return None
    try:
        img = Image.open(io.BytesIO(data))
        img.thumbnail((max_w, max_h), Image.BILINEAR)
        return ImageTk.PhotoImage(img)
    except Exception:
        return None


class DetailWindow:
    """Vista ampliada de un equipo, con control remoto, bloqueo y acciones."""

    def __init__(self, console: "Console", cid: int) -> None:
        self.console = console
        self.server = console.server
        self.p = console.p
        self.cid = cid
        self._last_counter = -1
        self._photo: Optional[ImageTk.PhotoImage] = None
        self._disp_w = 1
        self._disp_h = 1
        self.controlling = False

        conn = self.server.get(cid)
        title = conn.label() if conn else f"Cliente #{cid}"

        self.top = tk.Toplevel(console.root)
        self.top.title(f"Equipo: {title}")
        self.top.configure(bg=self.p["bg"])
        self.top.protocol("WM_DELETE_WINDOW", self.close)

        bar = tk.Frame(self.top, bg=self.p["panel"])
        bar.pack(side="top", fill="x")
        inner = tk.Frame(bar, bg=self.p["panel"])
        inner.pack(side="left", padx=8, pady=8)

        self.btn_control = ttk.Button(inner, text="🖱  Tomar control", style="Accent.TButton",
                                      command=self.toggle_control)
        self.btn_control.pack(side="left", padx=(0, 6))
        self.btn_lock = ttk.Button(inner, text="🔒  Inmovilizar", style="Warn.TButton",
                                   command=self.toggle_lock)
        self.btn_lock.pack(side="left", padx=6)
        ttk.Button(inner, text="💬  Mensaje", command=self.send_message).pack(side="left", padx=6)
        ttk.Button(inner, text="⏻  Apagar", style="Danger.TButton",
                   command=lambda: self.power("shutdown")).pack(side="left", padx=6)
        ttk.Button(inner, text="↻  Reiniciar",
                   command=lambda: self.power("restart")).pack(side="left", padx=6)
        ttk.Button(inner, text="⎋  Cerrar sesión",
                   command=lambda: self.power("logoff")).pack(side="left", padx=6)

        self.status = tk.Label(bar, text="", bg=self.p["panel"], fg=self.p["muted"],
                               font=("Segoe UI", 10, "bold"))
        self.status.pack(side="right", padx=12)

        self.image_label = tk.Label(self.top, bg="#000", cursor="tcross")
        self.image_label.pack(fill="both", expand=True)

        # Enlaces de entrada (solo surten efecto cuando el control está activo).
        self.image_label.bind("<Motion>", self._on_motion)
        self.image_label.bind("<ButtonPress-1>", lambda e: self._on_button(e, "left", True))
        self.image_label.bind("<ButtonRelease-1>", lambda e: self._on_button(e, "left", False))
        self.image_label.bind("<ButtonPress-3>", lambda e: self._on_button(e, "right", True))
        self.image_label.bind("<ButtonRelease-3>", lambda e: self._on_button(e, "right", False))
        self.image_label.bind("<MouseWheel>", self._on_wheel)
        self.top.bind("<KeyPress>", lambda e: self._on_key(e, True))
        self.top.bind("<KeyRelease>", lambda e: self._on_key(e, False))

        # Al enfocar, pedimos alta calidad/FPS a ese cliente.
        self.server.set_focus_quality(cid)
        self._sync_buttons()

    # --- Control remoto -----------------------------------------------------
    def toggle_control(self) -> None:
        self.controlling = not self.controlling
        self.server.set_control(self.cid, self.controlling)
        if self.controlling:
            self.top.focus_set()
        self._sync_buttons()

    def _norm(self, event) -> tuple:
        x = min(1.0, max(0.0, event.x / max(1, self._disp_w)))
        y = min(1.0, max(0.0, event.y / max(1, self._disp_h)))
        return x, y

    def _on_motion(self, event):
        if self.controlling:
            x, y = self._norm(event)
            self.server.send_input(self.cid, {"ev": "move", "x": x, "y": y})

    def _on_button(self, event, button, down):
        if self.controlling:
            x, y = self._norm(event)
            self.server.send_input(self.cid, {"ev": "down" if down else "up",
                                              "x": x, "y": y, "button": button})
            return "break"

    def _on_wheel(self, event):
        if self.controlling:
            self.server.send_input(self.cid, {"ev": "scroll", "amount": int(event.delta / 120)})
            return "break"

    def _on_key(self, event, down):
        if self.controlling and event.keysym:
            self.server.send_input(self.cid, {"ev": "key", "key": event.keysym, "down": down})
            return "break"

    # --- Bloqueo total ------------------------------------------------------
    def toggle_lock(self) -> None:
        conn = self.server.get(self.cid)
        if conn is None:
            return
        new_state = not conn.locked
        text = ""
        if new_state:
            text = simpledialog.askstring(
                "Inmovilizar equipo",
                "Mensaje a mostrar (opcional):", parent=self.top) or ""
        self.server.set_lock(self.cid, new_state, text)
        self._sync_buttons()

    # --- Acciones -----------------------------------------------------------
    def send_message(self) -> None:
        text = simpledialog.askstring("Mensaje de atención",
                                      "Texto a mostrar en el equipo:", parent=self.top)
        if text:
            self.server.send_message(self.cid, text, show=True)

    def power(self, action: str) -> None:
        names = {"shutdown": "apagar", "restart": "reiniciar", "logoff": "cerrar la sesión de"}
        conn = self.server.get(self.cid)
        who = conn.label() if conn else f"#{self.cid}"
        if messagebox.askyesno("Confirmar", f"¿Seguro que deseas {names.get(action, action)} {who}?",
                               parent=self.top):
            self.server.send_power(self.cid, action)

    # --- Refresco -----------------------------------------------------------
    def refresh(self) -> None:
        conn = self.server.get(self.cid)
        if conn is None or not conn.alive:
            self.close()
            return
        if conn.frame_counter != self._last_counter:
            photo = _jpeg_to_photo(conn.frame_jpeg, FOCUS_MAX_W, FOCUS_MAX_H)
            if photo is not None:
                self._photo = photo
                self._disp_w = photo.width()
                self._disp_h = photo.height()
                self.image_label.configure(image=self._photo)
                self._last_counter = conn.frame_counter

    def _sync_buttons(self) -> None:
        conn = self.server.get(self.cid)
        locked = bool(conn and conn.locked)
        self.btn_control.configure(text="✋  Soltar control" if self.controlling else "🖱  Tomar control")
        self.btn_lock.configure(text="🔓  Liberar" if locked else "🔒  Inmovilizar")
        parts = []
        if self.controlling:
            parts.append("CONTROL ACTIVO")
        if locked:
            parts.append("BLOQUEADO")
        self.status.configure(
            text="  ·  ".join(parts) if parts else "solo visualización",
            fg=self.p["danger"] if (self.controlling or locked) else self.p["muted"],
        )

    def close(self) -> None:
        if self.controlling:
            self.server.set_control(self.cid, False)
        self.server.set_grid_quality(self.cid)
        self.console._detail_closed(self.cid)
        try:
            self.top.destroy()
        except Exception:
            pass


class Console:
    def __init__(self, cfg: AdminConfig) -> None:
        self.cfg = cfg
        self.server = AdminServer(cfg)

        self.root = tk.Tk()
        self.root.title("ClassroomControl — Consola del profesor")
        self.root.geometry("1320x840")
        self.p = apply_theme(self.root)

        # Imagen de marcador (gris) con el tamaño exacto de miniatura, para que
        # las celdas ocupen píxeles desde el inicio y no "unidades de texto".
        self._placeholder = ImageTk.PhotoImage(Image.new("RGB", (THUMB_W, THUMB_H), "#0a0c10"))

        self._build_toolbar()
        self._build_grid()

        # Celdas de la rejilla, indexadas por id de cliente.
        self._cells: Dict[int, dict] = {}
        self._details: Dict[int, DetailWindow] = {}

        # Estado de la proyección de la pantalla del profesor.
        self._bcasting = False
        self._bcast_stop = threading.Event()

        self.server.start()
        self.root.after(REFRESH_MS, self._refresh)

    # --- Construcción de la interfaz ---------------------------------------
    def _build_toolbar(self) -> None:
        bar = ttk.Frame(self.root, style="Toolbar.TFrame")
        bar.pack(side="top", fill="x")
        pad = ttk.Frame(bar, style="Toolbar.TFrame")
        pad.pack(fill="x", padx=12, pady=10)

        ttk.Label(pad, text="🖥  Aula de medios", style="Title.TLabel").pack(side="left")

        # Acciones masivas, agrupadas por color de intención.
        self.btn_bcast = ttk.Button(pad, text="📡  Proyectar pantalla", style="Accent.TButton",
                                    command=self._toggle_broadcast)
        self.btn_bcast.pack(side="left", padx=(20, 6))
        ttk.Button(pad, text="💬  Mensaje a todos", style="Accent.TButton",
                   command=self._broadcast_message).pack(side="left", padx=6)
        ttk.Button(pad, text="🔒  Bloquear todos", style="Warn.TButton",
                   command=lambda: self._broadcast_lock(True)).pack(side="left", padx=6)
        ttk.Button(pad, text="🔓  Liberar todos",
                   command=lambda: self._broadcast_lock(False)).pack(side="left", padx=6)
        ttk.Button(pad, text="🧹  Quitar mensajes",
                   command=self._clear_messages).pack(side="left", padx=6)
        ttk.Button(pad, text="⏻  Apagar todos", style="Danger.TButton",
                   command=lambda: self._broadcast_power("shutdown")).pack(side="left", padx=6)
        ttk.Button(pad, text="↻  Reiniciar todos",
                   command=lambda: self._broadcast_power("restart")).pack(side="left", padx=6)

        self.status = ttk.Label(pad, text="0 equipos conectados", style="Status.TLabel")
        self.status.pack(side="right")

    def _build_grid(self) -> None:
        container = ttk.Frame(self.root, style="Bg.TFrame")
        container.pack(side="top", fill="both", expand=True)

        self._canvas = tk.Canvas(container, bg=self.p["bg"], highlightthickness=0)
        scroll = ttk.Scrollbar(container, orient="vertical", command=self._canvas.yview)
        self._canvas.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        self._canvas.pack(side="left", fill="both", expand=True)

        self._grid = tk.Frame(self._canvas, bg=self.p["bg"])
        self._canvas.create_window((0, 0), window=self._grid, anchor="nw")
        self._grid.bind("<Configure>",
                        lambda e: self._canvas.configure(scrollregion=self._canvas.bbox("all")))
        self._canvas.bind_all("<MouseWheel>", self._scroll_grid)

    def _scroll_grid(self, event) -> None:
        self._canvas.yview_scroll(int(-event.delta / 120), "units")

    # --- Rejilla de clientes -----------------------------------------------
    def _make_cell(self, cid: int) -> dict:
        cell = tk.Frame(self._grid, bg=self.p["border"], bd=0,
                        highlightthickness=2, highlightbackground=self.p["border"])
        img = tk.Label(cell, bg="#000", image=self._placeholder, cursor="hand2", bd=0)
        img.pack()
        caption = tk.Frame(cell, bg=self.p["panel"])
        caption.pack(fill="x")
        dot = tk.Label(caption, text="●", bg=self.p["panel"], fg=self.p["success"],
                       font=("Segoe UI", 10))
        dot.pack(side="left", padx=(8, 4), pady=4)
        name = tk.Label(caption, text="", bg=self.p["panel"], fg=self.p["text"],
                        font=("Segoe UI", 9), anchor="w")
        name.pack(side="left", fill="x", expand=True)
        for w in (img, caption, dot, name, cell):
            w.bind("<Button-1>", lambda e, c=cid: self.open_detail(c))
        return {"frame": cell, "img": img, "dot": dot, "name": name, "counter": -1, "photo": None}

    def _reconcile_grid(self, clients) -> None:
        current_ids = {c.id for c in clients}
        for cid in list(self._cells):
            if cid not in current_ids:
                self._cells[cid]["frame"].destroy()
                del self._cells[cid]

        cols = max(1, self.cfg.columns)
        for index, conn in enumerate(clients):
            if conn.id not in self._cells:
                self._cells[conn.id] = self._make_cell(conn.id)
            cell = self._cells[conn.id]
            r, c = divmod(index, cols)
            cell["frame"].grid(row=r, column=c, padx=6, pady=6)

    def _update_thumb(self, conn: ClientConn) -> None:
        cell = self._cells.get(conn.id)
        if cell is None:
            return
        if conn.frame_counter != cell["counter"]:
            photo = _jpeg_to_photo(conn.frame_jpeg, THUMB_W, THUMB_H)
            if photo is not None:
                cell["photo"] = photo  # mantener referencia (evita GC)
                cell["img"].configure(image=photo)
                cell["counter"] = conn.frame_counter

        # ¿Fotograma reciente? Si no, el equipo está "sin señal".
        stale = conn.frame_counter > 0 and (time.time() - conn.last_frame_at) > STALE_SECONDS
        if stale:
            color = self.p["muted"]
            cell["name"].configure(text=conn.label() + "   ⚠ SIN SEÑAL", fg=self.p["warn"])
        else:
            cell["name"].configure(text=conn.label(), fg=self.p["text"])
            if conn.locked:
                color = self.p["warn"]
            elif conn.controlled:
                color = self.p["danger"]
            elif conn.focused:
                color = self.p["accent"]
            else:
                color = self.p["success"]
        cell["dot"].configure(fg=color)
        cell["frame"].configure(highlightbackground=color, highlightcolor=color)

    def _refresh(self) -> None:
        clients = self.server.clients()
        self._reconcile_grid(clients)
        for conn in clients:
            self._update_thumb(conn)
        self.status.configure(text=f"🟢  {len(clients)} equipos conectados")

        for detail in list(self._details.values()):
            detail.refresh()

        self.root.after(REFRESH_MS, self._refresh)

    # --- Ventanas de detalle ------------------------------------------------
    def open_detail(self, cid: int) -> None:
        if cid in self._details:
            self._details[cid].top.lift()
            return
        if self.server.get(cid) is None:
            return
        self._details[cid] = DetailWindow(self, cid)

    def _detail_closed(self, cid: int) -> None:
        self._details.pop(cid, None)

    # --- Acciones masivas ---------------------------------------------------
    def _broadcast_message(self) -> None:
        text = simpledialog.askstring("Mensaje a todos",
                                      "Texto a mostrar en TODOS los equipos:", parent=self.root)
        if text:
            self.server.broadcast_message(text, show=True)

    def _clear_messages(self) -> None:
        self.server.broadcast_message("", show=False)

    def _broadcast_lock(self, on: bool) -> None:
        n = len(self.server.clients())
        if on:
            text = simpledialog.askstring("Bloquear todos",
                                          "Mensaje a mostrar (opcional):", parent=self.root)
            if text is None:  # cancelado
                return
            if messagebox.askyesno("Confirmar", f"¿Inmovilizar los {n} equipos conectados?",
                                   parent=self.root):
                self.server.broadcast_lock(True, text)
        else:
            self.server.broadcast_lock(False, "")

    def _broadcast_power(self, action: str) -> None:
        names = {"shutdown": "APAGAR", "restart": "REINICIAR"}
        n = len(self.server.clients())
        if messagebox.askyesno("Confirmar acción masiva",
                               f"¿Seguro que deseas {names.get(action, action)} los {n} equipos conectados?",
                               icon="warning", parent=self.root):
            self.server.broadcast_power(action)

    # --- Proyección de la pantalla del profesor ----------------------------
    def _toggle_broadcast(self) -> None:
        if not self._bcasting:
            self._bcasting = True
            self._bcast_stop.clear()
            self.server.broadcast_show(True)
            threading.Thread(target=self._broadcast_loop, daemon=True).start()
            self.btn_bcast.configure(text="⏹  Detener proyección", style="Danger.TButton")
            log.info("Proyección de pantalla del profesor: iniciada.")
        else:
            self._stop_broadcast()

    def _stop_broadcast(self) -> None:
        if self._bcasting:
            self._bcasting = False
            self._bcast_stop.set()
            try:
                self.server.broadcast_show(False)
            except Exception:
                pass
            try:
                self.btn_bcast.configure(text="📡  Proyectar pantalla", style="Accent.TButton")
            except Exception:
                pass
            log.info("Proyección de pantalla del profesor: detenida.")

    def _broadcast_loop(self) -> None:
        # mss debe crearse y usarse en este mismo hilo.
        grabber = ScreenGrabber()
        try:
            while not self._bcast_stop.is_set():
                start = time.time()
                try:
                    jpeg, w, h = grabber.capture_jpeg(BCAST_SCALE, BCAST_QUALITY)
                    self.server.broadcast_frame(jpeg, w, h)
                except Exception as exc:  # noqa: BLE001
                    log.warning("Error en la proyección: %s", exc)
                    time.sleep(0.2)
                    continue
                time.sleep(max(0.0, (1.0 / BCAST_FPS) - (time.time() - start)))
        finally:
            grabber.close()

    # --- Ciclo de vida ------------------------------------------------------
    def run(self) -> None:
        try:
            self.root.mainloop()
        finally:
            self._stop_broadcast()
            self.server.stop()


def main(config_path: Optional[str] = None) -> None:
    setup_logging("ClassroomAdmin")
    install_excepthook(log, gui_title="ClassroomControl - Consola")
    log.info("Iniciando consola del profesor.")
    cfg = load_admin_config(config_path)
    console = Console(cfg)
    # Las excepciones dentro de callbacks de Tkinter no llegan a sys.excepthook;
    # las redirigimos al log para no perderlas.
    console.root.report_callback_exception = lambda *a: log.error(
        "Excepción en callback de Tkinter", exc_info=a)
    console.run()


if __name__ == "__main__":
    import sys

    main(sys.argv[1] if len(sys.argv) > 1 else None)
