import logging

from django.contrib.auth import authenticate
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from ...permissions import user_role
from ...compartido.validacion import object_payload

logger = logging.getLogger("api.auth")


def iniciar_sesion(payload):
    data = object_payload(payload)
    username = data.get("username")
    password = data.get("password")
    if not isinstance(username, str) or not isinstance(password, str) or len(username) > 150 or len(password) > 256:
        return None
    user = authenticate(username=username.strip(), password=password)
    if user is None:
        logger.warning("Inicio de sesión rechazado")
        return None
    refresh = RefreshToken.for_user(user)
    refresh["username"] = user.username
    logger.info("Inicio de sesión correcto para usuario_id=%s", user.pk)
    return {
        "refresh": str(refresh), "access": str(refresh.access_token),
        "user": {"id": user.pk, "username": user.username, "name": user.get_full_name(), "role": user_role(user)},
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
