# MiAula Slate 2.8.0 · Rúbricas de un clic y calificar por equipos

## Rúbricas y listas de cotejo (Calificaciones → «Rúbricas y listas de cotejo»)
- Mis rúbricas: usar en una actividad, editar, duplicar, imprimir, compartir y quitar (con Deshacer).
- Banco de MiAula con 7 rúbricas y 4 listas de cotejo, con descripciones por nivel. Se pueden usar tal cual o «Hacer una copia para editar».
- Editor: nombre, niveles (nombre y puntos, de 2 a 6), criterios con peso (muestra el % al escribir) y descripción de cada nivel. Valida antes de guardar.
- Los instrumentos de Proyecto del formato anterior siguen funcionando igual; se puede crear una copia de un clic.
- Compartir por archivo .json con código de verificación SHA-256: no lleva datos de alumnos, se rechaza si fue modificado, no pisa nombres repetidos y avisa si es una copia de seguridad.

## Actividades con rúbrica
- Al crear una actividad: «Cómo se califica: Número | Rúbrica o lista de cotejo». Se guarda una COPIA de la rúbrica dentro de la actividad.
- En el Cuaderno, la columna muestra «Evaluar», el avance («2/5», rayado) o la nota en color (verde 8–10, ámbar 6–7.9, rojo menos de 6).
- Pantalla «Evaluar con rúbrica»: lista del grupo, nota en vivo, botones grandes por nivel, Anterior/Siguiente, «Todo en Destacado» y «Borrar» con Deshacer, e imprimir la rúbrica para entregar.
- Nota = Σ(peso × puntos) ÷ (Σ pesos × puntos del mejor nivel) × puntaje máximo. Incompleta = pendiente (no cuenta en el promedio).
- En la rúbrica de una actividad ya evaluada se pueden cambiar textos, pesos y puntos (las notas se recalculan), pero no agregar ni quitar criterios o niveles.

## Calificar por equipos
- «Calificar por equipos» en cada columna del Cuaderno y en cada actividad. Usa los equipos guardados del grupo.
- Una nota por equipo con botones rápidos. «Reemplazar las notas que ya tienen» va desmarcado por omisión. Se aplica en un paso con Deshacer (12 s).
- En rúbricas, «Evaluar por equipos»: cada nivel tocado se aplica a todos los integrantes. Se puede volver a «Evaluar alumno por alumno».
- Los alumnos dados de baja o pendientes con Secretaría no se califican aunque sigan en un equipo.

## Sin cambios
- db.js idéntico (MiAulaMobileDB v3, sin almacenes nuevos). Respaldos anteriores compatibles.
- El cálculo de promedios de actividades con número, Proyecto, Examen, Valores y Actitudes no cambia.
