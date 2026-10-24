#!/usr/bin/env python3
"""Punto de entrada del VIGILANTE del agente cliente.

Lanza ClassroomClient y lo reinicia si se cierra. Normalmente se instala como
tarea programada al iniciar sesión (ver install_client_task.bat).

Uso:  python run_watchdog.py
"""

from classroom_control.client.watchdog import main

if __name__ == "__main__":
    main()
