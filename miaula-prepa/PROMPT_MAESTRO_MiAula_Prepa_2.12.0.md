# PROMPT MAESTRO — MIAULA SLATE 2.12.0 · PREPA

> Copia este documento completo al iniciar una conversación nueva y adjunta el ZIP más reciente (`MiAula_2.12.0_Prepa.zip`).
> **Los archivos del ZIP son la fuente de verdad técnica.** Este documento describe el comportamiento esperado. No sobrescribas código que funciona basándote solo en este texto: primero compara.

---

## 1. Qué es MiAula

MiAula Slate · Prepa es la **edición general para preparatoria/bachillerato** de MiAula (derivada de MiAula 2.11.0 · CETIS). Es una **PWA local-first** para docentes de Educación Media Superior con varios grupos y asignaturas.

- Identidad de la portada: **«Control de bitácora · by Ing. Niccolás C.M.»**. Mantenerla.
- Dispositivo principal: **tablet en horizontal**. También debe funcionar en PC, en tablet vertical y en celular.
- Objetivo: **reducir la carga administrativa**. Debe poder usarse todos los días sin pensar en el sistema, solo en los alumnos.
- Publicación sugerida con GitHub Pages en un repositorio propio (p. ej. `…github.io/miaula-prepa/index.html`). El manifest usa rutas relativas.

## 2. Estado actual

- **Versión vigente: MiAula Slate 2.12.0 · Prepa.**
- No reconstruir desde cero. Trabajar siempre sobre los archivos de la última versión.
- La siguiente versión es 2.12.1 si es una corrección, o 2.13.0 si trae funciones nuevas. Nunca una versión menor.

## 3. Reglas absolutas

Prioridad, en este orden:
1. **No perder datos**
2. Funcionalidad
3. Rapidez de uso
4. Legibilidad
5. Pocos toques
6. Experiencia en tablet
7. Consistencia
8. Diseño
9. Efectos visuales

Nunca sacrificar del 1 al 6 por el 8 o el 9.

- **No perder:** grupos, alumnos, asistencias, actividades, calificaciones, proyectos, exámenes, porcentajes, puntos extra, rúbricas, listas de cotejo, equipos, parciales, evaluaciones ni configuraciones.
- **IndexedDB:**
  - No borrarla.
  - No pedir que se borren «Datos del sitio».
  - No renombrar almacenes ni claves sin una migración segura.
- **`db.js` debe quedar idéntico** salvo que sea estrictamente necesario. Compararlo con `cmp` en cada entrega. En 2.12.0 solo cambió el nombre de la base (`MiAulaPrepaDB`) para no mezclarse con MiAula CETIS en el mismo sitio.
- Las funciones nuevas se guardan agregando **campos opcionales** a los almacenes existentes, no creando almacenes nuevos.
- localStorage es solo para preferencias de interfaz: tema, densidad, teclado, grupo activo, fecha del último respaldo. Nunca para datos académicos.
- Respaldos compatibles hacia atrás. No cambiar el formato sin necesidad.
- Cuando el usuario diga «adelante», «hazlo», «genera la versión» o «continúa»: **implementar de verdad** y entregar los archivos, no solo describirlos.
- Ante un error:
  1. Encontrar la causa y reproducirla.
  2. Corregir sobre la versión actual.
  3. Validar.
  4. Entregar una revisión nueva.
- Si una pregunta queda sin respuesta, elegir un valor razonable, decirlo claramente y dejarlo editable.

## 4. Arquitectura

- Tecnologías:
  - HTML, CSS y JavaScript vanilla.
  - IndexedDB **`MiAulaPrepaDB` v3** (misma estructura que `MiAulaMobileDB` de CETIS; respaldos compatibles).
  - Service Worker y Manifest PWA.
  - Excel generado localmente con `xlsx-lite.js`.
- Funciona sin internet una vez instalada.
- Archivos del repositorio (lo que va en el ZIP `SOLO_GITHUB`):
  - `index.html`
  - `app.js`: lógica principal, unas 4,300 líneas.
  - `styles.css`: capas por versión; cada versión agrega su capa al final.
  - `sw.js`
  - `manifest.webmanifest`
  - `rubricas.js`: módulo `MiAulaRubricas`.
  - `xlsx-lite.js`
  - `db.js` está en el proyecto pero normalmente no cambia; `styles-legacy.css` y `assets/` tampoco.
- **Almacenes de IndexedDB:**
  - `groups`, `students`, `attendance`, `activities`, `grades`, `instruments`, `evaluations`, `gradingSchemes`, `studentComponents`, `extraPoints`, `meta`.
  - Los equipos persistentes se guardan en `meta`.
- **Campos importantes:**
  - `groups`: `current_period`, `total_periods`, `closed_periods[]`, `course_closed`, `last_period_closed_at`, `period_closures{p: ISO}` (desde 2.11.0).
  - `attendance`:
    - Campos: `group_id`, `student_id`, `attendance_date`, `status` (P/F/R/J/S), `class_hours`, `notes`, `updated_at` y **`period`** (desde 2.11.0).
    - Clave única: [grupo, alumno, fecha].
  - `gradingSchemes`:
    - Clave `"gid:period"`.
    - Porcentajes: `work_pct`, `project_pct`, `values_pct`, `attitudes_pct`, **`attendance_pct`**.
    - **Rubros adicionales (2.12.0):** `custom_components:[{id,name,pct,source:'manual'|'activities'}]` y `auto_created` (esquema creado solo, sin guardar por el docente).
    - Otros campos: `attendance_mode`, `principal_type` ('project'|'exam'), `mode_locked`.
  - `studentComponents`: clave `"gid:period:sid"`, con `values_score`, `attitudes_score`, `exam_score`, `notes` y **`custom_scores{idRubro:0-10}`** (2.12.0).
  - `activities`:
    - `period`, `activity_type`, `max_score`, `weight`, `activity_date` y **`component_id`** opcional (rubro «promedio de actividades», 2.12.0).
    - Con rúbrica: `grading_mode:'rubric'` y una copia en `activity.rubric`.
  - `grades`: `score`, `status` ('NP') y `rubric_levels{criterio:nivel}`.
  - `instruments`: rúbricas en formato `rubrica-v2`, además de los instrumentos del formato anterior.

## 5. Service Worker y actualización (crítico)

En cada versión hay que actualizar:
- `CACHE='miaula-prepa-X.Y.Z'` en `sw.js` (solo se limpian cachés `miaula-prepa-*`) y la lista de ASSETS con su `?v=`.
- Todos los `?v=` de `index.html`.
- El `<title>`, la etiqueta de versión, la pantalla de inicio y «Acerca de».
- `manifest.webmanifest`.
- `navigator.serviceWorker.register('sw.js?v=…')` y el nombre del archivo de respaldo en `app.js`.

Otras reglas:
- El HTML va con estrategia network-first.
- Solo se limpian las cachés de MiAula.
- Ya existe el aviso «Hay una versión nueva · Actualizar ahora».

Para actualizar la tablet:
1. Hacer un respaldo (Más → Crear respaldo).
2. Subir los archivos del ZIP `SOLO_GITHUB`.
3. Abrir `…/index.html?actualizar=VERSION`.
4. Recargar, cerrar MiAula y volver a abrirla.

## 6. Diseño «MiAula Slate»

- Debe sentirse profesional, sobrio, educativo y legible: ni infantil, ni gamer, ni gubernamental anticuado. **Una libreta docente profesional digital.**
- Modo oscuro (Slate) y **modo claro**, con un botón de sol/luna que guarda la preferencia en `miaula:theme`.
- Paleta oscura:

  | Elemento | Color |
  |---|---|
  | Fondo | `#111827` |
  | Superficie | `#182230` |
  | Tarjeta | `#202B3C` |
  | Elevada | `#293548` |
  | Primario | `#4F7CAC` (hover `#6190BF`) |
  | Texto | `#F5F7FA` / `#AAB4C3` / `#778397` |
  | Éxito | `#2F8F74` |
  | Advertencia | `#D6A84B` |
  | Error | `#D65F64` |

- Usar los **tokens CSS** (`--surface-2`, `--primary-soft`, `--warning-soft`, `--text-strong`, `--accent-text`, `--border`, `--r-card`…) y revisar siempre los dos temas.
- **Contraste:** fondo oscuro con letra clara y fondo claro con letra oscura. Nunca texto blanco sobre tarjeta blanca. Revisar los modales en modo oscuro; ya hubo errores de este tipo.
- Tipografía Inter. Áreas táctiles grandes. Glass con moderación; nunca en tablas o en el cuaderno.
- Iconos SVG propios (sprite con `i-home`, `i-attendance`, `i-notebook`, `i-plus`, `i-roulette`, `i-teams`, `i-backup`, `i-data`, `i-excel`, `i-print`, `i-keypad`, `i-search`, `i-screen`, `i-refresh`, `i-percent`, `i-eval`, `i-groups`, `i-activity`, `i-alert`, `i-sun`, `i-moon`, `i-class`). No usar emojis como iconos.
- Colores de estado solo cuando tienen significado.

## 7. Navegación

- **Encabezado único:** título, Grupo activo, Parcial, «Todo guardado», versión, botón de tema y Modo clase. Botón «Menú principal».
- Los selectores de «Grupo» repetidos en cada pantalla están ocultos y se sincronizan con el Grupo activo.
- **Barra inferior (7 accesos, desde 2.11.0):** Inicio · Asistencia · Cuaderno · **Actividad (+)** · Ruleta · Equipos · Más.
  - **«Respaldo» se quitó de la barra en 2.11.0, a petición del usuario.**
  - El respaldo está en **Más → Crear respaldo** y en Más → panel Respaldo, que también permite restaurar.
- **Modo clase** oculta «Más» y deja 6 accesos.
- «Actividad (+)» abre Calificaciones → Nueva actividad con el cursor en el nombre.
- **Más (Centro de administración):**
  - Porcentajes del parcial, Proyecto/Examen, Exportar todo a Excel y Crear respaldo.
  - Gestión: Grupos y alumnos, Calificaciones, Parcial, Proyecto y **Parciales pasados**.
  - Exportar a Excel, Lista de asistencia tradicional y Respaldo/Restaurar.
- **Inicio:**
  - Clase activa, accesos rápidos y KPIs. La asistencia mostrada es la del **parcial actual**.
  - Panel «Requiere atención»: faltas de 15% o más, pendientes con Secretaría y calificaciones pendientes.
  - Recordatorio de respaldo, en ámbar después de 7 días.

## 8. Funciones existentes (todas deben conservarse)

### Grupos y alumnos
- Varios grupos y disciplinas; el mismo grupo puede tener varias asignaturas.
- Alumnos con apellido paterno, apellido materno y nombre(s). Orden por **apellido paterno A–Z**. Siempre se identifican por ID interno.
- Agregar, editar, renumerar, dar de baja y reactivar. **Dar de baja no borra**: conserva el historial y deja de aparecer en el pase de lista, la ruleta, los equipos y las actividades nuevas.
- **Pendiente Secretaría:**
  - No cuenta como asistencia ni como falta (estado S) y queda fuera del cálculo del 20%, de la ruleta y de los equipos.
  - Se resuelve con «Sí continúa» o «Dar de baja conservando historial».

### Asistencia
- Pantalla de **pase de lista**: se elige el número de horas del bloque (asistencia por horas) y **todos empiezan en Falta**.
- Estados: P, F, R, J y botón Secretaría. Vibración breve al marcar.
- **Historial de asistencia** (pantalla aparte):
  - Totales por alumno.
  - % de faltas = horas F ÷ horas computables × 100: menos de 15% normal, de 15% a 19.9% advertencia, 20% o más alerta roja, siempre con texto además del color.
  - «Historial / corregir» edita el registro existente.
  - Reporte para Secretaría en PDF y lista de asistencia en Excel.
- **Asistencia por parcial (2.11.0):**
  - Cada registro guarda `period`. Cada parcial empieza en 0.
  - Al cerrar un parcial, su asistencia queda guardada en él.
  - Los registros antiguos sin `period` se asignan automáticamente: por fecha contra `period_closures` o `last_period_closed_at`, y si es el mismo día, por la hora de `updated_at` contra la hora del cierre. Esto se hace al iniciar la app y al cerrar un parcial.
  - Un registro nuevo hecho en una fecha anterior al cierre va al parcial cerrado.
  - Si el docente pasa lista en una fecha de un parcial cerrado, aparece un aviso. Puede corregirla (por ejemplo R → P al recibir el justificante) y el cambio se queda en ese parcial.
  - Selector de **Parcial** en el Historial:
    - Parcial actual (por defecto; al volver a la pantalla regresa al actual).
    - Parciales cerrados en «modo consulta».
    - «Todo el semestre».
  - Las alertas, el reporte de Secretaría, la boleta y la lista de Excel usan el parcial correspondiente.
- **Lista de asistencia tradicional (Excel, 2.10.0):**
  - Una columna por fecha, con marcas `.` asistencia, `/` falta en rojo, `J`, `R` y `S`.
  - Totales y % de faltas en rojo desde 20%, y después la calificación de cada parcial y el promedio.
  - Opciones:
    - Fechas: todas, **solo un parcial** o un rango.
    - Contar por horas o por sesiones.
    - Calificación «como está» o «para cierre».

### Actividades y calificaciones
- Crear, editar, eliminar (con confirmación) y **cambiar la fecha sin perder calificaciones** (mismo ID).
- Tipos: Trabajo, Práctica, Exposición, Proyecto y Examen. Tienen puntaje máximo y peso.
- **Indicador «Máx.»** (solo es una referencia y nunca bloquea):
  - Vale 10 el día de creación y baja 1 por cada día hábil (no cuentan sábado ni domingo).
  - Se ve gris; ámbar de 6 a 4 y rojo de 3 a 0.
- Una actividad se califica con número o con **rúbrica / lista de cotejo**:
  - Se guarda una copia de la rúbrica en la actividad.
  - La nota es Σ(peso × puntos) ÷ (Σ pesos × puntos del mejor nivel) × máximo.
  - Una rúbrica incompleta queda pendiente («2/5») y no cuenta.
- NP no cuenta en el promedio. Una celda vacía queda pendiente: **nunca es 0 en la app**.

### Rúbricas y listas de cotejo (2.8.0 / 2.9.0)
- Mis rúbricas (usar, editar, duplicar, imprimir, compartir y quitar con Deshacer) y el Banco de MiAula (7 rúbricas y 4 listas).
- Editor con niveles (de 2 a 6), criterios con peso y descripciones.
- Compartir por `.json` con verificación SHA-256, sin datos de alumnos.
- **Proyecto** tiene un panel «Banco de rúbricas»: Elegir una ya hecha, Modificar, Crear y Subir archivo.
  - La evaluación de proyecto guarda una copia de la rúbrica.
  - Se conservan los instrumentos del formato anterior.
- Las rúbricas no se borran al cerrar un parcial.

### Cuaderno digital
- Hoja tipo Excel con encabezados sticky y columnas fijas No. / Alumno / Puntos extra.
- Barra de desplazamiento horizontal superior sincronizada. Un solo scroll vertical, el de la tabla.
- Densidad Compacta (por defecto) o Cómoda. Buscador y filtros: pendientes, NP y menos de 6.
- **Teclado MiAula:** 10, 9, 8, 7, 6, 5, NP, Borrar, dígitos y flechas. Se activa o desactiva y la preferencia es local.
- Autoguardado (0.9 s), «Guardando… / ✓ Todo guardado», Deshacer y guardado al salir.
- **Vista alumno:** anterior, siguiente, «Guardar y siguiente», botones rápidos, buscador y **Boleta PDF**.
- **Libreta por equipos** y **Calificar por equipos** en cada columna:
  - Una nota por equipo, con Deshacer de 12 s.
  - En rúbricas, cada nivel se aplica a todo el equipo.
  - Los nombres de los integrantes se muestran grandes.
- Modo **Presentación** a pantalla completa.
- Selector de parcial: «Parcial N · actual», «Parcial N · cerrado (consulta)» y «Todos los parciales».
  - Al cerrar un parcial o cambiar de grupo, el cuaderno abre el parcial actual (corrección de 2.10.1).
- **Modo consulta (2.11.0):** los parciales cerrados se ven en **solo lectura**.
  - Aviso con «Ir al Parcial N (actual)», «Ver asistencia del Parcial N» y «Desbloquear para corregir» (con confirmación, y luego «Volver a bloquear»).
  - Bloquea escritura, teclado, puntos extra, rúbricas y equipos. La Vista alumno también queda en solo lectura.
  - El desbloqueo dura solo la sesión.

### Parciales y porcentajes
- Se usan parciales, no trimestres; son configurables por grupo (normalmente 3).
- El componente principal es **Proyecto o Examen** (excluyentes, con el mismo porcentaje). Se fija para el parcial al guardar el esquema.
  - Proyecto es el promedio de las evaluaciones con rúbrica o lista.
  - Examen es una captura directa de 0 a 10.
- Si un componente tiene porcentaje mayor que 0 y no tiene datos, se muestra **Pendiente**, no 0.
- **Esquema vigente (desde 2.11.0) para el parcial abierto y los siguientes:**
  - **Trabajos + Proyecto/Examen + Asistencia (automática, % editable, 10% por omisión; 0% = no cuenta) + rubros adicionales**. El total debe sumar 100%.
  - **Valores y Actitudes ya no se usan** en parciales abiertos. Sus campos existen pero quedan en 0% y ocultos.
  - Conversión automática: el 10% que sobra va a Trabajos (40/40/10/10 → 50/40/10). Se guarda `legacy_values_pct` y `legacy_attitudes_pct`.
  - **Los parciales ya cerrados (el Parcial 1 del usuario) conservan Valores y Actitudes** y sus calificaciones finales no cambian.
  - Un parcial nuevo copia los porcentajes del anterior. Proyecto o Examen queda por elegir.
- **Cálculo de la Asistencia (0–10):**
  - Fórmula: clases con asistencia ÷ clases del parcial × 10.
  - **Se cuenta por clases** (un día es una clase), no por horas.
  - **P, R y J cuentan como asistencia; solo la F resta**; S no cuenta.
    - El usuario solo cuenta asistencia y falta.
    - La R la usa de forma temporal: el alumno trae justificante, puede entregar trabajos y después le cambia la falta por asistencia.
  - Si no hay clases en el parcial, queda «Sin clases» y la final queda Pendiente.
- **Final** = Σ componente × %. Queda pendiente si falta algún componente con porcentaje mayor que 0.
- **Cerrar parcial:**
  - Pide confirmación.
  - Asigna el parcial a la asistencia y guarda `period_closures[p]`.
  - Pasa al siguiente parcial, o marca el ciclo como concluido.
  - No borra nada.
- **«Consultar parciales pasados»** (en Parcial y en Más):
  - Una tarjeta por parcial cerrado, con promedio, actividades, clases con lista y alumnos con final.
  - Botones «Abrir cuaderno (consulta)» y «Ver asistencia».

### Rubros adicionales (2.12.0 · Prepa)
- En Parcial → Esquema: «Agregar rubro» con nombre, tipo y %. Nombres únicos y distintos de los componentes fijos.
- **Captura directa**: 0–10 por alumno en la tabla del parcial («Todos 10»), en el cuaderno (columna propia) o en la Vista alumno.
- **Promedio de actividades**: al crear una actividad, «Cuenta en» (Trabajos o el rubro); se puede cambiar en «Editar fecha y rubro». Esas actividades no cuentan en Trabajos.
- Rubro con % sin datos → final Pendiente. Quitar un rubro no borra capturas; sus actividades vuelven a Trabajos.
- Un parcial nuevo copia los rubros. Al cerrar un parcial, si el siguiente se creó solo y no se ha guardado, se vuelve a copiar.
- Aparecen en boleta, libreta Excel, Excel completo («Rubros adicionales»), exportación «para cierre» y parciales pasados.

### Puntos extra
- Columna con el saldo (+N en verde, −N en rojo).
- Desde la ruleta: Extra + (máximo +2 por sesión) y Extra − (sin límite).
- Los positivos son un saldo que se **aplica** a una actividad sin pasar el máximo; se descuenta y queda en el historial.
- **No se pueden aplicar a actividades con rúbrica** (corrección de 2.8.1).
- «Limpiar puntos» deja el saldo en 0 sin revertir las calificaciones ya ajustadas.

### Ruleta y equipos
- Ruleta por número de lista del grupo activo:
  - Los segmentos muestran «?».
  - Los alumnos que ya salieron quedan opacos y no repiten en la ronda.
  - Al revelar al alumno hay confeti.
  - Tiene pantalla completa.
  - La ronda se reinicia al salir.
- Equipos:
  - Se forman con todos los alumnos activos (no dependen de la asistencia), sin bajas ni pendientes con Secretaría.
  - Constructor visual con equipos de 1, 2 o 3 integrantes y borradores **persistentes** con autoguardado.
  - «Limpiar equipos» solo borra la asignación.
  - Cualquier equipo con al menos un integrante se puede calificar. Proyecto por equipo.

### Excel y reportes
- **Generar Excel** (Cuaderno) y **Exportar todo a Excel** (Más) preguntan:
  - «Como está».
  - «Para cierre de evaluación»: las actividades vacías salen en 0 y cuentan; NP y las rúbricas a medias no cambian; Pendiente Secretaría no recibe ceros. El archivo lleva `_CIERRE` y una hoja «Cierre».
  - **En la app no cambia nada.**
- **Excel completo**, hojas:
  - Resumen, Esquemas (incluye Asistencia %) y Calificación parcial (incluye Asistencia 0–10 y clases asistidas).
  - Concentrado.
  - Asistencia (cada fecha indica su parcial), **Asistencia por parcial** (2.11.0) y Asistencia por horas.
  - Actividades, Detalle de calificaciones y Proyectos.
  - Equipos, Puntos extra, Banco de instrumentos, Observaciones y Bajas.
- **Libreta del parcial:**
  - En los parciales con Asistencia: columnas «Asistencia (0-10)» y «Clases asistidas».
  - En los parciales anteriores: Valores y Actitudes.
- `xlsx-lite.js` admite formato opcional (`sheet.format`: cols, merges, heights, freeze, landscape) y estilos con nombre.
- PDF por impresión: Boleta por alumno (componentes del parcial y asistencia del parcial) y Reporte de inasistencias (por parcial).

### Respaldo
- Descargar el `.json` completo y restaurarlo (la restauración reemplaza los datos, con aviso).
- Recordatorio de días desde el último respaldo.

## 9. Pruebas (obligatorias antes de cada entrega)

Validaciones previas:
- `node --check` de `app.js`, `sw.js`, `xlsx-lite.js` y `rubricas.js`.
- `cmp db.js` contra la versión anterior.
- Revisar que no desaparezca ningún ID funcional del HTML.

Suites, con un servidor local (`python3 -m http.server`) y `APP_URL=http://localhost:PUERTO/index.html node tests/e2e/X.e2e.js`:

| Suite | Resultado en 2.11.0 |
|---|---|
| `node --test tests/rubricas.test.js` (lógica) | 17/17 |
| `regresion.e2e.js` | 36/36 (la Asistencia ahora es editable) |
| `miaula.e2e.js` (rúbricas y equipos) | 33/33 |
| `proyecto.e2e.js` | 19/19 |
| `cierre.e2e.js` | 13/13 |
| `lista-asistencia.e2e.js` | 15/15 |
| `cambio-parcial.e2e.js` | 11/11 |
| `asistencia-parcial.e2e.js` (2.11.0) | 41/41 |
| `rubros.e2e.js` (2.12.0 Prepa) | 31/31 |

- Al cambiar una regla de forma intencional, se ajustan las pruebas afectadas y se explica por qué.
- Revisar capturas de pantalla en los dos temas antes de entregar.

## 10. Forma de entrega

1. Copiar la última versión a una carpeta nueva y aplicar cambios mínimos con capas CSS nuevas al final.
2. Subir la versión en todos los lugares de la sección 5.
3. Agregar `NOVEDADES_X.md` y `VALIDACION_X.md`, actualizar `README_PRIMERO.txt` y regenerar `SHA256.txt`.
4. Entregar dos ZIP:
   - Completo: `MiAula_X_Prepa.zip`, con código, pruebas, herramientas y notas.
   - `MiAula_X_Prepa_SOLO_GITHUB.zip`: los 7 archivos `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `rubricas.js` y `xlsx-lite.js` (más `db.js` o `assets/` solo si cambiaron).
5. Explicar en español sencillo qué cambió, qué se decidió por el usuario y cómo actualizar.

## 11. No hacer

- Reconstruir desde cero, cambiar IndexedDB por otra tecnología o romper la compatibilidad de los respaldos.
- Eliminar funciones: Excel, Proyecto, Examen, porcentajes, puntos extra, equipos, asistencia histórica, bajas, rúbricas o parciales pasados.
- Poner a todos presentes por defecto, depender de la asistencia para formar equipos o impedir calificar equipos de 1 o 2.
- Bloquear la captura por el indicador «Máx.».
- Convertir en 0 un vacío dentro de la app. El 0 solo aparece en la exportación «para cierre».
- Recalcular parciales cerrados con reglas nuevas (el Parcial 1 queda como se calificó).
- Mezclar datos de un parcial cerrado con el actual. La consulta siempre es de solo lectura salvo desbloqueo explícito.
- Volver a poner «Respaldo» en la barra inferior sin que el usuario lo pida.
- Cambiar reglas académicas sin autorización.

## 12. Historial de versiones (resumen)

| Versión | Cambios |
|---|---|
| 2.4.9 | Base: navegación sticky, cuaderno tipo Excel, equipos persistentes, asistencia por horas, Secretaría, puntos extra, ruleta, rúbricas clásicas, Proyecto/Examen, cierre de parcial, Excel y respaldo. |
| 2.5.0 | Slate Pro: barra inferior corregida, encabezado único, cuaderno con un solo scroll, soporte para celular. |
| 2.6.0 | Modo claro/oscuro, iconos y logo nuevos, cuaderno más limpio, contraste de modales. |
| 2.7.0 | Teclado MiAula, guardado al salir, Boleta y Reporte de Secretaría en PDF, «Requiere atención», recordatorio de respaldo, ruleta con «?» y confeti. |
| 2.8.0 / 2.8.1 | Rúbricas y listas de un clic, banco, calificar por equipos; los puntos extra no se aplican a rúbricas. |
| 2.9.0 | Banco de rúbricas en Proyecto. |
| 2.9.1 | «Actividad (+)» en la barra inferior. |
| 2.9.2 | Exportación «para cierre de evaluación» (vacíos = 0 solo en el archivo). |
| 2.10.0 | Lista de asistencia tradicional en Excel con calificaciones. |
| 2.10.1 | El cuaderno abre el parcial nuevo tras cerrar; un parcial nuevo copia los porcentajes del anterior. |
| 2.11.0 | Asistencia por parcial, Asistencia 10% automática en lugar de Valores y Actitudes, modo consulta de parciales pasados, barra sin «Respaldo». |
| **2.12.0 · Prepa** | Edición general para preparatoria: rubros adicionales al calificar (captura directa o promedio de actividades), Asistencia con % editable, base de datos y caché propias, sin textos de CETIS. |

## 13. Situación actual

- Edición nueva y general: instalaciones limpias, sin parciales cerrados. Un docente que venga de CETIS puede restaurar su respaldo.
- Preferencias del autor:
  - Respuestas claras en español.
  - Implementar cuando dice «adelante» o «hazlo».
  - Entregar los dos ZIP.
  - Nunca arriesgar los datos.
