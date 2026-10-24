@echo off
REM Quita la tarea del agente y detiene los procesos. Ejecutar como ADMINISTRADOR.
setlocal
net session >nul 2>&1 || (echo Debes ejecutar este script como ADMINISTRADOR. & pause & exit /b 1)

set "TASK=ClassroomControl Agent"
schtasks /end /tn "%TASK%" >nul 2>&1
schtasks /delete /tn "%TASK%" /f
taskkill /im ClassroomWatchdog.exe /f >nul 2>&1
taskkill /im ClassroomClient.exe /f >nul 2>&1
echo.
echo Tarea eliminada y agente detenido.
pause
