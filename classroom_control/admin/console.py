"""Consola gráfica del administrador (Tkinter).

Muestra una rejilla con la pantalla en vivo de cada equipo del aula. Al hacer
clic en uno se abre una vista ampliada en la que el profesor puede tomar el
control remoto (ratón/teclado), enviar un mensaje de atención o ejecutar
apagado/reinicio/cierre de sesión. La barra superior ofrece las mismas acciones
para TODOS los equipos a la vez.

Toda la red vive en ``AdminServer`` (hilos aparte); esta GUI solo consulta el
registro y pinta. El refresco periódico (``after``) decodifica únicamente los
fotogramas nuevos, comparando un contador por cliente.
"""

from __future__ import annotations

import io
import tkinter as tk
from tkinter import messagebox, simpledialog
from typing import Dict, Optional

from PIL import Image, ImageTk

from ..config import AdminConfig, load_admin_config
from .server import AdminServer, ClientConn

# Tamaño de cada miniatura en la rejilla (16:9).
THUMB_W, THUMB_H = 260, 146
# Tamaño máximo de la vista ampliada.
FOCUS_MAX_W, FOCUS_MAX_H = 1024, 576
REFRESH_MS = 150


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
    """Vista ampliada de un equipo, con control remoto y acciones."""

    def __init__(self, console: "Console", cid: int) -> None:
        self.console = console
        self.server = console.server
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
        self.top.configure(bg="#111")
        self.top.protocol("WM_DELETE_WINDOW", self.close)

        bar = tk.Frame(self.top, bg="#222")
        bar.pack(side="top", fill="x")
        self.btn_control = tk.Button(bar, text="🖱 Tomar control", width=16,
                                     command=self.toggle_control)
        self.btn_control.pack(side="left", padx=4, pady=4)
        tk.Button(bar, text="💬 Mensaje", command=self.send_message).pack(side="left", padx=4)
        tk.Button(bar, text="⏻ Apagar", command=lambda: self.power("shutdown")).pack(side="left", padx=4)
        tk.Button(bar, text="↻ Reiniciar", command=lambda: self.power("restart")).pack(side="left", padx=4)
        tk.Button(bar, text="⎋ Cerrar sesión", command=lambda: self.power("logoff")).pack(side="left", padx=4)
        self.status = tk.Label(bar, text="", bg="#222", fg="#bbb")
        self.status.pack(side="right", padx=8)

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
        self._update_status()

    # --- Control remoto -----------------------------------------------------
    def toggle_control(self) -> None:
        self.controlling = not self.controlling
        self.server.set_control(self.cid, self.controlling)
        if self.controlling:
            self.btn_control.configure(text="✋ Soltar control", relief="sunken")
            self.top.focus_set()
        else:
            self.btn_control.configure(text="🖱 Tomar control", relief="raised")
        self._update_status()

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

    def _update_status(self) -> None:
        state = "CONTROL ACTIVO" if self.controlling else "solo visualización"
        self.status.configure(text=state, fg="#ff5252" if self.controlling else "#bbb")

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
        self.root.geometry("1280x800")
        self.root.configure(bg="#1e1e1e")

        # Imagen de marcador (gris) con el tamaño exacto de miniatura, para que
        # las celdas ocupen píxeles desde el inicio y no "unidades de texto".
        self._placeholder = ImageTk.PhotoImage(Image.new("RGB", (THUMB_W, THUMB_H), "#101010"))

        self._build_toolbar()
        self._build_grid()

        # Celdas de la rejilla, indexadas por id de cliente.
        self._cells: Dict[int, dict] = {}
        self._details: Dict[int, DetailWindow] = {}

        self.server.start()
        self.root.after(REFRESH_MS, self._refresh)

    # --- Construcción de la interfaz ---------------------------------------
    def _build_toolbar(self) -> None:
        bar = tk.Frame(self.root, bg="#2d2d2d")
        bar.pack(side="top", fill="x")

        tk.Label(bar, text="  Aula de medios  ", bg="#2d2d2d", fg="white",
                 font=("Segoe UI", 12, "bold")).pack(side="left", pady=6)

        tk.Button(bar, text="💬 Mensaje a todos", command=self._broadcast_message).pack(side="left", padx=4)
        tk.Button(bar, text="🧹 Quitar mensajes", command=self._clear_messages).pack(side="left", padx=4)
        tk.Button(bar, text="⏻ Apagar todos", command=lambda: self._broadcast_power("shutdown")).pack(side="left", padx=4)
        tk.Button(bar, text="↻ Reiniciar todos", command=lambda: self._broadcast_power("restart")).pack(side="left", padx=4)

        self.status = tk.Label(bar, text="0 equipos conectados", bg="#2d2d2d", fg="#9ccc65",
                               font=("Segoe UI", 10))
        self.status.pack(side="right", padx=12)

    def _build_grid(self) -> None:
        container = tk.Frame(self.root, bg="#1e1e1e")
        container.pack(side="top", fill="both", expand=True)

        self._canvas = tk.Canvas(container, bg="#1e1e1e", highlightthickness=0)
        scroll = tk.Scrollbar(container, orient="vertical", command=self._canvas.yview)
        self._canvas.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        self._canvas.pack(side="left", fill="both", expand=True)

        self._grid = tk.Frame(self._canvas, bg="#1e1e1e")
        self._grid_window = self._canvas.create_window((0, 0), window=self._grid, anchor="nw")
        self._grid.bind("<Configure>",
                        lambda e: self._canvas.configure(scrollregion=self._canvas.bbox("all")))
        # Rueda del ratón para desplazar la rejilla.
        self._canvas.bind_all("<MouseWheel>", self._scroll_grid)

    def _scroll_grid(self, event) -> None:
        # Solo desplaza si el puntero no está sobre una ventana de detalle.
        self._canvas.yview_scroll(int(-event.delta / 120), "units")

    # --- Rejilla de clientes -----------------------------------------------
    def _make_cell(self, cid: int) -> dict:
        cell = tk.Frame(self._grid, bg="#333", bd=2, relief="ridge")
        img = tk.Label(cell, bg="#000", image=self._placeholder, cursor="hand2")
        img.pack()
        caption = tk.Label(cell, text="", bg="#333", fg="white", font=("Segoe UI", 9))
        caption.pack(fill="x")
        for w in (img, caption, cell):
            w.bind("<Button-1>", lambda e, c=cid: self.open_detail(c))
        return {"frame": cell, "img": img, "caption": caption, "counter": -1, "photo": None}

    def _reconcile_grid(self, clients) -> None:
        current_ids = {c.id for c in clients}

        # Eliminar celdas de clientes que ya no están.
        for cid in list(self._cells):
            if cid not in current_ids:
                self._cells[cid]["frame"].destroy()
                del self._cells[cid]

        # Crear/posicionar celdas.
        cols = max(1, self.cfg.columns)
        for index, conn in enumerate(clients):
            if conn.id not in self._cells:
                self._cells[conn.id] = self._make_cell(conn.id)
            cell = self._cells[conn.id]
            r, c = divmod(index, cols)
            cell["frame"].grid(row=r, column=c, padx=4, pady=4)
            cell["caption"].configure(text=conn.label())

    def _update_thumb(self, conn: ClientConn) -> None:
        cell = self._cells.get(conn.id)
        if cell is None:
            return
        if conn.frame_counter != cell["counter"]:
            photo = _jpeg_to_photo(conn.frame_jpeg, THUMB_W, THUMB_H)
            if photo is not None:
                cell["photo"] = photo  # mantener referencia (evita GC)
                cell["img"].configure(image=photo)  # el label se ajusta a la imagen
                cell["counter"] = conn.frame_counter
        border = "#ff5252" if conn.controlled else ("#64b5f6" if conn.focused else "#333")
        cell["frame"].configure(bg=border)

    def _refresh(self) -> None:
        clients = self.server.clients()
        self._reconcile_grid(clients)
        for conn in clients:
            self._update_thumb(conn)
        self.status.configure(text=f"{len(clients)} equipos conectados")

        for cid, detail in list(self._details.items()):
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

    def _broadcast_power(self, action: str) -> None:
        names = {"shutdown": "APAGAR", "restart": "REINICIAR"}
        n = len(self.server.clients())
        if messagebox.askyesno("Confirmar acción masiva",
                               f"¿Seguro que deseas {names.get(action, action)} los {n} equipos conectados?",
                               icon="warning", parent=self.root):
            self.server.broadcast_power(action)

    # --- Ciclo de vida ------------------------------------------------------
    def run(self) -> None:
        try:
            self.root.mainloop()
        finally:
            self.server.stop()


def main(config_path: Optional[str] = None) -> None:
    cfg = load_admin_config(config_path)
    Console(cfg).run()


if __name__ == "__main__":
    import sys

    main(sys.argv[1] if len(sys.argv) > 1 else None)
