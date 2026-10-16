import logging
from datetime import date
from decimal import Decimal, InvalidOperation
from collections.abc import Mapping

from django.contrib.auth.hashers import check_password
from django.db import connection, transaction, DatabaseError
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from ..authentication import lookup_database_user
from ..permissions import IsAdministrator, is_administrator

from ..consultas import *
from .base import AdminWriteMixin

class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        data = object_payload(request.data)
        username = data.get("username")
        password = data.get("password")
        if not isinstance(username, str) or not isinstance(password, str) or len(username) > 50 or len(password) > 256:
            return Response({"detail": "Usuario o contraseña incorrectos."}, status=401)
        user = lookup_database_user(username.strip())
        if user is None or not user[4] or not check_password(password, user[3]):
            logger.warning("Inicio de sesión rechazado")
            return Response({"detail": "Usuario o contraseña incorrectos."}, status=401)
        refresh = RefreshToken()
        refresh[api_settings.USER_ID_CLAIM] = user[0]
        refresh["username"] = user[1]
        logger.info("Inicio de sesión correcto para usuario_id=%s", user[0])
        return Response({"refresh": str(refresh), "access": str(refresh.access_token), "user": {"id": user[0], "username": user[1], "name": user[2], "role": user[6]}})

class LogoutView(APIView):
    def post(self, request):
        data = object_payload(request.data)
        raw_refresh = data.get("refresh")
        if not isinstance(raw_refresh, str) or len(raw_refresh) > 4096:
            raise ValidationError({"refresh": "Token de renovación no válido."})
        try:
            RefreshToken(raw_refresh).blacklist()
        except TokenError:
            raise ValidationError({"refresh": "Token de renovación no válido o ya revocado."})
        return Response(status=status.HTTP_204_NO_CONTENT)
