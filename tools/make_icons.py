#!/usr/bin/env python3
"""Genera los iconos .ico de los ejecutables (consola y cliente).

Dibuja un monitor estilizado sobre un fondo redondeado: azul para la consola
del profesor y verde para el agente del alumno. Produce multirresolución para
que Windows lo muestre nítido en cualquier tamaño.

Uso:  python tools/make_icons.py
Salida:  assets/admin.ico , assets/client.ico
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw

SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def _make(path: str, bg: str) -> None:
    s = 256
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fondo redondeado.
    d.rounded_rectangle([10, 10, s - 10, s - 10], radius=52, fill=bg)

    # Cuerpo del monitor (blanco) con pantalla interior del color de fondo.
    d.rounded_rectangle([52, 66, 204, 170], radius=16, fill="white")
    d.rounded_rectangle([68, 82, 188, 154], radius=9, fill=bg)

    # Punto indicador (verde) en la esquina de la pantalla.
    d.ellipse([172, 60, 186, 74], fill="#9cff9c")

    # Pie del monitor.
    d.rectangle([120, 170, 136, 192], fill="white")
    d.rounded_rectangle([94, 190, 162, 206], radius=7, fill="white")

    img.save(path, format="ICO", sizes=SIZES)
    print("Icono generado:", os.path.abspath(path))


def main() -> None:
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(here, "assets")
    os.makedirs(out, exist_ok=True)
    _make(os.path.join(out, "admin.ico"), "#3b82f6")   # azul: consola
    _make(os.path.join(out, "client.ico"), "#22c55e")  # verde: cliente


if __name__ == "__main__":
    main()
