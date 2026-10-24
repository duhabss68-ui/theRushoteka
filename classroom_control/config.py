"""Carga de configuración desde ficheros .ini con valores por defecto.

Cada rol (cliente / admin) tiene su propia sección. Si no se pasa ruta, se
busca junto al ejecutable y en el directorio ``config/`` del proyecto.
"""

from __future__ import annotations

import configparser
import os
import sys
from dataclasses import dataclass
from typing import Optional


@dataclass
class ClientConfig:
    admin_host: str = "127.0.0.1"   # IP de la consola del profesor
    admin_port: int = 47800
    token: str = "cambia-este-token"
    reconnect_seconds: float = 5.0
    # Calidad por defecto de la rejilla (el admin puede subirla al enfocar).
    grid_fps: float = 2.0
    grid_scale: float = 0.25        # 25% del tamaño real
    grid_quality: int = 35          # calidad JPEG 1-95
    allow_remote_control: bool = True
    allow_power: bool = True
    allow_lock: bool = True         # permitir inmovilizar teclado/ratón
    show_indicator: bool = True     # mostrar aviso visible de supervisión
    # Cifrado TLS (opcional). Si se activa, el cliente verifica el certificado
    # del profesor contra ca_cert (fijado), evitando intermediarios (MITM).
    use_tls: bool = False
    ca_cert: str = "server.crt"


@dataclass
class AdminConfig:
    listen_host: str = "0.0.0.0"
    listen_port: int = 47800
    token: str = "cambia-este-token"
    # Calidad al enfocar un equipo concreto.
    focus_fps: float = 12.0
    focus_scale: float = 1.0
    focus_quality: int = 70
    columns: int = 8                # columnas de la rejilla (8x5 = 40)
    # Cifrado TLS (opcional). Requiere certificado y clave del servidor.
    use_tls: bool = False
    certfile: str = "server.crt"
    keyfile: str = "server.key"


def _find_config(filename: str, explicit: Optional[str]) -> Optional[str]:
    if explicit:
        return explicit
    here = os.path.dirname(os.path.abspath(__file__))
    # Carpeta del ejecutable: con un .exe empaquetado (PyInstaller) es la del
    # propio .exe; en código fuente, la del script lanzado. Así el .ini puede
    # ir junto al .exe aunque se ejecute con otro directorio actual (p. ej.
    # desde el Programador de tareas de Windows).
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
    else:
        exe_dir = os.path.dirname(os.path.abspath(sys.argv[0] or "."))
    candidates = [
        os.path.join(os.getcwd(), filename),
        os.path.join(exe_dir, filename),
        os.path.join(exe_dir, "config", filename),
        os.path.join(here, "..", "config", filename),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None


def _resolve_data(name: str) -> str:
    """Resuelve un fichero de datos (p. ej. un certificado) buscándolo junto al
    ejecutable/.ini. Si no se encuentra, devuelve el nombre tal cual."""
    if not name or os.path.isabs(name):
        return name
    here = os.path.dirname(os.path.abspath(__file__))
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
    else:
        exe_dir = os.path.dirname(os.path.abspath(sys.argv[0] or "."))
    for base in (os.getcwd(), exe_dir, os.path.join(exe_dir, "config"),
                 os.path.join(here, "..", "config")):
        path = os.path.join(base, name)
        if os.path.isfile(path):
            return path
    return name


def load_client_config(path: Optional[str] = None) -> ClientConfig:
    cfg = ClientConfig()
    resolved = _find_config("client.ini", path)
    if resolved:
        parser = configparser.ConfigParser()
        parser.read(resolved, encoding="utf-8")
        s = parser["client"] if parser.has_section("client") else parser["DEFAULT"]
        cfg.admin_host = s.get("admin_host", cfg.admin_host)
        cfg.admin_port = s.getint("admin_port", cfg.admin_port)
        cfg.token = s.get("token", cfg.token)
        cfg.reconnect_seconds = s.getfloat("reconnect_seconds", cfg.reconnect_seconds)
        cfg.grid_fps = s.getfloat("grid_fps", cfg.grid_fps)
        cfg.grid_scale = s.getfloat("grid_scale", cfg.grid_scale)
        cfg.grid_quality = s.getint("grid_quality", cfg.grid_quality)
        cfg.allow_remote_control = s.getboolean("allow_remote_control", cfg.allow_remote_control)
        cfg.allow_power = s.getboolean("allow_power", cfg.allow_power)
        cfg.allow_lock = s.getboolean("allow_lock", cfg.allow_lock)
        cfg.show_indicator = s.getboolean("show_indicator", cfg.show_indicator)
        cfg.use_tls = s.getboolean("use_tls", cfg.use_tls)
        cfg.ca_cert = s.get("ca_cert", cfg.ca_cert)
    if cfg.use_tls:
        cfg.ca_cert = _resolve_data(cfg.ca_cert)
    return cfg


def load_admin_config(path: Optional[str] = None) -> AdminConfig:
    cfg = AdminConfig()
    resolved = _find_config("admin.ini", path)
    if resolved:
        parser = configparser.ConfigParser()
        parser.read(resolved, encoding="utf-8")
        s = parser["admin"] if parser.has_section("admin") else parser["DEFAULT"]
        cfg.listen_host = s.get("listen_host", cfg.listen_host)
        cfg.listen_port = s.getint("listen_port", cfg.listen_port)
        cfg.token = s.get("token", cfg.token)
        cfg.focus_fps = s.getfloat("focus_fps", cfg.focus_fps)
        cfg.focus_scale = s.getfloat("focus_scale", cfg.focus_scale)
        cfg.focus_quality = s.getint("focus_quality", cfg.focus_quality)
        cfg.columns = s.getint("columns", cfg.columns)
        cfg.use_tls = s.getboolean("use_tls", cfg.use_tls)
        cfg.certfile = s.get("certfile", cfg.certfile)
        cfg.keyfile = s.get("keyfile", cfg.keyfile)
    if cfg.use_tls:
        cfg.certfile = _resolve_data(cfg.certfile)
        cfg.keyfile = _resolve_data(cfg.keyfile)
    return cfg
