#!/usr/bin/env python3
"""Genera un certificado autofirmado para el cifrado TLS de ClassroomControl.

Produce dos ficheros en la carpeta actual (o la indicada):
  - server.key : clave privada del profesor (NO compartir).
  - server.crt : certificado público (copiar a cada cliente como ca_cert).

Uso:
    python tools/generate_cert.py [carpeta_destino]

Requiere la librería 'cryptography':  pip install cryptography
"""

from __future__ import annotations

import datetime
import os
import sys


def main(out_dir: str = ".") -> None:
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.x509.oid import NameOID
    except ImportError:
        print("Falta la librería 'cryptography'. Instálala con:  pip install cryptography")
        sys.exit(1)

    os.makedirs(out_dir, exist_ok=True)
    key_path = os.path.join(out_dir, "server.key")
    crt_path = os.path.join(out_dir, "server.crt")

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "ClassroomControl")])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=3650))  # 10 años
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256())
    )

    with open(key_path, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))
    with open(crt_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print("Certificado generado:")
    print("  ", os.path.abspath(key_path), " (privado, queda SOLO en el profesor)")
    print("  ", os.path.abspath(crt_path), " (copiar a cada cliente como ca_cert)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
