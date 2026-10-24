@echo off
REM Compila el vigilante -> dist\ClassroomWatchdog.exe
setlocal
cd /d "%~dp0"
echo.
echo ============================================
echo  Compilando ClassroomWatchdog.exe
echo ============================================
echo.
where py >nul 2>&1 && (set "PY=py -3") || (set "PY=python")
%PY% -m pip install --upgrade pip
%PY% -m pip install pyinstaller
%PY% -m PyInstaller --noconfirm --clean --onefile --noconsole --name ClassroomWatchdog --icon assets\client.ico run_watchdog.py
if errorlevel 1 (
    echo [ERROR] Fallo la compilacion.
    pause
    exit /b 1
)
echo.
echo LISTO: dist\ClassroomWatchdog.exe
echo Copialo junto a ClassroomClient.exe en cada equipo de alumno.
pause
