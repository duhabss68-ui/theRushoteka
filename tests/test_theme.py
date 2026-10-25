"""Pruebas del sistema de temas (sin entorno gráfico)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from classroom_control.admin import theme as T  # noqa: E402


def test_palettes_share_keys():
    assert set(T.DARK.keys()) == set(T.LIGHT.keys()), "claro y oscuro deben tener las mismas claves"


def test_resolve_mode():
    assert T.resolve_mode("light") == "light"
    assert T.resolve_mode("dark") == "dark"
    assert T.resolve_mode("") in ("dark", "light")        # vacío -> sistema
    assert T.resolve_mode("system") in ("dark", "light")
    assert T.resolve_mode("CUALQUIERA") in ("dark", "light")


def test_palette_for():
    assert T.palette_for("light")["mode"] == "light"
    assert T.palette_for("dark")["mode"] == "dark"
    assert T.palette_for("otro")["mode"] == "dark"         # por defecto, oscuro


def test_palettes_are_distinct_and_sane():
    d, l = T.palette_for("dark"), T.palette_for("light")
    assert d["bg"] != l["bg"]
    for p in (d, l):
        assert p["text"] != p["bg"]
        assert p["panel"] != p["bg"]


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
