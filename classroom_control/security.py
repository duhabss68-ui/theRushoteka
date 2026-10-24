"""Autenticación por desafío-respuesta con clave precompartida (HMAC-SHA256).

Modelo de seguridad (acorde a un aula institucional en LAN):

  - El administrador y todos los clientes comparten un *token* secreto que el
    centro configura en los ficheros .ini. No viaja por la red en claro.
  - Al conectar, el administrador (servidor) envía un ``nonce`` aleatorio.
    El cliente responde con HMAC-SHA256(token, nonce). El servidor verifica.
  - Esto evita que un equipo cualquiera de la red se conecte a la consola, y
    que un cliente acepte órdenes de una consola que no conoce el token.

Limitaciones honestas: el contenido (fotogramas, pulsaciones) viaja SIN cifrar.
Es adecuado para una LAN de aula cerrada y de confianza. Para redes abiertas,
el despliegue debería ir sobre una VPN o túnel TLS. Esto se documenta en el
README; el objetivo aquí es control de acceso, no confidencialidad de extremo
a extremo.
"""

from __future__ import annotations

import hashlib
import hmac
import os


def make_nonce(n: int = 32) -> str:
    """Genera un nonce hexadecimal criptográficamente aleatorio."""
    return os.urandom(n).hex()


def sign(token: str, nonce: str) -> str:
    """Calcula la respuesta HMAC-SHA256 del cliente para un desafío dado."""
    return hmac.new(token.encode("utf-8"), nonce.encode("utf-8"), hashlib.sha256).hexdigest()


def verify(token: str, nonce: str, mac: str) -> bool:
    """Comprueba la respuesta del cliente en tiempo constante."""
    expected = sign(token, nonce)
    return hmac.compare_digest(expected, mac or "")
