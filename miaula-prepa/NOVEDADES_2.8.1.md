# MiAula Slate 2.8.1 · Corrección

- Puntos extra: ya no se pueden aplicar a actividades calificadas con rúbrica. En una rúbrica la nota sale de los niveles, así que los puntos se descontaban del saldo pero no subían la calificación. Ahora esas actividades no aparecen en la lista y, si se intenta, se avisa claramente.
- Se agregó la prueba de regresión tests/e2e/regresion.e2e.js (35 comprobaciones de funciones que ya existían).
- Sin cambios en db.js ni en los cálculos.
