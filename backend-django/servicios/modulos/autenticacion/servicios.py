import logging

from django.contrib.auth.hashers import check_password
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from .repositorio import usuario_por_nombre
from ...compartido.validacion import object_payload

logger = logging.getLogger("api.auth")


def iniciar_sesion(payload):
    data = object_payload(payload)
    username = data.get("username")
    password = data.get("password")
    if not isinstance(username, str) or not isinstance(password, str) or len(username) > 50 or len(password) > 256:
        return None
    user = usuario_por_nombre(username.strip())
    if user is None or not user[4] or not check_password(password, user[3]):
        logger.warning("Inicio de sesión rechazado")
        return None
    refresh = RefreshToken()
    refresh[api_settings.USER_ID_CLAIM] = user[0]
    refresh["username"] = user[1]
    logger.info("Inicio de sesión correcto para usuario_id=%s", user[0])
    return {
        "refresh": str(refresh), "access": str(refresh.access_token),
        "user": {"id": user[0], "username": user[1], "name": user[2], "role": user[6]},
    }


def cerrar_sesion(payload):
    data = object_payload(payload)
    raw_refresh = data.get("refresh")
    if not isinstance(raw_refresh, str) or len(raw_refresh) > 4096:
        raise ValidationError({"refresh": "Token de renovación no válido."})
    try:
        RefreshToken(raw_refresh).blacklist()
    except TokenError:
        raise ValidationError({"refresh": "Token de renovación no válido o ya revocado."})
