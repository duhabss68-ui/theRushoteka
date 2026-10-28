# Validación · MiAula Slate 2.12.0 · Prepa

## Revisiones previas
- `node --check` de `app.js`, `sw.js`, `xlsx-lite.js` y `rubricas.js`: correcto.
- `db.js`: único cambio intencional, el nombre de la base (`MiAulaMobileDB` → `MiAulaPrepaDB`), para no mezclarse con MiAula CETIS en el mismo sitio.
- IDs del HTML: no se quitó ninguno; se agregaron `customRubrosBox`, `customRubrosList`, `addCustomRubro`, `activityRubroLabel` y `activityRubro`.
- Versión 2.12.0 en `index.html`, `sw.js` (caché `miaula-prepa-2.12.0`), `manifest.webmanifest`, registro del service worker y nombre del respaldo.

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
| `rubros.e2e.js` (nueva) | 31/31 |

\* Se ajustó una prueba de forma intencional: antes exigía que el % de Asistencia fuera de solo lectura; en la edición Prepa es editable.

`rubros.e2e.js` cubre: crear rubros, validar nombre y total 100%, final Pendiente sin datos, captura directa (tabla, cuaderno con autoguardado, Vista alumno), actividades que cuentan en un rubro, cálculo de la final, recálculo en vivo, Excel (libreta, Esquemas, Calificación parcial), exportación «para cierre», quitar un rubro sin perder datos, Asistencia 0%, copia de rubros al parcial siguiente, parcial cerrado intacto, respaldo y base de datos propia.

## Capturas
Revisadas en tema oscuro y claro, en tablet horizontal (1340×860) y celular (390×844): esquema con rubros, tabla del parcial, nueva actividad y cuaderno.
