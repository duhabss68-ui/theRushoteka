# Para Palencia · MiAula edición «Silver & Black»

Cuaderno especial basado en **MiAula Slate 2.13.0 · Prepa**, con los colores plata y negro, tipografía deportiva condensada (Oswald) y un escudo propio con la «P» de Palencia (se puede cambiar por el logo que elija el maestro). Tiene **todas** las funciones de MiAula Prepa: asistencia, cuaderno, rubros personalizables, rúbricas, ruleta, equipos, Excel, boleta y copia automática.

## Cómo se usa
1. Copia `MiAula_Palencia_SilverBlack_2.13.0.html` a la computadora (Documentos o Escritorio).
2. Ábrelo con doble clic en **Chrome o Edge**. No necesita internet.
3. Ve a **Más → Respaldo → «Elegir carpeta de copias»** y elige una carpeta (OneDrive, Documentos o una USB).
   Desde ese momento cada cambio se guarda solo en `MiAula_Palencia_ultima_copia.json`, más una copia por día.
4. El botón de sol/luna cambia entre **negro** (por omisión) y **«Día plata»** (claro).

## Datos
- Su base de datos es propia (`MiAulaPalenciaDB`): aunque en la misma computadora se abra otra edición de MiAula, no se mezclan.
- Las copias son respaldos normales de MiAula: se restauran con **Restaurar respaldo** en esta edición o en MiAula Prepa.
- Para actualizar: reemplaza el archivo HTML por el nuevo **con el mismo nombre y en la misma carpeta**.

## Marca
- Colores plata `#A5ACAF` y negro `#0A0A0B`.
- El escudo incluido es un diseño original (escudo, espadas cruzadas y «P»). El archivo **no** trae el logotipo oficial de los Raiders (marca registrada de la NFL).
- **Cambiar logo:** toca el escudo de la portada (o Más → Respaldo → «Cambiar logo») y elige una imagen PNG, JPG, WEBP o SVG. Se usa en la portada, la pantalla de carga, la barra lateral y el ícono de la pestaña. «Quitar logo» regresa al escudo. El logo se guarda solo en ese navegador.
- Tipografía Oswald, licencia SIL Open Font License (`fonts/OFL-Oswald.txt`).

## Para desarrolladores
- Se genera con `python3 tools/build_single.py --edition palencia` → `dist/MiAula_Palencia_SilverBlack_<versión>.html`.
- `editions/palencia/edition.py`: textos, base de datos y nombres de archivo; `edition.css`: tema; `emblem.svg`: escudo.
- Prueba: `tests/e2e/edicion-palencia.e2e.js`.

## Validación (2.13.0)
- `edicion-palencia.e2e.js`: 21/21 (incluye «Cambiar logo»: se aplica en portada, barra e ícono, se reduce a 320 px, se conserva al reabrir y «Quitar logo» regresa al escudo).
- Suites funcionales sobre el HTML de Palencia (file://): miaula 33/33, asistencia-parcial 41/41, regresión 35/36 y rubros 30/31. Las dos diferencias son intencionales: la edición inicia en negro y su base se llama `MiAulaPalenciaDB`; ambas se verifican en `edicion-palencia.e2e.js`.
- En la versión anterior (antes del cambio de nombre) también pasaron proyecto 19/19, cierre 13/13, lista-asistencia 15/15 y cambio-parcial 11/11; el programa no cambió desde entonces.
