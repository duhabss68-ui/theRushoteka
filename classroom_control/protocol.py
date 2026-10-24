"""Protocolo de mensajes sobre TCP para ClassroomControl.

Formato de trama en el cable (todo big-endian):

    MAGIC (4 bytes)  | total_len (4 bytes) | json_len (4 bytes) | json | blob

  - MAGIC      : constante que identifica el protocolo y permite re-sincronizar.
  - total_len  : longitud de (json_len + json + blob), es decir todo lo que
                 queda por leer tras este campo.
  - json_len   : longitud del documento JSON de cabecera.
  - json       : cabecera JSON (UTF-8). Siempre contiene la clave "t" (tipo).
  - blob       : datos binarios opcionales (p. ej. un fotograma JPEG).

Un único formato uniforme sirve tanto para mensajes de control (solo JSON)
como para fotogramas (JSON + blob binario), evitando dos rutas de parseo.
"""

from __future__ import annotations

import json
import socket
import struct
from typing import Any, Dict, Tuple

MAGIC = b"CLSR"
_HEADER = struct.Struct(">4sI")   # MAGIC + total_len
_JSONLEN = struct.Struct(">I")    # json_len

# Límite defensivo para no reservar memoria sin control si llega basura o un
# cliente malicioso anuncia un tamaño enorme. 32 MiB es de sobra para un
# fotograma de pantalla comprimido.
MAX_MESSAGE = 32 * 1024 * 1024

# --- Tipos de mensaje (valor del campo "t") --------------------------------
# Cliente -> Admin
T_AUTH = "auth"          # respuesta al desafío + datos del equipo
T_FRAME = "frame"        # fotograma de pantalla (+ blob JPEG)
T_STATUS = "status"      # cambios de estado (controlado, mensaje visible...)
T_PONG = "pong"

# Admin -> Cliente
T_CHALLENGE = "challenge"  # nonce para autenticación
T_AUTH_OK = "auth_ok"
T_AUTH_FAIL = "auth_fail"
T_STREAM = "stream"        # ajustes de transmisión (fps, escala, calidad)
T_INPUT = "input"          # evento de ratón/teclado a inyectar
T_CONTROL = "control"      # activar/desactivar control remoto (y su indicador)
T_MESSAGE = "message"      # mostrar/ocultar mensaje de atención
T_LOCK = "lock"            # inmovilizar/liberar teclado y ratón del equipo
T_POWER = "power"          # apagar / reiniciar / cerrar sesión
T_BCAST = "bcast"          # iniciar/detener proyección de la pantalla del profesor
T_BCAST_FRAME = "bframe"   # fotograma de la pantalla del profesor (+ blob JPEG)
T_PING = "ping"


class ProtocolError(Exception):
    """Trama malformada, desincronizada o demasiado grande."""


def _recvall(sock: socket.socket, n: int) -> bytes:
    """Lee exactamente ``n`` bytes del socket o lanza ProtocolError al cerrarse."""
    chunks = bytearray()
    while len(chunks) < n:
        chunk = sock.recv(n - len(chunks))
        if not chunk:
            raise ProtocolError("conexión cerrada por el otro extremo")
        chunks.extend(chunk)
    return bytes(chunks)


def send_msg(sock: socket.socket, obj: Dict[str, Any], blob: bytes = b"") -> None:
    """Serializa y envía un mensaje. Seguro para un único hilo escritor por socket."""
    json_bytes = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    total_len = _JSONLEN.size + len(json_bytes) + len(blob)
    header = _HEADER.pack(MAGIC, total_len) + _JSONLEN.pack(len(json_bytes))
    # sendall en una sola llamada con todo concatenado para no entrelazar
    # fragmentos si varios hilos compartieran el socket por error.
    sock.sendall(header + json_bytes + blob)


def recv_msg(sock: socket.socket) -> Tuple[Dict[str, Any], bytes]:
    """Recibe un mensaje completo y devuelve ``(cabecera_json, blob)``."""
    magic, total_len = _HEADER.unpack(_recvall(sock, _HEADER.size))
    if magic != MAGIC:
        raise ProtocolError(f"magic inválido: {magic!r}")
    if total_len < _JSONLEN.size or total_len > MAX_MESSAGE:
        raise ProtocolError(f"longitud de mensaje fuera de rango: {total_len}")

    body = _recvall(sock, total_len)
    (json_len,) = _JSONLEN.unpack(body[: _JSONLEN.size])
    if _JSONLEN.size + json_len > total_len:
        raise ProtocolError("json_len incoherente con total_len")

    json_start = _JSONLEN.size
    json_end = json_start + json_len
    try:
        obj = json.loads(body[json_start:json_end].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProtocolError(f"cabecera JSON inválida: {exc}") from exc
    if not isinstance(obj, dict) or "t" not in obj:
        raise ProtocolError("la cabecera debe ser un objeto con clave 't'")

    blob = body[json_end:]
    return obj, blob
