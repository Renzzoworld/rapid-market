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

class ProductListView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def get(self, request):
        raw_page = request.query_params.get("page", "1")
        search = request.query_params.get("search", "").strip()
        if len(search) > 120:
            raise ValidationError({"search": "La búsqueda debe tener hasta 120 caracteres."})
        try:
            page = int(raw_page)
            if page < 1:
                raise ValueError
        except (TypeError, ValueError):
            raise ValidationError({"page": "La página debe ser un entero mayor que cero."})
        return Response(list_product_page(page, search))

    def post(self, request):
        data = object_payload(request.data)
        name = str(data.get("name", "")).strip()
        if not name or len(name) > 120:
            raise ValidationError({"name": "El nombre es obligatorio y debe tener hasta 120 caracteres."})
        price = decimal_value(data.get("price"), "price", strict=True)
        minimum = decimal_value(data.get("min_stock", 5), "min_stock")
        unit_id = required_id(data.get("unit_id"), "unit_id")
        perishable = boolean_value(data.get("perishable"), "perishable")
        try:
            with connection.cursor() as cursor:
                cursor.execute("INSERT INTO productos (nombre,id_unidad,precio_venta,perecible,stock_minimo,activo) VALUES (%s,%s,%s,%s,%s,true) RETURNING id", [name, unit_id, price, perishable, minimum])
                product_id = cursor.fetchone()[0]
        except DatabaseError:
            raise ValidationError({"name": "No se pudo crear el producto. Verifica que el nombre no esté repetido y la unidad exista."})
        return Response(get_product(product_id), status=status.HTTP_201_CREATED)

class ProductDetailView(AdminWriteMixin, APIView):
    admin_methods = {"PATCH", "DELETE"}

    def get(self, request, product_id):
        product = get_product(product_id)
        if not product or not product["active"]:
            return Response({"detail": "Producto no encontrado."}, status=404)
        product["lots"] = list_product_lots(product_id)
        return Response(product)

    def patch(self, request, product_id):
        old = one("SELECT id,nombre,id_unidad,precio_venta,perecible,stock_minimo,activo FROM productos WHERE id=%s", [product_id])
        if not old or not old["activo"]:
            return Response({"detail": "Producto no encontrado."}, status=404)
        data = object_payload(request.data)
        values = [str(data.get("name", old["nombre"])).strip(), required_id(data.get("unit_id", old["id_unidad"]), "unit_id"), decimal_value(data.get("price", old["precio_venta"]), "price", strict=True), boolean_value(data.get("perishable"), "perishable", old["perecible"]), decimal_value(data.get("min_stock", old["stock_minimo"]), "min_stock"), product_id]
        if not values[0] or len(values[0]) > 120:
            raise ValidationError({"name": "Nombre inválido."})
        try:
            with connection.cursor() as cursor:
                cursor.execute("UPDATE productos SET nombre=%s,id_unidad=%s,precio_venta=%s,perecible=%s,stock_minimo=%s WHERE id=%s", values)
        except DatabaseError:
            raise ValidationError({"detail": "No se pudo actualizar; revisa que el nombre no esté repetido."})
        return Response(get_product(product_id))

    def delete(self, request, product_id):
        with connection.cursor() as cursor:
            cursor.execute("UPDATE productos SET activo=false WHERE id=%s AND activo=true", [product_id])
            if cursor.rowcount == 0:
                return Response({"detail": "Producto no encontrado o ya desactivado."}, status=404)
        return Response(status=204)
