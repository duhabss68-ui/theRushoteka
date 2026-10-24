@echo off
REM Genera server.crt y server.key para el cifrado TLS (doble clic).
setlocal
cd /d "%~dp0"
where py >nul 2>&1 && (set "PY=py -3") || (set "PY=python")
%PY% -m pip install cryptography
%PY% tools\generate_cert.py dist
echo.
echo Hecho. En la carpeta  dist\  tienes:
echo    server.key  -> queda SOLO en el equipo del profesor (junto a admin.ini)
echo    server.crt  -> copialo a CADA cliente (junto a client.ini)
pause
