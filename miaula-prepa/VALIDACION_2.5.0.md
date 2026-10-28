# Validación MiAula 2.5.0

- app.js, db.js, xlsx-lite.js, sw.js: sintaxis validada con Node.
- db.js: idéntico byte por byte a 2.4.9. xlsx-lite.js y styles-legacy.css también idénticos.
- IDs del HTML: 220 en 2.4.9 y 220 en 2.5.0; ninguno eliminado ni renombrado.
- manifest.webmanifest: JSON válido, versión 2.5.0.
- Service Worker: CACHE miaula-mobile-2.5.0; todos los recursos con ?v=2.5.0 (incluido el logo). Solo borra cachés miaula-mobile-*.
- Prueba visual en Chromium a 1400×920 (MatePad horizontal), 920×1400 (vertical) y 390×844 (celular) con un grupo de prueba de 28 alumnos: Inicio, Asistencia (cargar lista), Historial, Ruleta, Equipos (crear automáticamente), Cuaderno, Por alumno, Por equipos, Presentación, Modo clase, Parcial, Proyecto y Administración. Sin errores de JavaScript en consola.
- Cuaderno a 1400×920: el alto del documento es igual al de la ventana (sin doble scroll).
