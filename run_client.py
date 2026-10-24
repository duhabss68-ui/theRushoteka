#!/usr/bin/env python3
"""Punto de entrada del AGENTE CLIENTE (equipo del alumno).

Uso:
    python run_client.py [ruta/al/client.ini]

Si no se indica ruta, se busca ``client.ini`` en el directorio actual y luego
``config/client.ini`` dentro del proyecto.
"""

import sys

from classroom_control.client.agent import main

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
