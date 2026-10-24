"""Utilidades de cifrado TLS (opcional) para ClassroomControl.

Cuando se activa, el tráfico entre la consola y los clientes va cifrado. El
servidor (profesor) presenta un certificado; el cliente lo verifica contra una
copia fijada (``ca_cert``), lo que impide intermediarios (MITM) en la red del
aula. La autenticación del cliente sigue haciéndose con el token HMAC: TLS
aporta confidencialidad; el token, control de acceso.

Como se usan direcciones IP y un certificado autofirmado propio del centro, se
desactiva la verificación de nombre de host y se fija el certificado como CA.
"""

from __future__ import annotations

import ssl


def make_server_context(certfile: str, keyfile: str) -> ssl.SSLContext:
    """Contexto TLS para la consola (lado servidor)."""
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=certfile, keyfile=keyfile)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    return ctx


def make_client_context(ca_cert: str) -> ssl.SSLContext:
    """Contexto TLS para el agente (lado cliente), fijando el certificado."""
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    # IPs en vez de nombres + certificado autofirmado: fijamos el cert como CA
    # y comprobamos que el servidor presenta exactamente ese.
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_REQUIRED
    ctx.load_verify_locations(cafile=ca_cert)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    return ctx
