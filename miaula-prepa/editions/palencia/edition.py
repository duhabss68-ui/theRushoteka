"""Edición especial «Silver & Black» · Para Palencia.

La usa tools/build_single.py --edition palencia. Todo cambio se hace sobre la copia incrustada:
los archivos fuente (index.html, app.js, db.js…) no se modifican.
"""
import re

NAME = 'Palencia'
OUT = 'MiAula_Palencia_SilverBlack_{version}.html'
CSS = 'edition.css'
JS = 'edition.js'  # «Cambiar logo» (logo propio del maestro, guardado en su navegador)
EMBLEM = 'emblem.svg'
FONTS = {  # url(...) dentro de edition.css -> archivo incrustado
    'fonts/oswald-latin-500-normal.woff2': 'fonts/oswald-latin-500-normal.woff2',
    'fonts/oswald-latin-700-normal.woff2': 'fonts/oswald-latin-700-normal.woff2',
}

# Configuración que lee app.js (ruleta y confeti).
CONFIG = {
    'id': 'palencia',
    'name': 'Edición Silver & Black · Para Palencia',
    'wheelPalette': [
        {'fill': '#0A0A0B', 'text': '#F4F5F6'}, {'fill': '#A5ACAF', 'text': '#0A0A0B'},
        {'fill': '#2B2D30', 'text': '#F4F5F6'}, {'fill': '#D5D9DB', 'text': '#0A0A0B'},
        {'fill': '#4A4F53', 'text': '#FFFFFF'}, {'fill': '#7D8488', 'text': '#0A0A0B'},
    ],
    'wheelUsed': [{'fill': '#3A3D40', 'text': '#8D9397'}, {'fill': '#46494C', 'text': '#8D9397'}],
    'confettiColors': ['#FFFFFF', '#A5ACAF', '#D5D9DB', '#0A0A0B', '#6B7175', '#F4F5F6', '#2B2D30'],
}

# Datos y archivos propios: no se mezclan con MiAula Prepa aunque se abran en el mismo navegador.
CODE = {
    'db.js': [("const DB_NAME = 'MiAulaPrepaDB';", "const DB_NAME = 'MiAulaPalenciaDB';")],
    'autobackup.js': [
        ("const AB_DB='MiAulaPrepaAutoCopias'", "const AB_DB='MiAulaPalenciaAutoCopias'"),
        ('MiAula_Prepa_', 'MiAula_Palencia_', 'all'),
        ("data.appVersion='2.13.0-Prepa'", "data.appVersion='2.13.0-Palencia'"),
    ],
    'app.js': [
        ('MiAula_Prepa_2.13.0_Respaldo_', 'MiAula_Palencia_2.13.0_Respaldo_'),
        ("const THEME_KEY='miaula:theme';", "const THEME_KEY='miaula-palencia:theme';"),
        ("light?'#FFF7EF':'#140F26'", "light?'#E9EBEC':'#0A0A0B'"),
    ],
}


def html(src, emblem_uri):
    """Reemplazos del HTML. Cada uno debe aparecer exactamente una vez."""
    hero_brand = re.search(r'<div class="hero-brand">.*?</div></div>', src, re.S).group(0)
    splash = re.search(r'<div class="splash-inner">.*?</div>', src, re.S).group(0)
    reps = [
        ("<script>try{if(localStorage.getItem('miaula:theme')!=='dark')document.documentElement.setAttribute('data-theme','light');}catch(e){document.documentElement.setAttribute('data-theme','light');}</script>",
         "<script>try{if(localStorage.getItem('miaula-palencia:theme')==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}</script>"),
        ('<meta name="theme-color" content="#FFF7EF">', '<meta name="theme-color" content="#0A0A0B">'),
        ('<title>MiAula Slate 2.13.0 · Prepa</title>', '<title>Para Palencia · MiAula Silver &amp; Black</title>'),
        ('<meta name="apple-mobile-web-app-title" content="MiAula">', '<meta name="apple-mobile-web-app-title" content="Palencia">'),
        ('<div><strong>MiAula Slate</strong><span>2.13.0 · Prepa</span></div>', '<div><strong>Para Palencia</strong><span>Silver &amp; Black · 2.13.0</span></div>'),
        ('<h2>Control de bitácora</h2>', '<h2>Mtro. Erick</h2>'),
        ('<p class="hero-author">by Ing. Niccolás C.M.</p>', '<p class="hero-author">Cuaderno edición Silver &amp; Black · by Ing. Niccolás C.M.</p>'),
        (hero_brand, f'<div class="hero-brand"><div class="edition-emblem"><img src="{emblem_uri}" alt="Escudo Palencia"></div></div>'),
        (splash, f'<div class="splash-inner"><img src="{emblem_uri}" alt=""><b>Para <strong>Palencia</strong></b></div>'),
        ('<span class="version-badge">MiAula Slate · 2.13.0 Prepa</span>', '<span class="version-badge">Silver &amp; Black · Palencia</span>'),
        ('<h3>MiAula Slate 2.13.0 · Prepa</h3><p>Edición general para preparatoria: rubros de evaluación personalizables, equipos persistentes y libreta por equipos.</p>',
         '<h3>Para Palencia · Edición Silver &amp; Black</h3><p>Cuaderno especial basado en MiAula Slate 2.13.0 · Prepa: rubros personalizables, copia automática, equipos y libreta por equipos.</p>'),
    ]
    for old, new in reps:
        assert src.count(old) == 1, f'edición Palencia: no encontré una sola vez «{old[:60]}»'
        src = src.replace(old, new)
    return src
