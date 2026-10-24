@echo off
REM Compila el MSI del agente (para GPO) con WiX Toolset v3 (candle + light).
REM Requisitos: dist\ClassroomClient.exe, dist\ClassroomWatchdog.exe e
REM             installer\client.ini. WiX Toolset debe estar en el PATH.
setlocal
cd /d "%~dp0"
if not exist build mkdir build

where candle >nul 2>&1 || (echo [ERROR] No encuentro 'candle'. Instala WiX Toolset v3 y añádelo al PATH. & pause & exit /b 1)

candle installer\ClassroomClient.wxs -o build\ClassroomClient.wixobj
if errorlevel 1 ( echo [ERROR] candle fallo. & pause & exit /b 1 )
light build\ClassroomClient.wixobj -o build\ClassroomClient.msi
if errorlevel 1 ( echo [ERROR] light fallo. & pause & exit /b 1 )

echo.
echo LISTO: build\ClassroomClient.msi
echo Despliegalo por GPO (Instalacion de software) o:  msiexec /i ClassroomClient.msi /qn
pause
