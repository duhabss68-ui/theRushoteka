# Validación · MiAula Slate 2.14.0 · Prepa

## Revisiones previas
- `node --check` de `app.js`, `sw.js`, `xlsx-lite.js`, `rubricas.js`, `autobackup.js` y `theme.js`: correcto.
- `db.js` sin cambios.
- IDs del HTML: se agregaron `appearancePanel`, `appearancePanelBody` y `activityRubroHelp`. Se quitó la lista `select[name=activity_type]`: el campo sigue en el formulario como oculto (`Trabajo`).
- Versión 2.14.0 en `index.html`, `sw.js` (caché `miaula-prepa-2.14.0`, incluye `theme.js`), manifest, registro del service worker y nombre del respaldo.

## Suites
| Suite | Resultado |
|---|---|
| `node --test tests/rubricas.test.js` | 17/17 |
| `regresion.e2e.js` | 36/36 |
| `miaula.e2e.js` | 33/33 |
| `proyecto.e2e.js` | 19/19 |
| `cierre.e2e.js` | 13/13 |
| `lista-asistencia.e2e.js` | 15/15 |
| `cambio-parcial.e2e.js` | 11/11 |
| `asistencia-parcial.e2e.js` | 41/41 |
| `rubros.e2e.js` | 31/31 * |
| `autocopia.e2e.js` | 25/25 |
| `apariencia.e2e.js` (nueva) | 23/23 |
| `edicion-palencia.e2e.js` | 21/21 ** |

\* Cambio intencional: la lista «Rubro» ya no se oculta cuando no hay rubros «Con actividades»; ahora ofrece solo Trabajos y muestra cómo crear más.
\** La prueba ya no depende del número de versión.

## Capturas
Revisadas en Alegre claro, Guinda claro y oscuro, y Personalizado (verde azulado claro, azul oscuro): Inicio, Apariencia y Nueva actividad. Contraste correcto en los botones (texto blanco sobre el color principal).
