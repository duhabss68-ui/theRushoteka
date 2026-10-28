# Validación MiAula Slate 2.4.1

- `db.js` es idéntico a MiAula 2.4.0: no cambia IndexedDB, stores, índices ni claves.
- El historial de asistencia se corrige con `put()` sobre el mismo registro e ID; no se borra ni recrea el registro.
- El cálculo de seguimiento usa `class_hours`, por lo que una clase de 4 horas cuenta como 4 horas de asistencia/falta.
- El porcentaje de faltas se calcula como `horas F / horas registradas × 100`.
- R (retardo) y J (justificada) permanecen separados y, conforme a la lógica previa de MiAula, no se suman a F.
- Alerta preventiva: 15% a 19.9%.
- Alerta crítica: 20% o más.
- Exportar a Excel agrega Faltas %, alerta de asistencia y conteos de alumnos en seguimiento.
- Service Worker y recursos versionados actualizados a 2.4.1.
- `node --check` sin errores para app.js, db.js, xlsx-lite.js y sw.js.
