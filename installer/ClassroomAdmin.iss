; ============================================================
;  Instalador de la CONSOLA del profesor (Inno Setup)
;  Compilar:  ISCC.exe installer\ClassroomAdmin.iss
;
;  Antes de compilar, deben existir:
;    ..\dist\ClassroomAdmin.exe   (build_admin.bat)
;    installer\admin.ini          (configurado: token)
;    installer\server.crt / server.key  (opcional, solo si usas TLS)
;
;  Se instala en C:\ClassroomControl-Admin (escribible, para logs y config)
;  y crea accesos directos en el menú Inicio y el Escritorio.
; ============================================================

#define AppName "ClassroomControl Consola"
#define AppVer "1.0.0"

[Setup]
AppName={#AppName}
AppVersion={#AppVer}
DefaultDirName={sd}\ClassroomControl-Admin
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=admin
OutputBaseFilename=ClassroomAdmin-Setup
Compression=lzma2
SolidCompression=yes
Uninstallable=yes

[Files]
Source: "..\dist\ClassroomAdmin.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "admin.ini";                  DestDir: "{app}"; Flags: ignoreversion
Source: "server.crt";                 DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "server.key";                 DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\ClassroomControl Consola"; Filename: "{app}\ClassroomAdmin.exe"
Name: "{commondesktop}\ClassroomControl Consola"; Filename: "{app}\ClassroomAdmin.exe"

[Run]
Filename: "{app}\ClassroomAdmin.exe"; Description: "Abrir la consola ahora"; Flags: nowait postinstall skipifsilent
