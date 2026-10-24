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
- **Mensaje de atención** a pantalla completa (a un equipo o a todos).
- **Apagar / Reiniciar / Cerrar sesión** (individual o masivo).
- **Interfaz moderna** (tema oscuro, tarjetas, indicadores de estado por color).
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
├── client/
│   ├── agent.py       # Conexión, transmisión y ejecución de órdenes
│   ├── screen.py      # Captura de pantalla (mss) + JPEG (Pillow)
│   ├── inputctl.py    # Inyección de ratón/teclado (pyautogui)
│   ├── overlay.py     # Indicador visible + mensaje de atención (Tkinter)
│   └── power.py       # Apagar/reiniciar/cerrar sesión (shutdown de Windows)
└── admin/
    ├── server.py      # Acepta clientes, autentica, recibe fotogramas, envía órdenes
    └── console.py     # Interfaz: rejilla, vista ampliada, control, acciones
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

---

## Seguridad y límites (con honestidad)

- **Control de acceso**: el token HMAC impide que equipos ajenos se conecten.
- **Confidencialidad**: el contenido (fotogramas, pulsaciones) viaja **sin
  cifrar**. Es adecuado para una LAN de aula cerrada y de confianza. Para redes
  no confiables, despliega sobre VPN o añade una capa TLS (`ssl.wrap_socket`)
  —es una extensión natural del `protocol.py` actual.
- Cambia **siempre** el token por defecto.
- Los permisos `allow_remote_control` y `allow_power` permiten limitar por
  política lo que cada equipo acepta.

---

## Pruebas

El núcleo de red y autenticación se prueba sin GUI ni dependencias externas:

```bat
python tests/test_core.py
```

---

## Hoja de ruta (ideas de ampliación)

- Capa TLS opcional para cifrado de extremo a extremo.
- Transferencia de archivos y lanzamiento remoto de aplicaciones.
- Descubrimiento automático de la consola por difusión UDP.
- Grabación/instantáneas de pantalla bajo política del centro.
