@echo off
REM ============================================================
REM  Registra el agente (vigilante) para que arranque solo al
REM  iniciar sesion y se reinicie si se cierra. Ejecutar como
REM  ADMINISTRADOR en cada equipo de alumno.
REM
REM  Uso:  install_client_task.bat ["C:\ruta\a\la\carpeta"]
REM  (por defecto C:\ClassroomControl)
REM ============================================================
setlocal
net session >nul 2>&1 || (echo Debes ejecutar este script como ADMINISTRADOR. & pause & exit /b 1)

set "APPDIR=C:\ClassroomControl"
if not "%~1"=="" set "APPDIR=%~1"
set "TASK=ClassroomControl Agent"

if not exist "%APPDIR%\ClassroomWatchdog.exe" (
    echo [ERROR] No encuentro "%APPDIR%\ClassroomWatchdog.exe".
    echo Copia primero los .exe y el client.ini a esa carpeta.
    pause
    exit /b 1
)

schtasks /create /tn "%TASK%" /tr "\"%APPDIR%\ClassroomWatchdog.exe\"" /sc onlogon /rl highest /f
if errorlevel 1 ( echo [ERROR] No se pudo crear la tarea programada. & pause & exit /b 1 )

echo.
echo Tarea "%TASK%" creada: el agente arrancara al iniciar sesion
echo y se reiniciara solo si se cierra. Lo inicio tambien ahora.
start "" "%APPDIR%\ClassroomWatchdog.exe"
pause
