"""Tema visual (claro y oscuro) para la consola, sobre ``ttk``.

Define dos paletas de tokens semánticos (oscuro y claro) con las MISMAS claves,
detecta la preferencia del sistema operativo y aplica los estilos ``ttk``.
Se parte del tema ``clam`` porque es el único de ttk que permite colorear a
voluntad fondos y bordes en todas las plataformas.

La consola puede alternar el tema en caliente y, por defecto, sigue al sistema.
"""

from __future__ import annotations

import sys

# tkinter se importa dentro de apply_theme para que este módulo (paletas y
# detección de tema) pueda usarse sin entorno gráfico.

# Tokens semánticos. Ambas paletas comparten claves para poder intercambiarlas.
DARK = {
    "mode": "dark",
    "bg": "#0f1115",        # fondo de la ventana
    "panel": "#171a21",     # barras y paneles
    "panel2": "#1f2430",    # superficies elevadas / botones
    "border": "#2a2f3a",    # bordes sutiles
    "text": "#e5e7eb",      # texto principal
    "muted": "#9aa4b2",     # texto secundario
    "accent": "#3b82f6",
    "accent_hov": "#2f6fd6",
    "danger": "#ef4444",
    "danger_hov": "#dc2626",
    "success": "#22c55e",
    "warn": "#f59e0b",
    "warn_hov": "#d98704",
}

LIGHT = {
    "mode": "light",
    "bg": "#eef1f6",        # gris muy claro (evita el blanco puro, menos deslumbre)
    "panel": "#ffffff",
    "panel2": "#e9edf3",
    "border": "#d6dce6",
    "text": "#1b2430",
    "muted": "#5b6473",
    "accent": "#3b82f6",
    "accent_hov": "#2f6fd6",
    "danger": "#ef4444",
    "danger_hov": "#dc2626",
    "success": "#16a34a",   # verde más oscuro: legible sobre blanco
    "warn": "#f59e0b",
    "warn_hov": "#d98704",
}

FONT = "Segoe UI"


def detect_system_theme() -> str:
    """Devuelve 'light' o 'dark' según la preferencia del sistema (Windows)."""
    if sys.platform.startswith("win"):
        try:
            import winreg
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
            )
            value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
            return "light" if value == 1 else "dark"
        except Exception:
            return "dark"
    return "dark"


def resolve_mode(theme: str) -> str:
    """Resuelve 'system'/'dark'/'light' a 'dark' o 'light'."""
    theme = (theme or "system").lower()
    if theme == "light":
        return "light"
    if theme == "dark":
        return "dark"
    return detect_system_theme()


def palette_for(mode: str) -> dict:
    return LIGHT if mode == "light" else DARK


def apply_theme(root, mode: str = "dark") -> dict:
    """Aplica la paleta del modo indicado a la raíz y devuelve la paleta."""
    import tkinter as tk
    from tkinter import ttk

    p = palette_for(mode)
    root.configure(bg=p["bg"])

    style = ttk.Style(root)
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass

    # Botón base: plano, con relleno generoso.
    style.configure(
        "TButton", background=p["panel2"], foreground=p["text"],
        borderwidth=0, focusthickness=0, padding=(12, 8),
        font=(FONT, 10), relief="flat",
    )
    style.map(
        "TButton",
        background=[("active", p["border"]), ("pressed", p["border"])],
        foreground=[("disabled", p["muted"])],
    )

    # Variantes de color por tipo de acción.
    for name, base, hov, fg in (
        ("Accent.TButton", p["accent"], p["accent_hov"], "#ffffff"),
        ("Danger.TButton", p["danger"], p["danger_hov"], "#ffffff"),
        ("Warn.TButton", p["warn"], p["warn_hov"], "#1a1205"),
    ):
        style.configure(name, background=base, foreground=fg, padding=(12, 8),
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
    style.configure("TScrollbar", background=p["panel2"], troughcolor=p["bg"],
                    borderwidth=0, arrowcolor=p["muted"])

    return p


# Compatibilidad: paleta por defecto (modo oscuro).
PALETTE = DARK
