"""Pruebas de carga de configuración (.ini) — sin GUI ni dependencias."""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from classroom_control.config import load_admin_config, load_client_config  # noqa: E402


def _write(tmp, name, text):
    path = os.path.join(tmp, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path


def test_client_defaults_when_no_file():
    cfg = load_client_config("/ruta/que/no/existe.ini")
    assert cfg.admin_port == 47800
    assert cfg.use_tls is False
    assert cfg.allow_lock is True


def test_client_parses_values():
    with tempfile.TemporaryDirectory() as tmp:
        path = _write(tmp, "client.ini",
                      "[client]\n"
                      "admin_host = 10.0.0.5\n"
                      "admin_port = 50000\n"
                      "token = secreto\n"
                      "allow_power = false\n"
                      "allow_lock = false\n"
                      "use_tls = true\n")
        cfg = load_client_config(path)
        assert cfg.admin_host == "10.0.0.5"
        assert cfg.admin_port == 50000
        assert cfg.token == "secreto"
        assert cfg.allow_power is False
        assert cfg.allow_lock is False
        assert cfg.use_tls is True


def test_admin_parses_values():
    with tempfile.TemporaryDirectory() as tmp:
        path = _write(tmp, "admin.ini",
                      "[admin]\n"
                      "listen_port = 51000\n"
                      "token = abc\n"
                      "columns = 10\n"
                      "focus_quality = 90\n"
                      "use_tls = true\n")
        cfg = load_admin_config(path)
        assert cfg.listen_port == 51000
        assert cfg.token == "abc"
        assert cfg.columns == 10
        assert cfg.focus_quality == 90
        assert cfg.use_tls is True


def test_example_inis_are_valid():
    """Los .example.ini del repo deben cargar sin romper."""
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    client_ex = os.path.join(here, "config", "client.example.ini")
    admin_ex = os.path.join(here, "config", "admin.example.ini")
    if os.path.isfile(client_ex):
        c = load_client_config(client_ex)
        assert c.admin_port > 0
    if os.path.isfile(admin_ex):
        a = load_admin_config(admin_ex)
        assert a.listen_port > 0


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
