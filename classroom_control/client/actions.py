"""Acciones de gestión en el equipo cliente (Windows):

  - Lista de procesos y finalización de procesos.
  - Bloqueo de aplicaciones (se cierran mientras esté activo).
  - Bloqueo de sitios web (vía el fichero hosts de Windows).
  - Recepción de archivos enviados por el profesor.

Sin dependencias externas: usa ``tasklist``/``taskkill`` y el fichero hosts.
Fuera de Windows, las funciones degradan de forma segura (para desarrollo).
El bloqueo de webs y, a veces, el cierre de ciertas apps requieren que el
agente se ejecute con privilegios de administrador.
"""

from __future__ import annotations

import csv
import io
import logging
import os
import subprocess
import sys
import threading
import time
from typing import List, Optional

log = logging.getLogger("classroomcontrol")

_IS_WIN = sys.platform.startswith("win")
_NO_WINDOW = 0x08000000 if _IS_WIN else 0  # CREATE_NO_WINDOW: sin consola emergente

_HOSTS = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"),
                      "System32", "drivers", "etc", "hosts")
_MARK_BEGIN = "# ClassroomControl BEGIN"
_MARK_END = "# ClassroomControl END"


def _run(cmd: list) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True,
                          creationflags=_NO_WINDOW, timeout=15)


# --- Procesos --------------------------------------------------------------
def list_processes() -> List[dict]:
    """Devuelve [{'pid': int, 'name': str}] de los procesos en ejecución."""
    if not _IS_WIN:
        return []
    try:
        out = _run(["tasklist", "/fo", "csv", "/nh"]).stdout
        procs = []
        for row in csv.reader(io.StringIO(out)):
            if len(row) >= 2:
                try:
                    procs.append({"name": row[0], "pid": int(row[1])})
                except ValueError:
                    continue
        return procs
    except Exception as exc:  # noqa: BLE001
        log.warning("No se pudo listar procesos: %s", exc)
        return []


def kill_process(pid: Optional[int] = None, name: Optional[str] = None) -> bool:
    if not _IS_WIN:
        return False
    try:
        if pid is not None:
            _run(["taskkill", "/pid", str(pid), "/f", "/t"])
        elif name:
            _run(["taskkill", "/im", name, "/f", "/t"])
        else:
            return False
        return True
    except Exception as exc:  # noqa: BLE001
        log.warning("No se pudo finalizar el proceso: %s", exc)
        return False


# --- Bloqueo de aplicaciones ----------------------------------------------
class AppBlocker:
    """Mantiene una lista de ejecutables prohibidos y los cierra en bucle."""

    def __init__(self) -> None:
        self._names: set[str] = set()
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def set_blocked(self, names: List[str], on: bool) -> None:
        with self._lock:
            if on:
                self._names = {n.lower() for n in names if n}
            else:
                self._names = set()
        if on and self._names:
            self._ensure_running()

    def _ensure_running(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()

    def _loop(self) -> None:
        while not self._stop.is_set():
            with self._lock:
                blocked = set(self._names)
            if not blocked:
                break  # nada que vigilar
            for p in list_processes():
                if p["name"].lower() in blocked:
                    kill_process(pid=p["pid"])
            time.sleep(2.0)

    def stop(self) -> None:
        self._stop.set()
        with self._lock:
            self._names = set()


# --- Bloqueo de sitios web (fichero hosts) --------------------------------
class WebBlocker:
    def set_blocked(self, domains: List[str], on: bool) -> None:
        if not _IS_WIN:
            return
        try:
            self._rewrite(domains if on else [])
            _run(["ipconfig", "/flushdns"])
        except Exception as exc:  # noqa: BLE001
            log.warning("No se pudo actualizar el bloqueo de webs: %s", exc)

    def _rewrite(self, domains: List[str]) -> None:
        try:
            with open(_HOSTS, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except FileNotFoundError:
            lines = []

        # Quitar el bloque anterior de ClassroomControl.
        out, skipping = [], False
        for ln in lines:
            if ln.strip() == _MARK_BEGIN:
                skipping = True
                continue
            if ln.strip() == _MARK_END:
                skipping = False
                continue
            if not skipping:
                out.append(ln)

        # Añadir el nuevo bloque.
        if domains:
            if out and not out[-1].endswith("\n"):
                out.append("\n")
            out.append(_MARK_BEGIN + "\n")
            for d in domains:
                d = d.strip().lower().replace("https://", "").replace("http://", "").strip("/")
                if not d:
                    continue
                out.append(f"127.0.0.1 {d}\n")
                if not d.startswith("www."):
                    out.append(f"127.0.0.1 www.{d}\n")
            out.append(_MARK_END + "\n")

        with open(_HOSTS, "w", encoding="utf-8") as f:
            f.writelines(out)


# --- Recepción de archivos -------------------------------------------------
def save_file(name: str, data: bytes, dest_dir: str = "") -> Optional[str]:
    """Guarda un archivo recibido; devuelve la ruta o None si falla."""
    safe = os.path.basename(name or "archivo")
    safe = "".join(c for c in safe if c not in '<>:"/\\|?*').strip() or "archivo"
    if not dest_dir:
        dest_dir = os.path.join(os.path.expanduser("~"), "Desktop", "ClassroomControl")
    try:
        os.makedirs(dest_dir, exist_ok=True)
        path = os.path.join(dest_dir, safe)
        with open(path, "wb") as f:
            f.write(data)
        return path
    except Exception as exc:  # noqa: BLE001
        log.warning("No se pudo guardar el archivo recibido: %s", exc)
        return None
