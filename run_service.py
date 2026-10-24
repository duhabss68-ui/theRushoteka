#!/usr/bin/env python3
"""Punto de entrada del SERVICIO de Windows (blindaje total).

Requiere pywin32 (pip install pywin32). Ejecutar como administrador:

    python run_service.py --startup auto install
    python run_service.py start
    python run_service.py stop
    python run_service.py remove
"""

from classroom_control.client.service import main

if __name__ == "__main__":
    main()
