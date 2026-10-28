# Cómo se usa · Rúbricas y equipos (MiAula 2.8.0)

## Calificar con rúbrica o lista de cotejo
1. Abre **Calificaciones**.
2. En «Nueva actividad», escribe el nombre y en **Cómo se califica** elige **Rúbrica o lista de cotejo**.
3. Elige la rúbrica (de «Mis rúbricas» o del «Banco de MiAula») y toca **Crear actividad**.
4. En el **Cuaderno**, toca **Evaluar** en la casilla de un alumno (o **Evaluar** en la tarjeta de la actividad).
5. Toca el nivel de cada criterio. La nota aparece arriba en cuanto marcas todos. Se guarda solo.
6. Toca **Siguiente alumno →**. Al terminar, toca **Cerrar**.

## Evaluar un proyecto por equipo
1. Forma los equipos en **Ruleta y equipos → Formar equipos** (si aún no existen).
2. En la columna de la actividad toca **Equipos** (o **Evaluar por equipos**).
3. Toca los niveles: se aplican a todos los integrantes del equipo.
4. Si alguien no trabajó, toca **Evaluar alumno por alumno** y ajusta solo a esa persona.

## Calificar por equipos una actividad con número
1. En la columna de la actividad toca **Equipos** (o **Calificar por equipos** en Calificaciones).
2. Escribe o toca la nota de cada equipo.
3. Deja **Reemplazar las notas que ya tienen** sin marcar si quieres respetar las notas ya puestas.
4. Toca **Aplicar a los equipos**. Si te equivocaste, toca **Deshacer** en los siguientes 12 segundos.

## Hacer o ajustar tus rúbricas
- **Calificaciones → Rúbricas y listas de cotejo**: + Nueva rúbrica, + Nueva lista de cotejo, o «Hacer una copia para editar» de una del banco.
- Para compartir con otro docente: **Guardar mis rúbricas en un archivo**. Él usa **Traer rúbricas de un archivo**.

## Pruebas (para desarrollo)
- Lógica: `node --test tests/rubricas.test.js`
- Navegador (requiere Playwright): `APP_URL=http://localhost:8000/index.html node tests/e2e/miaula.e2e.js`
