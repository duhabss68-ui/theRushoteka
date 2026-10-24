# Despliegue a escala (40+ equipos)

Tres niveles, de lo más sencillo a lo más automatizado.

## Nivel 1 — Tarea programada (sin instalador)

Copia a cada equipo (en `C:\ClassroomControl`) los `.exe` y su `.ini`, y
ejecuta **como administrador**:

```bat
installer\install_client_task.bat
```

Registra el **vigilante** (`ClassroomWatchdog.exe`) para que arranque al
iniciar sesión y relance el agente si se cierra. Para quitarlo:
`installer\uninstall_client_task.bat`.

## Nivel 2 — Instalador .exe (Inno Setup)

Genera un único `ClassroomClient-Setup.exe` que instala, configura y registra
la tarea de una sola vez por equipo.

1. Compila los ejecutables: `build_client.bat` y `build_watchdog.bat`
   (y `build_admin.bat` para la consola). Quedan en `dist\`.
2. Crea `installer\client.ini` (copia de `config\client.example.ini` con la IP
   del profesor y el token). Si usas TLS, pon también `installer\server.crt`.
3. Instala [Inno Setup](https://jrsoftware.org/isdl.php) y compila:

   ```bat
   ISCC.exe installer\ClassroomClient.iss
   ISCC.exe installer\ClassroomAdmin.iss
   ```

4. Reparte `Output\ClassroomClient-Setup.exe` a los equipos de alumno y
   `Output\ClassroomAdmin-Setup.exe` al del profesor. El del cliente registra
   solo el arranque automático.

El cliente se instala en `C:\ClassroomControl` y la consola en
`C:\ClassroomControl-Admin`. Desinstalar desde *Agregar o quitar programas*
elimina la tarea y detiene el agente.

## Nivel 3 — Despliegue por dominio (GPO / Active Directory)

Si el aula está en un dominio, distribuye el `ClassroomClient-Setup.exe` (o un
MSI equivalente) mediante **Directiva de grupo → Instalación de software**, o
un **script de inicio** de GPO que ejecute el instalador en modo silencioso:

```bat
ClassroomClient-Setup.exe /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
```

Así se instala en los 40 equipos sin tocarlos uno a uno.

## Firma de código (recomendado)

Los `.exe` sin firmar activan SmartScreen y algunos antivirus. Si el centro
dispone de un certificado de firma de código, firma cada ejecutable:

```bat
signtool sign /fd SHA256 /a /tr http://timestamp.digicert.com /td SHA256 dist\ClassroomClient.exe
```

(Repite para `ClassroomAdmin.exe` y `ClassroomWatchdog.exe`.) Sin certificado,
añade una excepción en el antivirus del centro para la carpeta de instalación.

## Nota honesta sobre el bloqueo "a prueba de todo"

El vigilante corre en la sesión del usuario para que la interfaz y la captura
funcionen; un alumno **con permisos de administrador** aún podría detenerlo.
Para un control inviolable haría falta un **Servicio de Windows** en la sesión
0 que lance el agente en la sesión del alumno (vía `CreateProcessAsUser`). Es
la siguiente mejora natural; para cuentas de alumno estándar (lo habitual), el
vigilante + tarea ya impide el cierre casual y cubre caídas.
