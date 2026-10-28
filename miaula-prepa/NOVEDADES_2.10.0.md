# MiAula Slate 2.10.0 · Lista de asistencia tradicional

**Dónde:** Historial de asistencia → «Lista de asistencia (Excel)», o Administración → «Lista de asistencia tradicional».

**Formato** (como la lista de papel):
- No. y NOMBRE DEL ALUMNO en mayúsculas, por número de lista. Los dados de baja no aparecen.
- «A S I S T E N C I A S» con una columna por fecha registrada: la letra del día (L M M J V) y la fecha completa en vertical.
- Marcas:
  - «.» asistencia
  - «/» falta (en rojo)
  - «J» justificada (en azul)
  - «R» retardo
  - «S» pendiente con Secretaría
- Totales: Asistencias, Retardos, Faltas justificadas, Faltas injustificadas, % Asistencia y % Faltas (en rojo al llegar al 20%).
- **Después de las asistencias, la calificación:** Parcial 1, 2 y 3 y Promedio. «Pend.» indica que le falta algún componente.
- Bordes, columnas No./Nombre fijas, hoja horizontal ajustada a lo ancho para imprimir, notas y línea de firma.

**Opciones al generar:**
- Fechas: todas o solo un periodo (desde / hasta).
- Contar por **horas de clase** (igual que MiAula y la regla del 20%) o por **sesiones** (una marca por día).
- Calificación **como está** o **para cierre** (actividades sin calificación = 0; NP y rúbricas a medias igual).

**Técnico:**
- xlsx-lite.js se amplió con formato opcional (bordes, texto vertical, celdas combinadas, anchos). Los demás Excel salen idénticos; solo se agregaron estilos nuevos.
- db.js idéntico. No se modifica ningún dato al exportar.
