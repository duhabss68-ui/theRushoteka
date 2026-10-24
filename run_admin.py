#!/usr/bin/env python3
"""Punto de entrada de la CONSOLA DE ADMINISTRADOR (equipo del profesor).

Uso:
    python run_admin.py [ruta/al/admin.ini]

Si no se indica ruta, se busca ``admin.ini`` en el directorio actual y luego
``config/admin.ini`` dentro del proyecto.
"""

import sys

from classroom_control.admin.console import main

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
