"""Pruebas de las acciones del cliente (guardar archivo y bloqueo de webs).

La manipulación del fichero hosts se prueba apuntando a un fichero temporal,
así es válida en cualquier sistema operativo.
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from classroom_control.client import actions  # noqa: E402


def test_save_file_sanitizes_name_and_writes():
    with tempfile.TemporaryDirectory() as tmp:
        # Un nombre con separadores de ruta no debe escapar de la carpeta.
        path = actions.save_file("..\\..\\evil name.txt", b"hola", tmp)
        assert path is not None
        assert os.path.dirname(os.path.abspath(path)) == os.path.abspath(tmp)
        with open(path, "rb") as f:
            assert f.read() == b"hola"


def test_webblocker_rewrite_adds_and_removes_block():
    with tempfile.TemporaryDirectory() as tmp:
        hosts = os.path.join(tmp, "hosts")
        with open(hosts, "w", encoding="utf-8") as f:
            f.write("127.0.0.1 localhost\n")

        original = actions._HOSTS
        actions._HOSTS = hosts
        try:
            wb = actions.WebBlocker()
            wb._rewrite(["youtube.com", "http://facebook.com/"])
            content = open(hosts, encoding="utf-8").read()
            assert "127.0.0.1 localhost" in content          # se conserva lo previo
            assert actions._MARK_BEGIN in content and actions._MARK_END in content
            assert "127.0.0.1 youtube.com" in content
            assert "127.0.0.1 www.youtube.com" in content
            assert "127.0.0.1 facebook.com" in content       # se normaliza el esquema/barra

            # Desbloquear: el bloque desaparece y lo previo permanece.
            wb._rewrite([])
            content = open(hosts, encoding="utf-8").read()
            assert actions._MARK_BEGIN not in content
            assert "youtube.com" not in content
            assert "127.0.0.1 localhost" in content
        finally:
            actions._HOSTS = original


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  OK  {name}")
            except Exception as exc:  # noqa: BLE001
                failures += 1
                print(f"FAIL  {name}: {exc}")
    print("\nTodas las pruebas pasaron." if not failures else f"\n{failures} fallo(s).")
    sys.exit(1 if failures else 0)
