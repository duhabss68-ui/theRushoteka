MIAULA SLATE 2.12.0 · PREPA (edición general para preparatoria)

QUÉ ES
Versión general de MiAula para preparatoria/bachillerato, basada en MiAula 2.11.0 CETIS.
Conserva todas las funciones y agrega RUBROS ADICIONALES al calificar (Más -> Parcial -> Rubros adicionales).

INSTALACIÓN NUEVA (recomendada: repositorio propio, p. ej. «miaula-prepa»)
1. Crea un repositorio en GitHub y activa GitHub Pages.
2. Sube los archivos del ZIP SOLO_GITHUB y la carpeta assets/.
3. Abre https://TU-USUARIO.github.io/miaula-prepa/index.html y, si quieres, instálala como app.

SEGURIDAD DE DATOS
- La edición Prepa usa su PROPIA base de datos (MiAulaPrepaDB) y su propia caché (miaula-prepa-*).
  Aunque esté en el mismo sitio que MiAula CETIS, no lee, no cambia y no borra los datos de CETIS.
- Para pasar datos de CETIS a Prepa: en CETIS, Más -> Crear respaldo; en Prepa, Más -> Respaldo -> Restaurar.
  El formato de respaldo es el mismo.
- No borres «Datos del sitio» ni IndexedDB.

ACTUALIZAR UNA INSTALACIÓN PREPA EXISTENTE
1. Más -> Crear respaldo.
2. Sube los archivos del ZIP SOLO_GITHUB.
3. Abre …/index.html?actualizar=2.12.0, recarga, cierra la app y vuelve a abrirla.

DOCUMENTOS
- NOVEDADES_2.12.0.md   qué cambió y cómo se usan los rubros.
- VALIDACION_2.12.0.md  pruebas ejecutadas.
- PROMPT_MAESTRO_MiAula_Prepa_2.12.0.md  para continuar el desarrollo en otra conversación.
