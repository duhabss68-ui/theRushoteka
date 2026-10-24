@echo off
REM Compila AMBOS ejecutables (consola y cliente), uno tras otro.
setlocal
cd /d "%~dp0"
call "%~dp0build_admin.bat"
call "%~dp0build_client.bat"
echo.
echo Ambos ejecutables estan en la carpeta  dist\
pause
