# Para Valencia · MiAula edición «Silver & Black»

Cuaderno especial basado en **MiAula Slate 2.13.0 · Prepa**, con los colores plata y negro, tipografía deportiva condensada (Oswald) y un escudo propio con la «V» de Valencia. Tiene **todas** las funciones de MiAula Prepa: asistencia, cuaderno, rubros personalizables, rúbricas, ruleta, equipos, Excel, boleta y copia automática.

## Cómo se usa
1. Copia `MiAula_Valencia_SilverBlack_2.13.0.html` a la computadora (Documentos o Escritorio).
2. Ábrelo con doble clic en **Chrome o Edge**. No necesita internet.
3. Ve a **Más → Respaldo → «Elegir carpeta de copias»** y elige una carpeta (OneDrive, Documentos o una USB).
   Desde ese momento cada cambio se guarda solo en `MiAula_Valencia_ultima_copia.json`, más una copia por día.
4. El botón de sol/luna cambia entre **negro** (por omisión) y **«Día plata»** (claro).

## Datos
- Su base de datos es propia (`MiAulaValenciaDB`): aunque en la misma computadora se abra otra edición de MiAula, no se mezclan.
- Las copias son respaldos normales de MiAula: se restauran con **Restaurar respaldo** en esta edición o en MiAula Prepa.
- Para actualizar: reemplaza el archivo HTML por el nuevo **con el mismo nombre y en la misma carpeta**.

## Marca
- Colores plata `#A5ACAF` y negro `#0A0A0B`.
- El escudo es un diseño original (escudo, espadas cruzadas y «V»). **No** usa el logotipo oficial de los Raiders, que es una marca registrada de la NFL; esta edición es un regalo personal, no un producto oficial.
- Tipografía Oswald, licencia SIL Open Font License (`fonts/OFL-Oswald.txt`).

## Para desarrolladores
- Se genera con `python3 tools/build_single.py --edition valencia` → `dist/MiAula_Valencia_SilverBlack_<versión>.html`.
- `editions/valencia/edition.py`: textos, base de datos y nombres de archivo; `edition.css`: tema; `emblem.svg`: escudo.
- Prueba: `tests/e2e/edicion-valencia.e2e.js`.
