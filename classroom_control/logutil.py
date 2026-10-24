"""Registro (logs) a fichero y captura global de errores.

Motivación: los ejecutables se compilan con ``--noconsole``, así que cualquier
error no controlado haría que el programa "muriera en silencio" sin dejar
rastro. Aquí se configura:

  - Un log rotativo a fichero junto al ejecutable (o al script).
  - Un ``sys.excepthook`` y un ``threading.excepthook`` que registran cualquier
    excepción no controlada (y opcionalmente muestran un diálogo de error).

Así, cuando algo falle en un aula, habrá un ``.log`` que explique qué pasó.
"""

from __future__ import annotations

import logging
import os
import sys
import threading
from logging.handlers import RotatingFileHandler

_LOGGER_NAME = "classroomcontrol"


def _base_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(sys.argv[0] or "."))


def setup_logging(name: str) -> logging.Logger:
    """Configura y devuelve el logger. ``name`` da el nombre del fichero."""
    logger = logging.getLogger(_LOGGER_NAME)
    if logger.handlers:  # ya configurado
        return logger
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)-7s %(message)s", "%Y-%m-%d %H:%M:%S")

    # Fichero rotativo junto al ejecutable.
    try:
        path = os.path.join(_base_dir(), f"{name}.log")
        fh = RotatingFileHandler(path, maxBytes=1_000_000, backupCount=3, encoding="utf-8")
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except Exception:
        pass

    # Consola, si existe (al ejecutar desde cmd durante las pruebas).
    try:
        if sys.stderr is not None:
            sh = logging.StreamHandler()
            sh.setFormatter(fmt)
            logger.addHandler(sh)
    except Exception:
        pass

    return logger


def install_excepthook(logger: logging.Logger, gui_title: str | None = None) -> None:
    """Registra las excepciones no controladas (hilo principal e hilos)."""

    def _show_dialog(message: str) -> None:
        if not gui_title:
            return
        try:
            import tkinter as tk
            from tkinter import messagebox
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror(
                gui_title,
                f"Se produjo un error inesperado:\n\n{message}\n\n"
                f"Los detalles se guardaron en el archivo de registro (.log).",
            )
            root.destroy()
        except Exception:
            pass

    def main_hook(exc_type, exc, tb):
        if issubclass(exc_type, KeyboardInterrupt):
            sys.__excepthook__(exc_type, exc, tb)
            return
        logger.error("Excepción no controlada", exc_info=(exc_type, exc, tb))
        _show_dialog(f"{exc_type.__name__}: {exc}")

    sys.excepthook = main_hook

    # Excepciones en hilos (Python 3.8+).
    def thread_hook(args):
        if issubclass(args.exc_type, KeyboardInterrupt):
            return
        logger.error(
            "Excepción no controlada en hilo %s", args.thread.name if args.thread else "?",
            exc_info=(args.exc_type, args.exc_value, args.exc_traceback),
        )

    try:
        threading.excepthook = thread_hook
    except Exception:
        pass
