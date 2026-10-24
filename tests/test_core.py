"""Pruebas del núcleo de red y autenticación (sin GUI ni dependencias externas).

Ejecutar con:  python -m pytest tests/  (o)  python tests/test_core.py
"""

import os
import socket
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from classroom_control import protocol as proto  # noqa: E402
from classroom_control import security  # noqa: E402


def test_security_challenge_response():
    token = "secreto-compartido"
    nonce = security.make_nonce()
    mac = security.sign(token, nonce)
    assert security.verify(token, nonce, mac)
    assert not security.verify("otro-token", nonce, mac)
    assert not security.verify(token, nonce, "mac-falso")
    # Dos nonces distintos no deben coincidir.
    assert security.make_nonce() != security.make_nonce()


def test_protocol_roundtrip_control_and_blob():
    a, b = socket.socketpair()
    try:
        # Mensaje solo-JSON.
        proto.send_msg(a, {"t": proto.T_PING})
        obj, blob = proto.recv_msg(b)
        assert obj["t"] == proto.T_PING and blob == b""

        # Mensaje con blob binario (simula un fotograma JPEG).
        payload = os.urandom(5000)
        proto.send_msg(a, {"t": proto.T_FRAME, "w": 640, "h": 360, "seq": 7}, payload)
        obj, blob = proto.recv_msg(b)
        assert obj["t"] == proto.T_FRAME and obj["w"] == 640 and obj["seq"] == 7
        assert blob == payload
    finally:
        a.close()
        b.close()


def test_protocol_rejects_bad_magic():
    a, b = socket.socketpair()
    try:
        a.sendall(b"XXXX" + b"\x00\x00\x00\x08" + b"........")
        try:
            proto.recv_msg(b)
            assert False, "debería haber lanzado ProtocolError"
        except proto.ProtocolError:
            pass
    finally:
        a.close()
        b.close()


def test_full_handshake_simulation():
    """Simula el apretón de manos admin<->cliente sobre sockets reales."""
    token = "clave-de-aula"
    server, client = socket.socketpair()
    result = {}

    def admin_side():
        nonce = security.make_nonce()
        proto.send_msg(server, {"t": proto.T_CHALLENGE, "nonce": nonce})
        msg, _ = proto.recv_msg(server)
        ok = msg.get("t") == proto.T_AUTH and security.verify(token, nonce, msg.get("mac", ""))
        proto.send_msg(server, {"t": proto.T_AUTH_OK if ok else proto.T_AUTH_FAIL})
        result["ok"] = ok
        result["host"] = msg.get("host")

    t = threading.Thread(target=admin_side)
    t.start()

    challenge, _ = proto.recv_msg(client)
    assert challenge["t"] == proto.T_CHALLENGE
    mac = security.sign(token, challenge["nonce"])
    proto.send_msg(client, {"t": proto.T_AUTH, "mac": mac, "host": "PC-ALUMNO-03",
                            "user": "alumno", "w": 1920, "h": 1080})
    final, _ = proto.recv_msg(client)
    t.join()

    assert result["ok"] is True
    assert result["host"] == "PC-ALUMNO-03"
    assert final["t"] == proto.T_AUTH_OK
    server.close()
    client.close()


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
    print("\nTodas las pruebas pasaron." if not failures else f"\n{failures} prueba(s) fallaron.")
    sys.exit(1 if failures else 0)
