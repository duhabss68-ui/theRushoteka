; ============================================================
;  Instalador del AGENTE cliente de ClassroomControl (Inno Setup)
;  Compilar con Inno Setup:  ISCC.exe installer\ClassroomClient.iss
;
;  Antes de compilar, deben existir:
;    ..\dist\ClassroomClient.exe      (build_client.bat)
;    ..\dist\ClassroomWatchdog.exe    (build_watchdog.bat)
;    installer\client.ini             (configurado: IP del profesor + token)
;    installer\server.crt             (opcional, solo si usas TLS)
;
;  Se instala en C:\ClassroomControl (sin espacios, para la tarea programada)
;  y registra el vigilante para que arranque al iniciar sesion.
; ============================================================

#define AppName "ClassroomControl Agente"
#define AppVer "1.0.0"
#define TaskName "ClassroomControl Agent"

[Setup]
AppName={#AppName}
AppVersion={#AppVer}
DefaultDirName={sd}\ClassroomControl
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputBaseFilename=ClassroomClient-Setup
Compression=lzma2
SolidCompression=yes
Uninstallable=yes

[Files]
Source: "..\dist\ClassroomClient.exe";   DestDir: "{app}"; Flags: ignoreversion
Source: "..\dist\ClassroomWatchdog.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "client.ini";                    DestDir: "{app}"; Flags: ignoreversion
Source: "server.crt";                    DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Run]
; Registra la tarea que arranca el vigilante al iniciar sesion (se reinicia solo).
Filename: "schtasks"; \
  Parameters: "/create /tn ""{#TaskName}"" /tr ""{app}\ClassroomWatchdog.exe"" /sc onlogon /rl highest /f"; \
  Flags: runhidden
; Lo inicia inmediatamente tras instalar.
Filename: "{app}\ClassroomWatchdog.exe"; Flags: nowait runhidden

[UninstallRun]
Filename: "schtasks"; Parameters: "/delete /tn ""{#TaskName}"" /f"; Flags: runhidden; RunOnceId: "DelTask"
Filename: "taskkill";  Parameters: "/im ClassroomWatchdog.exe /f"; Flags: runhidden; RunOnceId: "KillWd"
Filename: "taskkill";  Parameters: "/im ClassroomClient.exe /f";   Flags: runhidden; RunOnceId: "KillCl"
