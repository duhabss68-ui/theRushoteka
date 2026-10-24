@echo off
REM =============================================================
REM  Compila el AGENTE del alumno -> dist\ClassroomClient.exe
REM  Ejecutar en Windows con Python instalado. Doble clic basta.
REM =============================================================
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  Compilando ClassroomClient.exe (cliente)
echo ============================================
echo.

where py >nul 2>&1 && (set "PY=py -3") || (set "PY=python")

%PY% -m pip install --upgrade pip
%PY% -m pip install -r requirements.txt pyinstaller
if errorlevel 1 (
    echo.
    echo [ERROR] No se pudieron instalar las dependencias. Revisa que Python
    echo         este instalado y en el PATH, y vuelve a intentarlo.
    pause
    exit /b 1
)

REM --collect-all pyautogui incluye sus modulos auxiliares (evita fallos al
REM arrancar el .exe por imports que PyInstaller no detecta automaticamente).
%PY% -m PyInstaller --noconfirm --clean --onefile --noconsole --name ClassroomClient --icon assets\client.ico --collect-all pyautogui run_client.py
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la compilacion. Revisa los mensajes anteriores.
    pause
    exit /b 1
)

echo.
echo =============================================================
echo  LISTO: dist\ClassroomClient.exe
echo  Copia ese .exe y tu client.ini a cada equipo de alumno.
echo =============================================================
pause
