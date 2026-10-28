@echo off
setlocal
chcp 65001 >nul
title MiAula 2.0 - Migrar datos a Tablet
cd /d "%~dp0"
echo ================================================
echo       MIAULA 2.0 - EXPORTAR DATOS A TABLET
echo ================================================
echo.
where py >nul 2>&1
if not errorlevel 1 (set "PY=py") else (
  where python >nul 2>&1
  if errorlevel 1 (
    echo No encuentro Python. Puedes ejecutar esta herramienta desde
    echo una computadora donde ya funcione MiAula 2.4.1.
    pause
    exit /b 1
  )
  set "PY=python"
)
set "PICK=%TEMP%\miaula_db_path.txt"
powershell -NoProfile -STA -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Windows.Forms; $f=New-Object System.Windows.Forms.OpenFileDialog; $f.Filter='Base MiAula (aula_agil.db)|aula_agil.db|Base de datos (*.db)|*.db|Todos (*.*)|*.*'; $f.Title='Selecciona data\aula_agil.db de MiAula 2.4.1'; if($f.ShowDialog() -eq 'OK'){[IO.File]::WriteAllText('%PICK%',$f.FileName)}"
if not exist "%PICK%" (
  echo No seleccionaste una base de datos.
  pause
  exit /b 1
)
set /p DB=<"%PICK%"
del "%PICK%" >nul 2>&1
"%PY%" "%~dp0exportar_desde_2_4_1.py" "%DB%" "%~dp0MiAula_Migracion.json"
if errorlevel 1 (
  echo.
  echo Ocurrio un error. Toma una foto de esta ventana.
  pause
  exit /b 1
)
echo.
echo LISTO. Se creo:
echo   %~dp0MiAula_Migracion.json
echo.
echo Copialo a tu tablet y en MiAula 2.0 abre:
echo   Mas ^> Restaurar / migrar respaldo
pause
