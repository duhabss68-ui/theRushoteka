# Validación MiAula 2.6.0

- Sintaxis (Node): app.js, db.js, xlsx-lite.js, sw.js correctos.
- db.js, xlsx-lite.js, styles-legacy.css: idénticos byte por byte a 2.4.9.
- IDs del HTML: 220 → 224. Ninguno eliminado. Nuevos: themeToggle, i-sun, i-moon, miaulaMarkGrad.
- Service Worker: CACHE miaula-mobile-2.6.0, recursos con ?v=2.6.0.
- Capturas en Chromium, modo oscuro y claro, 1400×920 y 390×844: Inicio, Asistencia, Historial, Ruleta (normal y pantalla completa), Equipos, constructor de equipos, Calificaciones, Cuaderno, Vista alumno, Cuaderno por equipos, Parcial, Proyecto, Administración, Grupos, modal de Puntos extra y modal de Editar fecha.
- Prueba funcional automatizada:
  - Pase de lista: todos inician en F; se marcó P y se guardó correctamente.
  - Cuaderno: edición de una calificación guardada en IndexedDB.
  - Tema: cambia, se guarda en localStorage y actualiza theme-color.
  - Respaldo: exportar → restaurar conserva los mismos conteos en los 11 almacenes; formato MiAulaMobileBackup.
  - Sin errores de JavaScript en consola.
