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

class ExpensesView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        page, search = pagination_params(request)
        return Response(list_expense_page(page, search))

    def post(self, request):
        data = object_payload(request.data)
        description = str(data.get("description", "")).strip()
        if not description or len(description) > 200:
            raise ValidationError({"description": "La descripción es obligatoria (máximo 200 caracteres)."})
        category_id = required_id(data.get("category_id"), "category_id")
        amount = decimal_value(data.get("amount"), "amount", strict=True)
        if not one("SELECT id FROM categorias_gasto WHERE id=%s", [category_id]):
            raise ValidationError({"category_id": "Categoría inválida."})
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO gastos (descripcion,id_categoria,monto,id_usuario) VALUES (%s,%s,%s,%s) RETURNING id", [description, category_id, amount, request.user.id])
            expense_id = cursor.fetchone()[0]
        return Response(one("""
            SELECT g.id,g.fecha,g.descripcion AS description,g.monto AS amount,
                   g.id_categoria AS category_id,c.nombre AS category
            FROM gastos g JOIN categorias_gasto c ON c.id=g.id_categoria
            WHERE g.id=%s
        """, [expense_id]), status=201)
