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

class ReferenceDataView(APIView):
    def get(self, request):
        references = {
            "units": rows("SELECT id,nombre AS name,abreviatura FROM unidades_medida ORDER BY nombre"),
            "providers": rows("SELECT id,nombre AS name FROM proveedores WHERE activo=true ORDER BY nombre"),
            "payment_methods": rows("SELECT id,nombre AS name FROM metodos_pago WHERE activo=true ORDER BY nombre"),
            "sale_types": rows("SELECT id,nombre AS name,descuento_porcentaje AS discount FROM tipos_venta WHERE activo=true ORDER BY nombre"),
            "expense_categories": rows("SELECT id,nombre AS name FROM categorias_gasto ORDER BY nombre"),
        }
        if not is_administrator(request.user):
            references["providers"] = []
            references["expense_categories"] = []
        return Response(references)

class ProvidersView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def post(self, request):
        data = object_payload(request.data)
        name = str(data.get("name", "")).strip()
        if not name or len(name) > 150:
            raise ValidationError({"name": "El nombre es obligatorio y debe tener hasta 150 caracteres."})
        try:
            with connection.cursor() as cursor:
                cursor.execute("INSERT INTO proveedores (nombre,activo) VALUES (%s,true) RETURNING id,nombre AS name", [name])
                provider_id, provider_name = cursor.fetchone()
        except DatabaseError:
            raise ValidationError({"name": "Ese proveedor ya existe o los datos no son válidos."})
        return Response({"id": provider_id, "name": provider_name}, status=status.HTTP_201_CREATED)
