# MiAula Slate 2.5.0 · Slate Pro

## Correcciones
- La barra inferior (Inicio · Asistencia · Cuaderno · Ruleta · Equipos · Respaldo · Más) vuelve a mostrarse en la tablet. Una regla CSS posterior la ocultaba.
- Cuaderno: la barra de herramientas ya no se encima a los encabezados de las actividades al desplazarse.
- Cuaderno: un solo scroll vertical (el de la tabla); la página ya no se desplaza aparte.
- Indicador "Máx." sin decimales innecesarios (Máx. 9 en lugar de Máx. 9.0; /10 en lugar de /10.0).
- La columna Final ya no sale cortada.

## Diseño
- Encabezado único: título + Grupo activo + Parcial + "Todo guardado" + Modo clase en una sola franja.
- Se ocultan los accesos duplicados (botón "+ Asistencia" y Cuaderno/Asistencia del contexto); la barra inferior cubre esas funciones.
- Se ocultan los selectores "Grupo" repetidos en Asistencia, Historial, Ruleta/Equipos, Cuaderno, Parcial y Proyecto. Siguen sincronizados con el Grupo activo.
- Cuaderno: los controles quedan en una sola barra compacta (Parcial, buscar, filtro, Por alumno, Por equipos, densidad, Recargar, Guardar, Presentación, Excel). En la MatePad horizontal se ven unos 12 alumnos (antes 5).
- Presentación conserva búsqueda, filtro y el botón "Salir de presentación".
- Pase de lista: el botón P/F/R/J marcado se rellena de color y el renglón lleva una franja del color del estado. Botones táctiles más grandes. Contador de horas fijo arriba mientras bajas por la lista.
- Inicio más compacto (se conserva "Control de bitacora / by Ing. Niccolás C.M.").
- Ruleta: se quitó el brillo blanco del panel de resultado.
- Modo clase: la barra inferior oculta "Más" y queda con 6 accesos.
- Los avisos aparecen por encima de la barra inferior.

## Celular y tablet vertical
- MiAula ya funciona en celular (antes mostraba "Abre MiAula desde la MatePad").
- En tablet vertical, el Grupo activo pasa a una segunda línea del encabezado.

## Sin cambios
- db.js, xlsx-lite.js y styles-legacy.css son idénticos a la versión 2.4.9.
- IndexedDB (MiAulaMobileDB v3), formato de respaldo y lógica académica sin cambios.
