"""Vigilante (watchdog) del agente cliente.

Lanza el agente y lo vuelve a arrancar si se cierra o se cuelga. Combinado con
una tarea programada que lo inicie al iniciar sesión, consigue que:

  - Si un alumno cierra el agente (p. ej. desde el Administrador de tareas),
    vuelve a arrancar en pocos segundos.
  - Si el agente falla, se reinicia solo.

Limitación honesta: este vigilante corre en la sesión del usuario (para que la
interfaz y la captura funcionen), así que un alumno con permisos de
administrador todavía podría detenerlo. Para un bloqueo a prueba de todo haría
falta un Servicio de Windows en la sesión 0 que lance el agente en la sesión
del usuario (arquitectura más compleja, documentada como mejora futura).
"""

from __future__ import annotations

import logging
import os
import subprocess
import sys
import time

from ..logutil import install_excepthook, setup_logging

log = logging.getLogger("classroomcontrol")

RESTART_DELAY = 3.0  # segundos antes de relanzar


def _base_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(sys.argv[0] or "."))


def _target_cmd() -> list[str]:
    """Comando que lanza el agente cliente."""
    base = _base_dir()
    if getattr(sys, "frozen", False):
        # Empaquetado: junto al watchdog está ClassroomClient.exe.
        return [os.path.join(base, "ClassroomClient.exe")]
    # Código fuente: mismo intérprete + run_client.py.
    return [sys.executable, os.path.join(base, "run_client.py")]


def main() -> None:
    setup_logging("ClassroomWatchdog")
    install_excepthook(log)
    cmd = _target_cmd()
    log.info("Watchdog iniciado. Agente a vigilar: %s", cmd)
    while True:
        try:
            proc = subprocess.Popen(cmd)
            proc.wait()
            log.warning("El agente terminó (código %s). Reiniciando en %ss.",
                        proc.returncode, RESTART_DELAY)
        except Exception as exc:  # noqa: BLE001
            log.error("No se pudo lanzar el agente: %s", exc)
        time.sleep(RESTART_DELAY)


if __name__ == "__main__":
    main()
