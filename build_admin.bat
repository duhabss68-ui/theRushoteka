@echo off
REM ============================================================
REM  Compila la CONSOLA del profesor -> dist\ClassroomAdmin.exe
REM  Ejecutar en Windows con Python instalado. Doble clic basta.
REM ============================================================
setlocal
cd /d "%~dp0"

echo.
echo ===========================================
echo  Compilando ClassroomAdmin.exe (consola)
echo ===========================================
echo.

REM Usa el lanzador "py" si existe; si no, "python".
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

%PY% -m PyInstaller --noconfirm --clean --onefile --noconsole --name ClassroomAdmin --icon assets\admin.ico run_admin.py
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la compilacion. Revisa los mensajes anteriores.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  LISTO: dist\ClassroomAdmin.exe
echo  Copia ese .exe y tu admin.ini a la carpeta del profesor.
echo ============================================================
pause
