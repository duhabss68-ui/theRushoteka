# Validación MiAula 2.11.0

- Nueva: asistencia por parcial, Asistencia 10% y modo consulta (tests/e2e/asistencia-parcial.e2e.js): 41/41.
  - Simula el caso real: Parcial 1 cerrado, asistencia de versiones anteriores sin `period` y Parcial 2 en curso.
- Regresión 36/36.
- Lista de asistencia 15/15.
- Cierre 13/13.
- Proyecto 19/19.
- Rúbricas y equipos 33/33.
- Cambio de parcial 11/11.
- Lógica 17/17.
- Pruebas ajustadas a la nueva regla (antes contaban Valores/Actitudes en el parcial abierto): regresión, cambio de parcial, cierre y lista de asistencia. Las dos últimas ahora usan el Parcial 1 cerrado, que es el caso real, y siguen obteniendo las mismas calificaciones.
- db.js idéntico.
- No hay cambio de base de datos: solo se agregan campos (`period` en asistencia; `period_closures` en grupo; `attendance_pct` en esquema).
