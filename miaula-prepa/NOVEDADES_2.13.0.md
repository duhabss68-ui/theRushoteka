# MiAula Slate 2.13.0 · Prepa — Novedades

## 1. Versión de un solo archivo HTML
- `dist/MiAula_Prepa_2.13.0.html` trae **todo adentro** (estilos, programa e iconos). Se abre con **doble clic** en Chrome, Edge o Firefox, sin internet y sin servidor.
- Se puede copiar a una USB, mandar por correo o guardar en OneDrive/Drive.
- Los datos quedan en el navegador de esa computadora (IndexedDB). Por eso viene la copia automática.
- Se genera con `python3 tools/build_single.py` (no hay que editar el HTML a mano).
- La versión para GitHub Pages (PWA instalable) sigue igual.

## 2. Copia automática en cada cambio
Más → **Respaldo → Copia automática**, o el botón del escudo en la barra superior.

| Opción | Dónde funciona | Qué hace |
|---|---|---|
| **Elegir carpeta de copias** (recomendada) | Chrome y Edge en PC | En cada cambio guarda `MiAula_Prepa_ultima_copia.json` y además una copia por día (`MiAula_Prepa_copia_AAAA-MM-DD.json`). |
| Elegir archivo de copia | Navegadores que solo permiten elegir un archivo | Sobrescribe ese archivo en cada cambio. |
| **Descargas automáticas** | Cualquier navegador (tablet, celular, Firefox) | Descarga un .json cuando hay cambios, como máximo cada 5–60 min (lo eliges). |

- Espera **2.5 s** después del último cambio (no escribe en cada tecla) y no vuelve a escribir si nada cambió.
- Las copias tienen **el mismo formato** que «Crear respaldo», así que se restauran con **Restaurar respaldo** (también en MiAula CETIS).
- **Pausa de seguridad:** si de golpe desaparece más de la mitad de los alumnos, calificaciones, asistencias, actividades o grupos, la copia del archivo **no se sobrescribe**. Aparece «Copia en pausa» y el botón «Guardar de todos modos».
- **Versiones internas:** en cualquier modo se guardan solas las últimas 20 versiones (máximo una cada 10 minutos, más una antes de cada pausa o restauración). Se pueden descargar o restaurar. Viven en una base aparte (`MiAulaPrepaAutoCopias`), así que no cambian los datos ni los respaldos.
- Al reabrir el navegador, Chrome puede pedir otra vez el permiso de la carpeta: el chip dice «Toca para reactivar copia».
- Cada copia correcta actualiza el recordatorio de «Último respaldo».

## 3. Tema «Alegre»
- **Claro (por omisión):** fondo crema cálido con manchas de color suaves, morado como color principal, botones con degradado morado→rosa y una línea de colores bajo la barra superior.
- **«Noche alegre» (oscuro):** índigo profundo con los mismos acentos.
- Cada acceso tiene su color (Asistencia verde menta, Cuaderno azul cielo, Ruleta coral, Equipos rosa, Más amarillo), igual que las tarjetas de Inicio y de Administración.
- KPIs con fondos de color, calificación final con degradado verde-azul y estados P/F/R/J con colores vivos (siempre con su letra).
- Contraste revisado en los dos temas, en tablet y en celular. Las áreas táctiles y la estructura no cambiaron.

## Técnico
- `autobackup.js` (nuevo) envuelve los métodos que escriben en `MiAulaDB` (`put`, `add`, `remove`, `restoreBackup`…). **`db.js` no cambió.**
- No hay almacenes nuevos en `MiAulaPrepaDB`. Los respaldos son compatibles.
- El service worker no se registra en la versión de un solo archivo (`window.MIAULA_SINGLE_FILE`).
