"""Interfaz visible del cliente: indicador de supervisión, mensaje de atención
y BLOQUEO TOTAL de teclado/ratón.

Tkinter exige vivir en el hilo principal, así que ``OverlayManager`` posee la
raíz Tk y corre su bucle en el hilo principal del agente. Los hilos de red le
envían órdenes mediante una cola; un sondeo periódico (``after``) las aplica en
el hilo de la GUI. Esto mantiene la red y la interfaz desacopladas y seguras.

El indicador es deliberadamente VISIBLE: comunica al alumno que el equipo está
siendo supervisado o controlado. Es parte del diseño ético de la herramienta.

Bloqueo total (Windows): además de una ventana opaca a pantalla completa, se
usa la API ``BlockInput`` para congelar físicamente teclado y ratón. Debe
invocarse desde el MISMO hilo que lo activó, por eso todo pasa por la cola de
la GUI. Si la conexión se pierde, el agente libera el bloqueo automáticamente
(protección anti-cuelgue). Ctrl+Alt+Supr no puede bloquearse (es del sistema).
"""

from __future__ import annotations

import ctypes
import io
import queue
import sys
import tkinter as tk
from typing import Optional

from PIL import Image, ImageTk

# Paleta compartida con la consola para una estética coherente y moderna.
BG_DARK = "#0b0d12"
ACCENT = "#3b82f6"
DANGER = "#ef4444"
SUCCESS = "#22c55e"
TEXT = "#e5e7eb"


def _block_input(flag: bool) -> None:
    """Congela (True) o libera (False) teclado y ratón en Windows."""
    if sys.platform.startswith("win"):
        try:
            ctypes.windll.user32.BlockInput(bool(flag))
        except Exception:
            pass


class OverlayManager:
    def __init__(self, show_indicator: bool = True) -> None:
        self._show_indicator = show_indicator
        self._cmds: "queue.Queue[tuple]" = queue.Queue()

        self.root = tk.Tk()
        self.root.withdraw()  # la ventana raíz permanece oculta

        self._indicator: Optional[tk.Toplevel] = None
        self._indicator_label: Optional[tk.Label] = None
        self._message: Optional[tk.Toplevel] = None
        self._lock: Optional[tk.Toplevel] = None
        self._lock_active = False
        self._bcast: Optional[tk.Toplevel] = None
        self._bcast_label: Optional[tk.Label] = None
        self._bcast_photo = None

        self._connected = False
        self._controlled = False

    # --- API segura entre hilos (llamada desde los hilos de red) -----------
    def set_state(self, connected: bool, controlled: bool) -> None:
        self._cmds.put(("state", connected, controlled))

    def show_message(self, text: str) -> None:
        self._cmds.put(("msg_show", text))

    def hide_message(self) -> None:
        self._cmds.put(("msg_hide",))

    def lock(self, text: str = "") -> None:
        self._cmds.put(("lock_on", text))

    def unlock(self) -> None:
        self._cmds.put(("lock_off",))

    def broadcast_start(self) -> None:
        self._cmds.put(("bcast_on",))

    def broadcast_frame(self, jpeg: bytes) -> None:
        self._cmds.put(("bframe", jpeg))

    def broadcast_stop(self) -> None:
        self._cmds.put(("bcast_off",))

    def quit(self) -> None:
        self._cmds.put(("quit",))

    # --- Bucle de GUI (hilo principal) -------------------------------------
    def run(self) -> None:
        self._pump()
        self.root.mainloop()

    def _pump(self) -> None:
        # Los temporizadores 'after' siguen disparándose aunque BlockInput esté
        # activo (no son eventos de entrada), así que la orden de liberar llega.
        try:
            while True:
                cmd = self._cmds.get_nowait()
                self._handle(cmd)
        except queue.Empty:
            pass
        self.root.after(50, self._pump)

    def _handle(self, cmd: tuple) -> None:
        name = cmd[0]
        if name == "state":
            self._connected, self._controlled = cmd[1], cmd[2]
            self._render_indicator()
        elif name == "msg_show":
            self._render_message(cmd[1])
        elif name == "msg_hide":
            self._destroy_message()
        elif name == "lock_on":
            self._render_lock(cmd[1])
        elif name == "lock_off":
            self._destroy_lock()
        elif name == "bcast_on":
            self._render_bcast()
        elif name == "bframe":
            self._update_bcast(cmd[1])
        elif name == "bcast_off":
            self._destroy_bcast()
        elif name == "quit":
            self._destroy_bcast()
            self._destroy_lock()
            self._destroy_message()
            if self._indicator is not None:
                self._indicator.destroy()
            self.root.quit()

    # --- Indicador de supervisión ------------------------------------------
    def _render_indicator(self) -> None:
        if not self._show_indicator or not self._connected:
            if self._indicator is not None:
                self._indicator.destroy()
                self._indicator = None
            return

        if self._controlled:
            text = "   Control remoto activo — el profesor maneja este equipo   "
            bg = DANGER
        else:
            text = "   Equipo supervisado por el profesor   "
            bg = SUCCESS

        if self._indicator is None:
            self._indicator = tk.Toplevel(self.root)
            self._indicator.overrideredirect(True)      # sin barra de título
            self._indicator.attributes("-topmost", True)
            try:
                self._indicator.attributes("-alpha", 0.92)
            except tk.TclError:
                pass
            self._indicator_label = tk.Label(
                self._indicator, font=("Segoe UI Semibold", 10), fg="white", padx=14, pady=5
            )
            self._indicator_label.pack()

        assert self._indicator_label is not None
        self._indicator_label.configure(text=text, bg=bg)
        self._indicator.configure(bg=bg)
        self._indicator.update_idletasks()
        sw = self._indicator.winfo_screenwidth()
        w = self._indicator.winfo_width()
        self._indicator.geometry(f"+{max(0, (sw - w) // 2)}+0")
        self._indicator.lift()

    # --- Mensaje de atención a pantalla completa ---------------------------
    def _render_message(self, text: str) -> None:
        self._destroy_message()
        self._message = tk.Toplevel(self.root)
        self._message.attributes("-fullscreen", True)
        self._message.attributes("-topmost", True)
        self._message.configure(bg=BG_DARK)
        self._message.focus_force()

        frame = tk.Frame(self._message, bg=BG_DARK)
        frame.place(relx=0.5, rely=0.5, anchor="center")
        tk.Label(
            frame, text="ATENCIÓN", font=("Segoe UI", 26, "bold"),
            fg=ACCENT, bg=BG_DARK,
        ).pack(pady=(0, 24))
        tk.Label(
            frame, text=text, font=("Segoe UI", 38, "bold"), fg=TEXT,
            bg=BG_DARK, wraplength=self._message.winfo_screenwidth() - 200,
            justify="center",
        ).pack()

    def _destroy_message(self) -> None:
        if self._message is not None:
            self._message.destroy()
            self._message = None

    # --- Bloqueo total ------------------------------------------------------
    def _render_lock(self, text: str) -> None:
        if self._lock is None:
            self._lock = tk.Toplevel(self.root)
            self._lock.attributes("-fullscreen", True)
            self._lock.attributes("-topmost", True)
            self._lock.configure(bg=BG_DARK)
            self._lock.protocol("WM_DELETE_WINDOW", lambda: None)

            frame = tk.Frame(self._lock, bg=BG_DARK)
            frame.place(relx=0.5, rely=0.5, anchor="center")
            tk.Label(frame, text="🔒", font=("Segoe UI", 72), fg=ACCENT, bg=BG_DARK).pack(pady=(0, 16))
            tk.Label(frame, text="Equipo bloqueado por el profesor",
                     font=("Segoe UI", 30, "bold"), fg=TEXT, bg=BG_DARK).pack()
            self._lock_detail = tk.Label(frame, text="", font=("Segoe UI", 18),
                                         fg="#9aa4b2", bg=BG_DARK, wraplength=900, justify="center")
            self._lock_detail.pack(pady=(14, 0))

        self._lock_detail.configure(text=text or "")
        self._lock.deiconify()
        self._lock.lift()
        self._lock.focus_force()
        try:
            self._lock.grab_set_global()  # captura eventos aunque falle BlockInput
        except tk.TclError:
            pass
        if not self._lock_active:
            _block_input(True)
            self._lock_active = True

    def _destroy_lock(self) -> None:
        if self._lock_active:
            _block_input(False)
            self._lock_active = False
        if self._lock is not None:
            try:
                self._lock.grab_release()
            except tk.TclError:
                pass
            self._lock.destroy()
            self._lock = None

    # --- Proyección de la pantalla del profesor ----------------------------
    def _render_bcast(self) -> None:
        if self._bcast is None:
            self._bcast = tk.Toplevel(self.root)
            self._bcast.attributes("-fullscreen", True)
            self._bcast.attributes("-topmost", True)
            self._bcast.configure(bg="black")
            self._bcast.protocol("WM_DELETE_WINDOW", lambda: None)
            self._bcast_label = tk.Label(self._bcast, bg="black",
                                         text="Conectando con la pantalla del profesor…",
                                         fg="white", font=("Segoe UI", 20))
            self._bcast_label.pack(fill="both", expand=True)
        self._bcast.deiconify()
        self._bcast.lift()

    def _update_bcast(self, jpeg: bytes) -> None:
        if self._bcast is None:
            self._render_bcast()
        try:
            img = Image.open(io.BytesIO(jpeg))
            sw = self._bcast.winfo_screenwidth()
            sh = self._bcast.winfo_screenheight()
            img.thumbnail((sw, sh), Image.BILINEAR)
            self._bcast_photo = ImageTk.PhotoImage(img)
            self._bcast_label.configure(image=self._bcast_photo, text="")
        except Exception:
            pass

    def _destroy_bcast(self) -> None:
        if self._bcast is not None:
            self._bcast.destroy()
            self._bcast = None
            self._bcast_label = None
            self._bcast_photo = None
