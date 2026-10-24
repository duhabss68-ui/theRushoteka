"""Servicio de Windows que ejecuta el agente en la sesión del alumno.

Este es el modo de BLINDAJE TOTAL: el servicio corre como SYSTEM (en la sesión
0), de modo que un alumno estándar no puede detenerlo ni cerrarlo, y relanza el
agente ``ClassroomClient`` dentro de la sesión interactiva del usuario (sesión
1+) usando ``CreateProcessAsUser``. Así la interfaz, la captura de pantalla y el
bloqueo funcionan en el escritorio del alumno, pero el control lo tiene un
proceso SYSTEM imposible de cerrar sin privilegios de administrador.

Requiere Python + pywin32 en el equipo:  pip install pywin32

Instalación (como administrador):
    python run_service.py --startup auto install
    python run_service.py start
Desinstalación:
    python run_service.py stop
    python run_service.py remove

NOTA: este módulo solo funciona en Windows con pywin32. Es el componente más
avanzado y, por su naturaleza (sesión 0 / tokens de usuario), debe validarse en
un equipo real antes de desplegarlo de forma masiva.
"""

from __future__ import annotations

import os
import sys

# Las importaciones de pywin32 solo existen en Windows; se importan de forma
# perezosa para que el módulo al menos se compile en otros sistemas.
try:
    import servicemanager
    import win32con
    import win32event
    import win32process
    import win32profile
    import win32service
    import win32serviceutil
    import win32ts
    import win32api
    _HAVE_PYWIN32 = True
except Exception:  # noqa: BLE001
    _HAVE_PYWIN32 = False


CHECK_INTERVAL_MS = 3000


def _client_command() -> str:
    """Ruta/orden para lanzar el agente cliente."""
    base = os.path.dirname(os.path.abspath(sys.executable if getattr(sys, "frozen", False)
                                           else sys.argv[0] or "."))
    exe = os.path.join(base, "ClassroomClient.exe")
    if os.path.isfile(exe):
        return f'"{exe}"'
    # Desde código fuente: intérprete + run_client.py
    run_client = os.path.join(base, "run_client.py")
    return f'"{sys.executable}" "{run_client}"'


if _HAVE_PYWIN32:

    class ClassroomControlService(win32serviceutil.ServiceFramework):
        _svc_name_ = "ClassroomControlSvc"
        _svc_display_name_ = "ClassroomControl Agent Service"
        _svc_description_ = ("Mantiene el agente de supervisión de aula en la sesión del "
                             "usuario y lo reinicia si se cierra.")

        def __init__(self, args):
            super().__init__(args)
            self._stop_evt = win32event.CreateEvent(None, 0, 0, None)
            self._proc_handle = None

        def SvcStop(self):
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
            win32event.SetEvent(self._stop_evt)
            self._terminate_child()

        def SvcDoRun(self):
            servicemanager.LogInfoMsg("ClassroomControlSvc iniciado")
            self._run()

        # --- Bucle principal ---------------------------------------------
        def _run(self):
            while True:
                if win32event.WaitForSingleObject(self._stop_evt, 0) == win32event.WAIT_OBJECT_0:
                    break
                try:
                    if not self._child_alive():
                        self._launch_in_active_session()
                except Exception as exc:  # noqa: BLE001
                    servicemanager.LogErrorMsg(f"No se pudo lanzar el agente: {exc}")
                # Esperar el intervalo o hasta que pidan parar.
                if win32event.WaitForSingleObject(self._stop_evt, CHECK_INTERVAL_MS) == win32event.WAIT_OBJECT_0:
                    break
            self._terminate_child()

        def _child_alive(self) -> bool:
            if self._proc_handle is None:
                return False
            return win32event.WaitForSingleObject(self._proc_handle, 0) == win32event.WAIT_TIMEOUT

        def _launch_in_active_session(self):
            session_id = win32ts.WTSGetActiveConsoleSessionId()
            if session_id == 0xFFFFFFFF:
                return  # no hay sesión interactiva (nadie ha iniciado sesión)

            # Token del usuario de esa sesión (SYSTEM tiene el privilegio).
            user_token = win32ts.WTSQueryUserToken(session_id)
            try:
                env = win32profile.CreateEnvironmentBlock(user_token, False)
                startup = win32process.STARTUPINFO()
                startup.lpDesktop = "winsta0\\default"  # escritorio interactivo
                hProcess, hThread, pid, tid = win32process.CreateProcessAsUser(
                    user_token, None, _client_command(), None, None, False,
                    win32con.CREATE_UNICODE_ENVIRONMENT | win32con.CREATE_NEW_CONSOLE,
                    env, None, startup,
                )
                self._proc_handle = hProcess
                try:
                    win32api.CloseHandle(hThread)
                except Exception:
                    pass
                servicemanager.LogInfoMsg(f"Agente lanzado en la sesión {session_id} (PID {pid})")
            finally:
                try:
                    win32api.CloseHandle(user_token)
                except Exception:
                    pass

        def _terminate_child(self):
            if self._proc_handle is not None:
                try:
                    win32process.TerminateProcess(self._proc_handle, 0)
                except Exception:
                    pass
                try:
                    win32api.CloseHandle(self._proc_handle)
                except Exception:
                    pass
                self._proc_handle = None


def main() -> None:
    if not _HAVE_PYWIN32:
        print("Este servicio requiere Windows con pywin32:  pip install pywin32")
        sys.exit(1)
    win32serviceutil.HandleCommandLine(ClassroomControlService)


if __name__ == "__main__":
    main()
