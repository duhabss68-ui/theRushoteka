# MiAula Slate 2.6.0 · Modo claro / oscuro + refinamiento visual

## Nuevo
- Botón de tema (sol / luna) en el encabezado. Cambia entre modo oscuro (Slate) y modo claro. La preferencia se guarda solo en la tablet (localStorage `miaula:theme`), no en IndexedDB.
- Iconos nuevos: un set propio, con estilo de línea y un relleno suave (duotono). Mismos nombres internos.
- Logo nuevo en portada (libro abierto con palomita) y nuevo icono de la app (192, 512 y maskable).

## Cuaderno más limpio
- Las calificaciones se ven como números limpios; el cuadro aparece al tocar la celda.
- Puntos extra muestran solo el saldo (+3 en verde, −2 en rojo); si no hay puntos, un guion tenue.
- Sin columnas en negro; filas alternadas suaves.
- "Máx." en gris normalmente, ámbar de 4 a 6 y rojo de 3 a 0.
- NP resaltado en ámbar.

## Diseño general
- Esquinas más contenidas y una sola forma de botón.
- Títulos con el mismo peso tipográfico en toda la app.
- Inicio: primero "Clase activa", después accesos rápidos compactos y al final los indicadores.
- "Control de bitácora" con acento.
- Pase de lista sin el texto "3A" repetido bajo cada alumno.
- Ruleta: un "?" tenue en lugar de la barra vacía; botones Extra + (verde) y Extra − (rojo).
- La barra inferior se desvanece sobre el contenido al hacer scroll.

## Correcciones de contraste en modo oscuro (venían de versiones anteriores)
- Ventana de Puntos extra: paneles que quedaban en blanco.
- Ventana "Editar fecha de actividad": el nombre de la actividad era invisible (texto claro sobre fondo blanco).
- Panel "Registrar participación" de la Ruleta.

## Sin cambios
- db.js, xlsx-lite.js y styles-legacy.css idénticos a 2.4.9.
- IndexedDB (MiAulaMobileDB v3), formato de respaldo y lógica académica sin cambios.
