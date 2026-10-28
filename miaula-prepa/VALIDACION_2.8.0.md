# Validación MiAula 2.8.0

- Sintaxis (Node): app.js, db.js, xlsx-lite.js, sw.js, rubricas.js.
- db.js, xlsx-lite.js, styles-legacy.css idénticos a 2.4.9.
- IDs del HTML: 241 → 252. Ninguno eliminado.
- Service Worker: miaula-mobile-2.8.0; rubricas.js agregado a la caché.
- Pruebas de lógica (node --test tests/rubricas.test.js): 17/17.
- Prueba de navegador (tests/e2e/miaula.e2e.js) con datos de la versión 2.7.0: 35/35.
  - 8.05 y lista de cotejo = 8.
  - Incompleta pendiente.
  - Plantilla vs. copia; recalcular por peso.
  - Bloqueo de estructura.
  - Archivo sin alumnos / modificado rechazado / nombres «(2)» / aviso de respaldo.
  - Equipos: respetar notas, reemplazar, rango, Deshacer, bajas.
  - Modo equipo en rúbrica.
  - Datos anteriores con los mismos promedios; Excel con nota y «2 de 5 criterios».
  - Rúbrica dañada.
  - Escape de textos.
  - Teclado / lector de pantalla.
  - Sin errores de JavaScript.
