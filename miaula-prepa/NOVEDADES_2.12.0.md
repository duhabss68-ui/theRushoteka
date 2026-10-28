# MiAula Slate 2.12.0 · Prepa — Novedades

Edición **general para preparatoria**, basada en MiAula 2.11.0 · CETIS. Se conservan todas las funciones (asistencia por parcial, cuaderno, rúbricas, equipos, ruleta, puntos extra, Excel, respaldo, modo consulta…).

## Lo nuevo: rubros adicionales al calificar

En **Más → Parcial → Esquema de evaluación** aparece **«Rubros adicionales» → «Agregar rubro»**. Cada rubro tiene:

| Campo | Qué es |
|---|---|
| Nombre | Participación, Tareas, Portafolio, Laboratorio, Valores… (no puede repetirse ni llamarse igual que Trabajos, Proyecto, Examen, Asistencia, Valores o Actitudes) |
| Cómo se califica | **Captura directa**: escribes 0–10 por alumno. **Promedio de actividades**: promedia las actividades que asignes a ese rubro. |
| % | Cuánto vale en la calificación del parcial. |

- El total (Trabajos + Proyecto/Examen + Asistencia + rubros) debe sumar **100%**; el total se ve en vivo.
- **Captura directa**: se escribe en la tabla del parcial (con botón «Todos 10»), en el **cuaderno** (columna propia, con teclado MiAula y autoguardado) o en la **Vista alumno**.
- **Promedio de actividades**: al crear una actividad aparece **«Cuenta en»** (Trabajos o el rubro). También se puede cambiar después en «Editar fecha y rubro». Esas actividades ya no cuentan en Trabajos.
- Si un rubro tiene % y le falta información, la final queda **Pendiente** (nunca 0 en la app).
- **Quitar un rubro no borra nada**: lo capturado se conserva y sus actividades vuelven a contar en Trabajos.
- Un parcial nuevo **copia los rubros** del anterior (igual que los porcentajes). Si el parcial siguiente se creó solo antes de tiempo (por ejemplo al exportar Excel) y nadie lo guardó, al cerrar el parcial se vuelve a copiar el esquema final.
- Los parciales cerrados conservan su cálculo.

Los rubros aparecen también en: boleta PDF, libreta Excel (una columna por rubro), Excel completo (columna «Rubros adicionales» en *Esquemas* y *Calificación parcial*), exportación «para cierre» (las actividades vacías del rubro salen en 0 solo en el archivo) y en las tarjetas de parciales pasados.

## Otros cambios de la edición Prepa

- **Asistencia editable**: sigue siendo automática, pero su % ya no es fijo (10% por omisión; **0% = no cuenta**).
- Marca «MiAula Slate 2.12.0 · Prepa»; se quitaron los textos propios de CETIS.
- **Base de datos propia** (`MiAulaPrepaDB`) y caché propia (`miaula-prepa-*`): puede convivir con MiAula CETIS en el mismo sitio sin mezclar ni borrar datos. Es el único cambio en `db.js` (nombre de la base).
- Manifest con rutas relativas: funciona en cualquier repositorio de GitHub Pages.
- Respaldos con el mismo formato que CETIS (se pueden restaurar en ambos sentidos; CETIS ignora los campos de rubros).

## Datos (solo campos opcionales, sin almacenes nuevos)

- `gradingSchemes.custom_components = [{id, name, pct, source:'manual'|'activities'}]`, `auto_created`.
- `studentComponents.custom_scores = {idRubro: 0-10}`.
- `activities.component_id` (rubro de tipo «promedio de actividades»).
