"""Tema visual moderno (oscuro) para la consola, construido sobre ``ttk``.

Define una paleta coherente y estilos planos para botones, barras y etiquetas.
Se parte del tema ``clam`` porque es el único de ttk que permite colorear a
voluntad fondos y bordes en todas las plataformas.
"""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk

PALETTE = {
    "bg": "#0f1115",        # fondo de la ventana
    "panel": "#171a21",     # barras y paneles
    "panel2": "#1f2430",    # superficies elevadas / botones
    "border": "#2a2f3a",    # bordes sutiles
    "text": "#e5e7eb",      # texto principal
    "muted": "#9aa4b2",     # texto secundario
    "accent": "#3b82f6",    # azul de acción
    "accent_hov": "#2f6fd6",
    "danger": "#ef4444",    # rojo (energía, control)
    "danger_hov": "#dc2626",
    "success": "#22c55e",   # verde (conectado)
    "warn": "#f59e0b",      # ámbar (bloqueo/aviso)
    "warn_hov": "#d98704",
}

FONT = "Segoe UI"


def apply_theme(root: tk.Tk) -> dict:
    """Aplica el tema a la raíz y devuelve la paleta para uso directo."""
    p = PALETTE
    root.configure(bg=p["bg"])

    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass

    # Botón base: plano, con relleno generoso y esquina discreta.
    style.configure(
        "TButton", background=p["panel2"], foreground=p["text"],
        borderwidth=0, focusthickness=0, padding=(12, 7),
        font=(FONT, 10), relief="flat",
    )
    style.map(
        "TButton",
        background=[("active", p["border"]), ("pressed", p["border"])],
        foreground=[("disabled", p["muted"])],
    )

    # Variantes de color por tipo de acción.
    for name, base, hov in (
        ("Accent.TButton", p["accent"], p["accent_hov"]),
        ("Danger.TButton", p["danger"], p["danger_hov"]),
        ("Warn.TButton", p["warn"], p["warn_hov"]),
    ):
        style.configure(name, background=base, foreground="white", padding=(12, 7),
                        font=(FONT, 10, "bold"), borderwidth=0, relief="flat")
        style.map(name, background=[("active", hov), ("pressed", hov)])

    style.configure("Toolbar.TFrame", background=p["panel"])
    style.configure("Bg.TFrame", background=p["bg"])
    style.configure("Title.TLabel", background=p["panel"], foreground=p["text"],
                    font=(FONT, 13, "bold"))
    style.configure("Status.TLabel", background=p["panel"], foreground=p["success"],
                    font=(FONT, 10, "bold"))
    style.configure("Muted.TLabel", background=p["panel"], foreground=p["muted"],
                    font=(FONT, 10))

    return p
