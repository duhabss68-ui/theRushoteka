"""Captura de pantalla y codificación a JPEG.

Usa ``mss`` para capturar rápido y ``Pillow`` para escalar y comprimir. Una
instancia de ``mss`` NO es segura entre hilos, así que ``ScreenGrabber`` debe
crearse y usarse dentro del mismo hilo que transmite.
"""

from __future__ import annotations

import io
from typing import Tuple

import mss
from PIL import Image


class ScreenGrabber:
    def __init__(self) -> None:
        self._sct = mss.mss()
        # monitors[0] es la unión de todas las pantallas; monitors[1] es la
        # principal. Para un aula basta la pantalla principal.
        monitors = self._sct.monitors
        self._monitor = monitors[1] if len(monitors) > 1 else monitors[0]

    @property
    def size(self) -> Tuple[int, int]:
        return self._monitor["width"], self._monitor["height"]

    def capture_jpeg(self, scale: float, quality: int) -> Tuple[bytes, int, int]:
        """Captura la pantalla y devuelve ``(jpeg_bytes, ancho, alto)`` ya escalada."""
        raw = self._sct.grab(self._monitor)
        img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

        scale = max(0.05, min(1.0, scale))
        if scale < 1.0:
            new_w = max(1, int(img.width * scale))
            new_h = max(1, int(img.height * scale))
            img = img.resize((new_w, new_h), Image.BILINEAR)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=max(1, min(95, quality)))
        return buf.getvalue(), img.width, img.height

    def close(self) -> None:
        try:
            self._sct.close()
        except Exception:
            pass
