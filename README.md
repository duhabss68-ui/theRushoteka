# ClassroomControl

Software de **gestión de aula informática** para supervisar y controlar los
equipos de un aula de medios desde la máquina del profesor, dentro de la misma
red local. Mismo tipo de herramienta que Veyon, LanSchool o NetSupport School,
escrito desde cero en Python.

Pensado para **Windows** (los equipos de alumno y la consola del profesor),
aunque el núcleo es portable.

---

## ⚠️ Uso responsable (léelo primero)

Esta herramienta está diseñada para **administración transparente de equipos
institucionales** en un laboratorio, con autoridad del centro educativo y
**conocimiento de los usuarios**:

- El agente cliente muestra un **indicador visible** mientras está conectado
  ("Equipo supervisado por el profesor") y otro distinto durante el control
  remoto ("Control remoto activo"). No lo ocultes: la transparencia es parte
  del diseño.
- Despliégalo solo en equipos propiedad de la institución y comunícalo a los
  usuarios (cartel en el aula, normativa, consentimiento según corresponda).
- No es software de vigilancia encubierta. Usarlo para espiar personas sin su
  conocimiento puede ser ilegal y no es el propósito de este proyecto.

---

## Características

- **Rejilla en vivo** de hasta 40 (o más) equipos, con miniaturas que se
  refrescan continuamente.
- **Vista ampliada** al hacer clic en un equipo, con mayor resolución y FPS.
- **Control remoto** de ratón y teclado del equipo seleccionado.
- **Bloqueo total** (inmovilizar teclado y ratón) con mensaje a pantalla
  completa, individual o masivo; se libera solo si cae la conexión.
- **Proyección de la pantalla del profesor** a todos los alumnos (broadcast).
- **Mensaje de atención** a pantalla completa (a un equipo o a todos).
- **Apagar / Reiniciar / Cerrar sesión** (individual o masivo).
- **Detección de caídos** (latido): los equipos sin respuesta se marcan
  **"SIN SEÑAL"** y se depuran automáticamente.
- **Registro a fichero** (`.log`) y captura global de errores: el programa no
  "muere en silencio" aunque sea un `.exe` sin consola.
- **Arranque automático con vigilante** (se reinicia solo si se cierra) e
  **instalador** para desplegar en 40 equipos.
- **Interfaz moderna con tema claro y oscuro** (sigue al sistema operativo y se
  alterna en caliente), tarjetas e indicadores de estado por **forma y color**
  (accesible a daltónicos).
- **Autenticación** por token precompartido (desafío-respuesta HMAC-SHA256):
  un equipo cualquiera de la red no puede conectarse a la consola.
- Reconexión automática del cliente si la consola aún no está disponible.

### Nota sobre "streaming en vivo" y los 40 equipos

Transmitir 40 pantallas a máxima calidad saturaría una LAN de aula. La
solución (igual que Veyon): la **rejilla** usa fotogramas a baja resolución y
pocos FPS (en vivo, pero ligeros), y al **enfocar** un equipo concreto ese
cliente sube automáticamente a alta calidad/FPS. Todo es configurable en los
`.ini`.

---

## Arquitectura

```
          ┌─────────────────────────┐
          │   Consola del profesor  │   run_admin.py
          │   (AdminServer + GUI)    │   escucha en TCP 47800
          └───────────▲─────────────┘
                      │  los clientes se CONECTAN al profesor
      ┌───────────────┼───────────────┬───────────────┐
      │               │               │               │
┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
│ Alumno 01 │   │ Alumno 02 │   │ Alumno 03 │ … │ Alumno 40 │   run_client.py
└───────────┘   └───────────┘   └───────────┘   └───────────┘
```

Los clientes se conectan **hacia** el profesor, así solo hay que configurar en
cada equipo la IP de la consola (admiten IP dinámica por DHCP y reconectan
solos).

```
classroom_control/
├── protocol.py        # Trama TCP: MAGIC | len | json | blob  (control + fotogramas)
├── security.py        # Autenticación HMAC-SHA256 por desafío-respuesta
├── config.py          # Carga de client.ini / admin.ini
├── tlsutil.py         # Cifrado TLS opcional (contextos servidor/cliente)
├── logutil.py         # Registro a fichero + captura global de errores
├── client/
│   ├── agent.py       # Conexión, transmisión y ejecución de órdenes
│   ├── screen.py      # Captura de pantalla (mss) + JPEG (Pillow)
│   ├── inputctl.py    # Inyección de ratón/teclado (pyautogui)
│   ├── overlay.py     # Indicador, mensaje, bloqueo y proyección (Tkinter)
│   ├── power.py       # Apagar/reiniciar/cerrar sesión (shutdown de Windows)
│   └── watchdog.py    # Vigilante: relanza el agente si se cierra
└── admin/
    ├── server.py      # Clientes, autenticación, fotogramas, latido, órdenes
    ├── console.py     # Interfaz: rejilla, vista ampliada, control, proyección
    └── theme.py       # Tema visual claro/oscuro (sigue al sistema) + estilos ttk
```

---

## Instalación

En **cada** equipo (profesor y alumnos):

1. Instala Python 3.9+ desde python.org (marca *"Add Python to PATH"* y deja
   activada la opción de **tcl/tk** — incluye Tkinter).
2. Instala las dependencias:

   ```bat
   pip install -r requirements.txt
   ```

   Tkinter no se instala con pip: viene con el instalador oficial de Python.

---

## Configuración

Elige un **token** largo y aleatorio, igual en todos los equipos. Mantenlo en
secreto (los ficheros reales `*.ini` están en `.gitignore`).

**Profesor** — copia `config/admin.example.ini` a `config/admin.ini`:

```ini
[admin]
listen_host = 0.0.0.0
listen_port = 47800
token = AQUI-UN-TOKEN-LARGO-Y-SECRETO
columns = 8
```

**Alumnos** — copia `config/client.example.ini` a `config/client.ini` y pon la
IP del profesor:

```ini
[client]
admin_host = 192.168.1.10   ; IP de la consola del profesor
admin_port = 47800
token = AQUI-UN-TOKEN-LARGO-Y-SECRETO
show_indicator = true
```

---

## Uso

1. En el equipo del profesor:

   ```bat
   python run_admin.py
   ```

   Se abre la consola y queda a la escucha.

2. En cada equipo de alumno:

   ```bat
   python run_client.py
   ```

   Aparecerá el indicador de supervisión y el equipo saldrá en la rejilla.

3. En la consola:
   - **Clic** en un equipo → vista ampliada.
   - **🖱 Tomar control** → manejas su ratón/teclado (el equipo avisa en rojo).
   - **📡 Proyectar pantalla** → muestra la pantalla del profesor en todos.
   - **💬 Mensaje** → aviso a pantalla completa.
   - **⏻ / ↻ / ⎋** → apagar / reiniciar / cerrar sesión.
   - Barra superior → las mismas acciones para **todos** los equipos.

---

## Despliegue en 40 equipos

Opciones, de menor a mayor automatización:

1. **Carpeta compartida**: copia el proyecto a cada equipo (o ejecútalo desde
   una unidad de red) y crea `config/client.ini` con la IP del profesor.
2. **Arranque automático**: crea una tarea en el *Programador de tareas* de
   Windows que ejecute `pythonw run_client.py` al iniciar sesión (`pythonw`
   evita la ventana de consola negra).
3. **Ejecutable (.exe) — lo más fácil**: en un equipo con Windows y Python,
   haz **doble clic** en los scripts incluidos:

   - `build_all.bat` → genera ambos (`dist\ClassroomAdmin.exe` y
     `dist\ClassroomClient.exe`).
   - `build_admin.bat` / `build_client.bat` → generan uno u otro.

   Instalan las dependencias y PyInstaller automáticamente. Luego distribuye
   cada `.exe` junto a su `.ini` (`admin.ini` o `client.ini`) en la misma
   carpeta. Guía detallada en `docs/Guia_Instalacion_Paso_a_Paso.docx`.

**Cortafuegos**: permite el puerto TCP (47800 por defecto) en el equipo del
profesor. Todos los equipos deben estar en la misma red/subred.

**Instalador y arranque automático**: para desplegar de forma robusta (vigilante
que relanza el agente, tarea programada e instalador Inno Setup con despliegue
silencioso por GPO), consulta `installer/README.md`.

## Robustez y operación

- **Registro (.log)**: cada programa escribe un log rotativo junto a su
  ejecutable (`ClassroomAdmin.log`, `ClassroomClient.log`,
  `ClassroomWatchdog.log`). Cualquier error no controlado queda registrado y,
  en la consola, se muestra un diálogo — nada "muere en silencio".
- **Detección de caídos (latido)**: la consola envía PING periódicos; un equipo
  sin respuesta se marca **"SIN SEÑAL"** en la rejilla y se depura.
- **Vigilante (watchdog)**: `ClassroomWatchdog.exe` relanza el agente si se
  cierra o falla. Se instala como tarea al iniciar sesión (ver
  `installer/README.md`). Nota honesta: corre en la sesión del usuario (para que
  la interfaz y la captura funcionen), así que un alumno **administrador** aún
  podría detenerlo; para un bloqueo inviolable haría falta un servicio en
  sesión 0 (mejora documentada).

---

## Seguridad y límites (con honestidad)

- **Control de acceso**: el token HMAC impide que equipos ajenos se conecten.
- **Confidencialidad**: por defecto el contenido viaja **sin cifrar** (ideal
  para una LAN de aula cerrada). Puedes activar **cifrado TLS opcional** (ver
  abajo) para redes donde quieras proteger el tráfico frente a intermediarios.
- Cambia **siempre** el token por defecto.
- Los permisos `allow_remote_control` y `allow_power` permiten limitar por
  política lo que cada equipo acepta.

---

## Cifrado TLS (opcional)

Para cifrar todo el tráfico (TLS 1.2+, con el certificado del profesor fijado
en los clientes para evitar intermediarios):

1. En el equipo del profesor, genera el certificado (doble clic en
   `generate_cert.bat`, o `python tools/generate_cert.py dist`). Crea
   `server.key` (privado, solo en el profesor) y `server.crt` (público).
2. En `admin.ini`: `use_tls = true` (con `certfile`/`keyfile` apuntando a
   `server.crt`/`server.key`, que van junto al `.exe`).
3. Copia **solo** `server.crt` a cada cliente, junto a su `.exe`, y en
   `client.ini`: `use_tls = true` y `ca_cert = server.crt`.

El token HMAC sigue autenticando a los clientes; TLS añade la confidencialidad.

## Pruebas

El núcleo de red y autenticación se prueba sin GUI ni dependencias externas:

```bat
python tests/test_core.py
```

---

## Hoja de ruta (ideas de ampliación)

- Transferencia de archivos y lanzamiento remoto de aplicaciones.
- Descubrimiento automático de la consola por difusión UDP.
- Grabación/instantáneas de pantalla bajo política del centro.
