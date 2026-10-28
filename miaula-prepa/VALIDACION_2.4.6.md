# Validación MiAula 2.4.6

- Base: MiAula Slate 2.4.5.
- `db.js` sin cambios: **True**.
- `xlsx-lite.js` sin cambios: **True**.
- IDs funcionales conservados: **True** (218 IDs; faltantes: ninguno).
- El constructor manual guarda un borrador en `meta` después de cada asignación, retiro o creación de equipo.
- Los equipos incompletos quedan persistentes y se cargan al volver a abrir el constructor.
- Solo equipos completos se habilitan para Libreta por equipos y Proyecto.
- `Limpiar equipos` sigue siendo la única acción que elimina la distribución.
- IndexedDB no cambia de versión ni de stores.
- Service Worker/cache actualizado a 2.4.6.
