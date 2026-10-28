# Validación · MiAula Slate 2.13.0 · Prepa

## Revisiones previas
- `node --check` de `app.js`, `sw.js`, `xlsx-lite.js`, `rubricas.js` y `autobackup.js`: correcto.
- `cmp db.js` contra 2.12.0: **idéntico**.
- IDs del HTML: no se quitó ninguno; se agregaron `autoBackupChip` y `autoBackupPanel`.
- Versión 2.13.0 en `index.html`, `sw.js` (caché `miaula-prepa-2.13.0`, incluye `autobackup.js`), manifest, registro del service worker y nombre del respaldo.
- `tools/build_single.py` genera `dist/MiAula_Prepa_2.13.0.html` (≈745 KB) sin referencias externas.

## Suites
| Suite | Resultado |
|---|---|
| `node --test tests/rubricas.test.js` | 17/17 |
| `regresion.e2e.js` | 36/36 * |
| `miaula.e2e.js` | 33/33 |
| `proyecto.e2e.js` | 19/19 |
| `cierre.e2e.js` | 13/13 |
| `lista-asistencia.e2e.js` | 15/15 |
| `cambio-parcial.e2e.js` | 11/11 |
| `asistencia-parcial.e2e.js` | 41/41 |
| `rubros.e2e.js` | 31/31 |
| `autocopia.e2e.js` (nueva, con `SINGLE=dist/MiAula_Prepa_2.13.0.html`) | 25/25 |

\* Cambio intencional: la prueba del botón de tema ahora espera que la app inicie en claro (tema Alegre) y que el botón pase a oscuro y regrese.

`autocopia.e2e.js` cubre: tema claro por omisión, chip y panel, versión interna sin destino, carpeta (última copia + copia del día, formato de respaldo), espera tras el último cambio, copia tras cambios por código y por la pantalla de asistencia, sin reescritura si nada cambió, pausa de seguridad y «Guardar de todos modos», versiones internas y restauración, descargas automáticas con intervalo, preferencia de tema oscuro y versión de un solo archivo (abre por file://, guarda datos tras recargar, no pide otros archivos, sin service worker, sin errores).

La carpeta se prueba con una API simulada (el selector del sistema no se puede abrir en un navegador sin pantalla). En Chrome/Edge reales el navegador pide el permiso la primera vez y puede pedirlo de nuevo al reabrir («Toca para reactivar copia»).

## Capturas
Revisadas en tema claro y «Noche alegre», en tablet horizontal (1340×860) y celular (390×844): Inicio, Asistencia, Cuaderno, Administración y panel de Respaldo (también desde el HTML de un solo archivo).
