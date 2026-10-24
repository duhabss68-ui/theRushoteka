"""Interfaz visible del cliente: indicador de supervisión y mensaje de atención.

Tkinter exige vivir en el hilo principal, así que ``OverlayManager`` posee la
raíz Tk y corre su bucle en el hilo principal del agente. Los hilos de red le
envían órdenes mediante una cola; un sondeo periódico (``after``) las aplica en
el hilo de la GUI. Esto mantiene la red y la interfaz desacopladas y seguras.

El indicador es deliberadamente VISIBLE: comunica al alumno que el equipo está
siendo supervisado o controlado. Es parte del diseño ético de la herramienta.
"""

from __future__ import annotations

import queue
import tkinter as tk
from typing import Optional


class OverlayManager:
    def __init__(self, show_indicator: bool = True) -> None:
        self._show_indicator = show_indicator
        self._cmds: "queue.Queue[tuple]" = queue.Queue()

        self.root = tk.Tk()
        self.root.withdraw()  # la ventana raíz permanece oculta

        self._indicator: Optional[tk.Toplevel] = None
        self._indicator_label: Optional[tk.Label] = None
        self._message: Optional[tk.Toplevel] = None

        self._connected = False
        self._controlled = False

    # --- API segura entre hilos (llamada desde los hilos de red) -----------
    def set_state(self, connected: bool, controlled: bool) -> None:
        self._cmds.put(("state", connected, controlled))

    def show_message(self, text: str) -> None:
        self._cmds.put(("msg_show", text))

    def hide_message(self) -> None:
        self._cmds.put(("msg_hide",))

    def quit(self) -> None:
        self._cmds.put(("quit",))

    # --- Bucle de GUI (hilo principal) -------------------------------------
    def run(self) -> None:
        self._pump()
        self.root.mainloop()

    def _pump(self) -> None:
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
        elif name == "quit":
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
            text = "  🔴  Control remoto activo — el profesor maneja este equipo  "
            bg = "#b00020"
        else:
            text = "  🟢  Equipo supervisado por el profesor  "
            bg = "#1b5e20"

        if self._indicator is None:
            self._indicator = tk.Toplevel(self.root)
            self._indicator.overrideredirect(True)      # sin barra de título
            self._indicator.attributes("-topmost", True)
            try:
                self._indicator.attributes("-alpha", 0.9)
            except tk.TclError:
                pass
            self._indicator_label = tk.Label(
                self._indicator, font=("Segoe UI", 10, "bold"), fg="white", padx=10, pady=4
            )
            self._indicator_label.pack()

        assert self._indicator_label is not None
        self._indicator_label.configure(text=text, bg=bg)
        self._indicator.configure(bg=bg)
        # Colocar arriba al centro de la pantalla.
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
        self._message.configure(bg="#0d47a1")
        self._message.focus_force()

        frame = tk.Frame(self._message, bg="#0d47a1")
        frame.place(relx=0.5, rely=0.5, anchor="center")
        tk.Label(
            frame, text="ATENCIÓN", font=("Segoe UI", 28, "bold"),
            fg="#90caf9", bg="#0d47a1",
        ).pack(pady=(0, 20))
        tk.Label(
            frame, text=text, font=("Segoe UI", 40, "bold"), fg="white",
            bg="#0d47a1", wraplength=self._message.winfo_screenwidth() - 160,
            justify="center",
        ).pack()

    def _destroy_message(self) -> None:
        if self._message is not None:
            self._message.destroy()
            self._message = None
