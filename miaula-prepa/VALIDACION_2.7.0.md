# Validación MiAula 2.7.0

- Sintaxis (Node): app.js, db.js, xlsx-lite.js, sw.js correctos.
- db.js, xlsx-lite.js, styles-legacy.css idénticos a 2.4.9.
- IDs del HTML: 224 → 241. Ninguno eliminado.
- Service Worker: miaula-mobile-2.7.0, recursos con ?v=2.7.0.
- Pruebas automatizadas en Chromium (1400×920 y 390×844):
  - Teclado: "7" se guarda y avanza al siguiente alumno de la misma columna; "8.5" con dígitos se guarda. Con el teclado activado, inputmode="none"; desactivado, "decimal".
  - Guardado al salir: valor escrito y guardado inmediato (studentComponents.values_score = 9).
  - Pase de lista en fecha nueva: todos inician en F.
  - Respaldo: exportar → restaurar conserva los conteos de los 11 almacenes.
  - Recordatorio: con 9 días muestra "Conviene respaldar"; después de respaldar, "Respaldo al día".
  - Ruleta: segmentos con "?" y confeti al revelar.
  - Boleta y reporte de inasistencias generados como PDF tamaño carta.
  - Sin errores de JavaScript.
