@echo off
REM Quita el Servicio de Windows del agente. Ejecutar como ADMINISTRADOR.
setlocal
net session >nul 2>&1 || (echo Debes ejecutar este script como ADMINISTRADOR. & pause & exit /b 1)
cd /d "%~dp0\.."
where py >nul 2>&1 && (set "PY=py -3") || (set "PY=python")
%PY% run_service.py stop
%PY% run_service.py remove
taskkill /im ClassroomClient.exe /f >nul 2>&1
echo.
echo Servicio eliminado y agente detenido.
pause
