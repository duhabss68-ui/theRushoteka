#!/usr/bin/env python3
"""Genera la versión de UN SOLO ARCHIVO de MiAula Prepa (todo incrustado: estilos, scripts e iconos).

Uso:  python3 tools/build_single.py                     -> dist/MiAula_Prepa_<versión>.html
      python3 tools/build_single.py --edition valencia  -> edición especial (editions/valencia/)
Se abre con doble clic (file://), funciona sin internet y sin servidor. No usa service worker.
"""
import base64, json, os, re, runpy, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = ['db.js', 'xlsx-lite.js', 'rubricas.js', 'app.js', 'autobackup.js']

def read(name):
    with open(os.path.join(ROOT, name), encoding='utf-8') as f:
        return f.read()

def data_uri(rel, mime='image/png'):
    with open(os.path.join(ROOT, rel), 'rb') as f:
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode()

def apply_code(name, code, edition):
    for rep in (edition or {}).get('CODE', {}).get(name, []):
        old, new = rep[0], rep[1]
        count = code.count(old)
        assert count >= 1 if len(rep) > 2 else count == 1, f'{name}: «{old}» aparece {count} veces'
        code = code.replace(old, new)
    return code

def main():
    edition, ed_dir = None, None
    if '--edition' in sys.argv:
        ed_name = sys.argv[sys.argv.index('--edition') + 1]
        ed_dir = os.path.join('editions', ed_name)
        edition = runpy.run_path(os.path.join(ROOT, ed_dir, 'edition.py'))
    html = read('index.html')
    m = re.search(r'<title>MiAula Slate ([\d.]+)', html)
    version = m.group(1) if m else 'X'
    icon = data_uri('assets/icon-books-192.png')
    if edition:
        icon = data_uri(os.path.join(ed_dir, edition['EMBLEM']), 'image/svg+xml')
        html = edition['html'](html, icon)
        html = re.sub(r'<link rel="icon" type="image/png"', '<link rel="icon" type="image/svg+xml"', html)

    html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
    html = re.sub(r'(?:\.\/)?assets/icon-books-192\.png\?v=[\d.]+', icon, html)
    css = read('styles.css')
    css, n = re.subn(r'@import url\("\./styles-legacy\.css\?v=[\d.]+"\);', lambda _: read('styles-legacy.css'), css)
    assert n == 1, 'no se encontró el @import de styles-legacy.css'
    assert '@import' not in css
    if edition:
        ed_css = read(os.path.join(ed_dir, edition['CSS']))
        for ref, rel in edition.get('FONTS', {}).items():
            assert ref in ed_css, f'falta {ref} en la hoja de la edición'
            ed_css = ed_css.replace(ref, data_uri(os.path.join(ed_dir, rel), 'font/woff2'))
        css += '\n' + ed_css
    css = css.replace('</style', '<\\/style')
    html, n = re.subn(r'<link rel="stylesheet" href="styles\.css\?v=[\d.]+">',
                      lambda _: '<style>\n' + css + '\n</style>', html)
    assert n == 1, 'no se encontró la hoja de estilos'

    for name in SCRIPTS:
        code = apply_code(name, read(name), edition)
        assert '</script' not in code.lower(), f'{name} contiene </script>'
        pat = r'<script src="' + re.escape(name) + r'\?v=[\d.]+"></script>'
        html, n = re.subn(pat, lambda _: '<script>\n' + code + '\n</script>', html)
        assert n == 1, f'no se encontró <script src="{name}">'
    # Marca de archivo único: sin service worker.
    flags = 'window.MIAULA_SINGLE_FILE=true;'
    if edition:
        flags += 'window.MIAULA_EDITION=' + json.dumps(edition['CONFIG'], ensure_ascii=False) + ';'
    html = html.replace('<head>', '<head>\n  <script>' + flags + '</script>', 1)
    assert 'src="assets/' not in html and 'href="assets/' not in html

    out_dir = os.path.join(ROOT, 'dist')
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, edition['OUT'].format(version=version) if edition else f'MiAula_Prepa_{version}.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(html)
    print(out, f'{os.path.getsize(out)//1024} KB')

if __name__ == '__main__':
    sys.exit(main())
