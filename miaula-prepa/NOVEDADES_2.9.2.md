# MiAula Slate 2.9.2 · Exportación para cierre de evaluación

Al tocar **Generar Excel** (Cuaderno) o **Exportar todo a Excel** (Administración), MiAula pregunta cómo exportar:

- **Como está**: igual que siempre; las actividades sin calificación quedan en blanco.
- **Para cierre de evaluación**:
  - Las actividades **sin calificación** salen en **0**.
  - Ese 0 **cuenta** en el promedio de trabajos y en la calificación final del archivo.
  - **NP** se exporta como «NP» y no cuenta en el promedio (igual que en MiAula).
  - Las **rúbricas a medias** se exportan como «N de M criterios» y no cuentan.
  - Los alumnos en **Pendiente Secretaría** no reciben ceros.
  - El archivo lleva «_CIERRE» en el nombre y una hoja «Cierre» que explica la regla y cuántos ceros se pusieron.

**En MiAula no cambia ninguna calificación**: los vacíos siguen como pendientes. Solo cambia el archivo exportado.

Notas:
- Solo aplica a actividades. Si a un alumno le falta Valores, Actitudes o el Proyecto/Examen, su final sigue «Pendiente» en el archivo.
- db.js idéntico. Sin cambios en el cálculo normal de la app.
