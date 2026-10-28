# MiAula Slate 2.7.0 · Funciones profesionales

## Cuaderno
- **Teclado MiAula**: al tocar una celda aparece un teclado propio y el de Android ya no tapa la tabla.
  - Botones rápidos 10, 9, 8, 7, 6, 5, NP y Borrar. Al tocarlos, la calificación se guarda y pasa al siguiente alumno.
  - Dígitos para calificaciones manuales (8.5, etc.).
  - Flechas para moverse y "↓ Siguiente".
  - Se activa o desactiva con el botón "Teclado MiAula" de la barra del Cuaderno (preferencia local).
- **Guardado seguro al salir**: si cierras o minimizas MiAula justo después de escribir, el cambio se guarda en ese momento. El autoguardado (0.9 s) y Deshacer ya existían.

## Reportes PDF
- **Boleta por alumno** (Vista alumno → "Boleta PDF"): componentes con porcentaje y aporte, actividades del parcial, asistencia acumulada, puntos extra y líneas de firma.
- **Reporte de inasistencias para Secretaría** (Historial de asistencia → "Reporte para Secretaría (PDF)"): resumen, alumnos con 15% o más, pendientes de Secretaría, lista completa y firmas.
- Se generan desde el diálogo de impresión de la tablet ("Guardar como PDF" o imprimir).

## Inicio
- **Requiere atención**: alumnos con 15% o más de faltas (rojo con 20% o más), pendientes con Secretaría y actividades con calificaciones pendientes. Cada elemento abre la pantalla correspondiente.
- **Recordatorio de respaldo**: "Último respaldo: hace X días". Se pone en ámbar después de 7 días, con un botón "Respaldar ahora". También aparece en Administración.

## Ruleta
- Los segmentos muestran "?" para que sea sorpresa. Los que ya salieron muestran su número en gris.
- Confeti al revelar el nombre del alumno.

## Detalles
- Aviso fijo "Hay una versión nueva · Actualizar ahora" (guarda pendientes antes de recargar).
- Pantalla de inicio con el logo.
- Transición suave entre pantallas.
- Vibración breve al marcar asistencia y al usar el teclado, en dispositivos compatibles.

## Sin cambios
- db.js, xlsx-lite.js y styles-legacy.css idénticos a 2.4.9. IndexedDB, respaldo y lógica académica sin cambios.
- Las preferencias nuevas (teclado y fecha del último respaldo) viven en localStorage.
