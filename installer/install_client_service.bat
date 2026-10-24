@echo off
REM ============================================================
REM  BLINDAJE TOTAL: instala el agente como Servicio de Windows
REM  (SYSTEM, sesión 0) que lo lanza en la sesión del alumno y
REM  no se puede cerrar sin privilegios de administrador.
REM
REM  Requiere Python + pywin32 en el equipo. Ejecutar como ADMIN.
REM  Alternativa más sencilla (sin servicio): install_client_task.bat
REM ============================================================
setlocal
net session >nul 2>&1 || (echo Debes ejecutar este script como ADMINISTRADOR. & pause & exit /b 1)
cd /d "%~dp0\.."

where py >nul 2>&1 && (set "PY=py -3") || (set "PY=python")

%PY% -m pip install pywin32
%PY% run_service.py --startup auto install
if errorlevel 1 ( echo [ERROR] No se pudo instalar el servicio. & pause & exit /b 1 )
%PY% run_service.py start

echo.
echo Servicio "ClassroomControlSvc" instalado e iniciado.
echo El agente arrancara en la sesion del alumno y no podra cerrarse
echo sin permisos de administrador.
pause
