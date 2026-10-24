"""Pruebas de integración del servidor: latido, detección de caídos y proyección.

Usan un cliente simulado sobre sockets reales (sin GUI). Se aceleran los
tiempos del latido ajustando las constantes del módulo del servidor.
"""

import os
import socket
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from classroom_control import protocol as proto  # noqa: E402
from classroom_control import security  # noqa: E402
from classroom_control.admin import server as server_mod  # noqa: E402
from classroom_control.config import AdminConfig  # noqa: E402

_PORT = 47000


def _next_port():
    global _PORT
    _PORT += 1
    return _PORT


def _connect_and_auth(port, token="tok", host="PC-X", user="u"):
    s = socket.create_connection(("127.0.0.1", port), timeout=5)
    ch, _ = proto.recv_msg(s)
    assert ch["t"] == proto.T_CHALLENGE
    proto.send_msg(s, {"t": proto.T_AUTH, "mac": security.sign(token, ch["nonce"]),
                       "host": host, "user": user, "w": 1920, "h": 1080})
    assert proto.recv_msg(s)[0]["t"] == proto.T_AUTH_OK
    return s


def _recv_until(sock, t, timeout=5):
    sock.settimeout(timeout)
    deadline = time.time() + timeout
    while time.time() < deadline:
        obj, blob = proto.recv_msg(sock)
        if obj.get("t") == t:
            return obj, blob
    raise AssertionError(f"no llegó un mensaje de tipo {t}")


def test_heartbeat_ping_is_sent():
    server_mod.HEARTBEAT_INTERVAL = 0.3
    server_mod.DEAD_TIMEOUT = 30.0
    port = _next_port()
    srv = server_mod.AdminServer(AdminConfig(listen_host="127.0.0.1", listen_port=port, token="tok"))
    srv.start(); time.sleep(0.2)
    s = _connect_and_auth(port)
    try:
        obj, _ = _recv_until(s, proto.T_PING, timeout=3)
        assert obj["t"] == proto.T_PING
    finally:
        s.close(); srv.stop()


def test_dead_client_is_dropped():
    server_mod.HEARTBEAT_INTERVAL = 0.3
    server_mod.DEAD_TIMEOUT = 1.0
    port = _next_port()
    srv = server_mod.AdminServer(AdminConfig(listen_host="127.0.0.1", listen_port=port, token="tok"))
    srv.start(); time.sleep(0.2)
    s = _connect_and_auth(port)
    time.sleep(0.4)
    assert len(srv.clients()) == 1          # vivo al principio
    # No respondemos nada: tras DEAD_TIMEOUT el servidor debe cerrarnos.
    time.sleep(1.6)
    assert len(srv.clients()) == 0, "el cliente muerto debería haberse eliminado"
    s.close(); srv.stop()


def test_pong_keeps_client_alive():
    server_mod.HEARTBEAT_INTERVAL = 0.3
    server_mod.DEAD_TIMEOUT = 1.0
    port = _next_port()
    srv = server_mod.AdminServer(AdminConfig(listen_host="127.0.0.1", listen_port=port, token="tok"))
    srv.start(); time.sleep(0.2)
    s = _connect_and_auth(port)
    s.settimeout(1.0)
    # Respondemos a los pings durante ~2s (más que DEAD_TIMEOUT).
    end = time.time() + 2.0
    while time.time() < end:
        try:
            obj, _ = proto.recv_msg(s)
            if obj.get("t") == proto.T_PING:
                proto.send_msg(s, {"t": proto.T_PONG})
        except socket.timeout:
            pass
    assert len(srv.clients()) == 1, "un cliente que responde al latido no debe eliminarse"
    s.close(); srv.stop()


def test_broadcast_reaches_all_clients():
    server_mod.HEARTBEAT_INTERVAL = 5.0
    server_mod.DEAD_TIMEOUT = 30.0
    port = _next_port()
    srv = server_mod.AdminServer(AdminConfig(listen_host="127.0.0.1", listen_port=port, token="tok"))
    srv.start(); time.sleep(0.2)
    a = _connect_and_auth(port, host="PC-A")
    b = _connect_and_auth(port, host="PC-B")
    time.sleep(0.2)
    try:
        srv.broadcast_show(True)
        srv.broadcast_frame(b"JPEGDATA", 320, 180)
        for s in (a, b):
            obj, _ = _recv_until(s, proto.T_BCAST)
            assert obj["on"] is True
            obj, blob = _recv_until(s, proto.T_BCAST_FRAME)
            assert blob == b"JPEGDATA" and obj["w"] == 320
    finally:
        a.close(); b.close(); srv.stop()


def test_proclist_roundtrip():
    server_mod.HEARTBEAT_INTERVAL = 5.0
    server_mod.DEAD_TIMEOUT = 30.0
    port = _next_port()
    srv = server_mod.AdminServer(AdminConfig(listen_host="127.0.0.1", listen_port=port, token="tok"))
    srv.start(); time.sleep(0.2)
    s = _connect_and_auth(port); time.sleep(0.2)
    c = srv.clients()[0]
    try:
        srv.request_proclist(c.id)
        _recv_until(s, proto.T_PROCLIST)
        proto.send_msg(s, {"t": proto.T_PROCLIST_RESP, "procs": [{"name": "chrome.exe", "pid": 42}]})
        time.sleep(0.3)
        assert c.proclist and c.proclist[0]["pid"] == 42
        assert c.proclist_counter >= 1
    finally:
        s.close(); srv.stop()


def test_management_commands_reach_client():
    server_mod.HEARTBEAT_INTERVAL = 5.0
    server_mod.DEAD_TIMEOUT = 30.0
    port = _next_port()
    srv = server_mod.AdminServer(AdminConfig(listen_host="127.0.0.1", listen_port=port, token="tok"))
    srv.start(); time.sleep(0.2)
    s = _connect_and_auth(port); time.sleep(0.2)
    c = srv.clients()[0]
    try:
        srv.kill_process(c.id, pid=99)
        obj, _ = _recv_until(s, proto.T_KILL)
        assert obj["pid"] == 99

        srv.set_appblock(c.id, ["x.exe"], True)
        obj, _ = _recv_until(s, proto.T_APPBLOCK)
        assert obj["on"] is True and "x.exe" in obj["names"]

        srv.set_webblock(c.id, ["y.com"], True)
        obj, _ = _recv_until(s, proto.T_WEBBLOCK)
        assert "y.com" in obj["domains"]

        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as tf:
            tf.write(b"datos")
            fp = tf.name
        srv.broadcast_file(fp)
        obj, blob = _recv_until(s, proto.T_FILE)
        assert blob == b"datos" and obj["name"].endswith(".txt")
        os.unlink(fp)
    finally:
        s.close(); srv.stop()


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
