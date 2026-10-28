# Validación MiAula 2.4.4 · Equipos manuales

## Cambio principal
- Equipos ya no depende de la asistencia del día.
- El modo automático usa todos los alumnos activos del grupo.
- El modo manual usa todos los alumnos activos del grupo y permite asignarlos uno por uno.
- Se excluyen únicamente alumnos dados de baja y alumnos marcados Pendiente Secretaría.
- Los equipos siguen guardándose en `meta` por grupo.
- Limpiar equipos no elimina calificaciones ni proyectos.

## Constructor manual
- Permite añadir/quitar equipos.
- Permite elegir equipo para cada alumno desde una lista completa.
- Máximo 3 integrantes por equipo.
- No permite guardar equipos de un solo integrante.
- No permite guardar mientras existan alumnos sin asignar.
- Puede cargar la distribución guardada para editarla.

## Persistencia
- IndexedDB conserva el mismo nombre y versión.
- `db.js` no fue modificado.
- No se agregaron ni eliminaron stores.
- La distribución se guarda en `meta` con clave `savedTeams:<groupId>`.
