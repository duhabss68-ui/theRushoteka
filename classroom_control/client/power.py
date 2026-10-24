"""Comandos de energía/sesión del equipo cliente (Windows).

Se usa el comando ``shutdown`` nativo de Windows. En otros sistemas se incluye
una traducción de cortesía para facilitar pruebas de desarrollo, pero el
objetivo de despliegue es Windows.
"""

from __future__ import annotations

import subprocess
import sys


def execute(action: str, delay: int = 5) -> None:
    """Ejecuta 'shutdown' | 'restart' | 'logoff'.

    ``delay`` (segundos) da un margen para que el alumno vea el aviso y para
    poder cancelar con ``shutdown /a`` si fuera necesario.
    """
    action = (action or "").lower()
    if sys.platform.startswith("win"):
        if action == "shutdown":
            subprocess.Popen(["shutdown", "/s", "/t", str(delay)])
        elif action == "restart":
            subprocess.Popen(["shutdown", "/r", "/t", str(delay)])
        elif action == "logoff":
            subprocess.Popen(["shutdown", "/l"])
    else:
        # Equivalentes en Linux/macOS, útiles solo para desarrollo/pruebas.
        if action == "shutdown":
            subprocess.Popen(["shutdown", "-h", f"+{max(1, delay // 60)}"])
        elif action == "restart":
            subprocess.Popen(["shutdown", "-r", f"+{max(1, delay // 60)}"])
        elif action == "logoff":
            # No hay un cierre de sesión universal; se omite fuera de Windows.
            pass
