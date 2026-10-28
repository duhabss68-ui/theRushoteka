MIAULA SLATE 2.14.0 · PREPA (edición general para preparatoria)

DOS FORMAS DE USARLA
A) UN SOLO ARCHIVO HTML (lo más fácil)
   1. Copia dist/MiAula_Prepa_2.14.0.html a tu computadora (o a una USB).
   2. Ábrelo con doble clic en Chrome o Edge. No necesita internet.
   3. Ve a Más -> Respaldo -> «Elegir carpeta de copias» y elige una carpeta
      (Documentos, OneDrive, USB…). Desde ese momento CADA CAMBIO se guarda solo en
      MiAula_Prepa_ultima_copia.json, y queda una copia por día.
   IMPORTANTE: usa siempre el mismo navegador y el mismo archivo. Si cambias de computadora,
   abre el HTML allá y usa «Restaurar respaldo» con MiAula_Prepa_ultima_copia.json.

B) APP INSTALABLE (GitHub Pages, tablet y celular)
   1. Crea un repositorio y activa GitHub Pages.
   2. Sube el contenido del ZIP SOLO_GITHUB (incluye assets/).
   3. Abre …/index.html y, si quieres, instálala.
   En tablet/celular usa «Descargas automáticas» (esos navegadores no dejan elegir carpeta).

SEGURIDAD DE DATOS
- Base de datos propia (MiAulaPrepaDB): no se mezcla con MiAula CETIS.
- La copia automática nunca sobrescribe el archivo si de golpe se borraron muchos datos («Copia en pausa»).
- Versiones internas: Más -> Respaldo -> Versiones internas (las últimas 20).
- No borres «Datos del sitio» del navegador.

ACTUALIZAR
- HTML: reemplaza el archivo por el nuevo CON EL MISMO NOMBRE Y EN LA MISMA CARPETA
  (los datos dependen del navegador y del lugar del archivo). Antes, deja que se haga la copia automática.
- GitHub: Más -> Crear respaldo, sube el ZIP SOLO_GITHUB y abre …/index.html?actualizar=2.14.0.

DOCUMENTOS
- NOVEDADES_2.14.0.md, NOVEDADES_2.12.0.md   qué cambió.
- VALIDACION_2.14.0.md                       pruebas ejecutadas.
- Más -> Apariencia: paleta Alegre, Guinda / Vino o tu propio color; modo claro u oscuro.
- PROMPT_MAESTRO_MiAula_Prepa_2.14.0.md      para seguir el desarrollo en otra conversación.
- tools/build_single.py                      genera el HTML de un solo archivo
                                             (--edition palencia: edición especial «Mtro. Erick»).
