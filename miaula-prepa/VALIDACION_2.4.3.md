# Validación MiAula 2.4.3

## Persistencia
- Base: `MiAulaMobileDB` versión 3.
- `db.js` no fue modificado respecto a 2.4.2.
- No se agregaron stores ni se renombraron claves.
- Los equipos se guardan en el store existente `meta` con clave `savedTeams:<groupId>`.
- El store `meta` ya forma parte del respaldo/restauración, por lo que los equipos se incluyen sin cambiar el formato general del respaldo.

## Equipos
- Crear equipos guarda la distribución por grupo.
- Volver a la pantalla Equipos recupera la distribución guardada.
- Crear nuevos equipos reemplaza la distribución solo con confirmación.
- Limpiar equipos elimina únicamente la distribución guardada.
- Las calificaciones y evaluaciones previas permanecen intactas.

## Cuaderno por equipos
- El mismo Cuaderno Digital se reutiliza; no existe una base de calificaciones paralela.
- El filtro muestra únicamente los integrantes del equipo seleccionado.
- Anterior/Siguiente permite avanzar entre equipos.
- La calificación masiva de actividad escribe en el store existente `grades` y permite corrección individual posterior.
- NP también puede aplicarse al equipo.
- Los alumnos marcados Pendiente Secretaría se excluyen de acciones masivas.

## Proyecto
- El selector de equipo guardado marca automáticamente a los integrantes disponibles.
- El guardado usa el sistema existente de evaluaciones y rúbricas/listas de cotejo.
- Cada alumno recibe su registro individual con el mismo `team_name`, preservando ajustes posteriores.

## Compatibilidad
- Todos los IDs existentes en 2.4.2 permanecen en el HTML.
- `app.js`, `db.js`, `xlsx-lite.js` y `sw.js` pasan validación de sintaxis con Node.
- Service Worker actualizado a caché `miaula-mobile-2.4.3`.
