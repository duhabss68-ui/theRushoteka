# Validación MiAula Slate 2.4.2

## Persistencia
- `db.js` es idéntico byte por byte a MiAula 2.4.1.
- Base: `MiAulaMobileDB`, versión 3, sin migración.
- El estado `secretary_pending` se añade como propiedad opcional del registro existente del alumno; IndexedDB admite estos campos sin cambiar el store.
- Los respaldos existentes siguen siendo compatibles.

## Asistencia
- Nueva lista: estado inicial F para cada alumno sin registro previo.
- Registro previo: se conserva P/F/R/J/S existente.
- S = Pendiente Secretaría.
- `attendanceTotals()` excluye S tanto del numerador como del denominador del porcentaje.
- P/R/J cuentan como asistencia según la lógica previa; F cuenta como inasistencia.
- El Historial permite corregir registros sin recrearlos.

## Secretaría
- Marcar Pendiente Secretaría no elimina información.
- El alumno permanece activo hasta resolución.
- En futuros pases queda identificado automáticamente y no requiere volver a marcarse.
- Resolver "Sigue en el grupo" conserva los registros S para corrección posterior.
- Resolver "Dar de baja" usa la baja existente y conserva historial.

## PWA
- Cache actualizado a `miaula-mobile-2.4.2`.
- Recursos versionados con `?v=2.4.2`.
- Navegación continúa usando network-first para detectar actualizaciones.

## Pruebas estáticas
- `app.js`, `db.js`, `sw.js`, `xlsx-lite.js`: sintaxis JavaScript validada.
- No se eliminó ningún ID funcional del HTML de 2.4.1.
- IDs nuevos sin duplicados.
