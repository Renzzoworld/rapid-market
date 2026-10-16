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

class SalesView(APIView):
    def get(self, request):
        administrator = is_administrator(request.user)
        user_id = None if administrator else request.user.id
        page, search = pagination_params(request)
        return Response(list_sales_page(user_id, administrator, page, search))

    @transaction.atomic
    def post(self, request):
        data = object_payload(request.data)
        lines = data.get("items")
        if not isinstance(lines, list) or not lines or len(lines) > 100 or any(not isinstance(line, Mapping) for line in lines):
            raise ValidationError({"items": "Agrega entre 1 y 100 productos."})
        sale_type_id = required_id(data.get("sale_type_id"), "sale_type_id")
        payment_id = required_id(data.get("payment_method_id"), "payment_method_id")
        sale_type = one("SELECT id,nombre,descuento_porcentaje FROM tipos_venta WHERE id=%s AND activo=true", [sale_type_id])
        if not sale_type or not one("SELECT id FROM metodos_pago WHERE id=%s AND activo=true", [payment_id]):
            raise ValidationError({"detail": "Tipo de venta o método de pago inválido."})
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO ventas (id_usuario,id_tipo_venta,id_metodo_pago) VALUES (%s,%s,%s) RETURNING id", [request.user.id, sale_type_id, payment_id])
            sale_id = cursor.fetchone()[0]
            for line in lines:
                product_id = required_id(line.get("product_id"), "product_id")
                quantity = decimal_value(line.get("quantity"), "quantity", strict=True)
                with connection.cursor() as stock_cursor:
                    stock_cursor.execute("""SELECT l.id,l.cantidad_actual,p.precio_venta FROM lotes l JOIN detalle_compras dc ON dc.id=l.id_detalle_compra JOIN compras c ON c.id=dc.id_compra JOIN estados_compra ec ON ec.id=c.id_estado JOIN productos p ON p.id=dc.id_producto WHERE dc.id_producto=%s AND p.activo=true AND ec.nombre='Entregado' AND l.cantidad_actual>0 AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE) ORDER BY l.fecha_vencimiento NULLS LAST,c.fecha,l.id FOR UPDATE OF l""", [product_id])
                    stock_lots = stock_cursor.fetchall()
                    stock = sum((lot[1] for lot in stock_lots), Decimal("0"))
                    product_price = stock_lots[0][2] if stock_lots else None
                    if product_price is None or quantity > stock:
                        raise ValidationError({"items": "Stock insuficiente o producto sin lotes disponibles."})
                    unit_price = (product_price * (Decimal("100") - sale_type["descuento_porcentaje"]) / Decimal("100")).quantize(Decimal("0.01"))
                    stock_cursor.execute("INSERT INTO detalle_ventas (id_venta,id_producto,cantidad,precio_unitario) VALUES (%s,%s,%s,%s) RETURNING id", [sale_id, product_id, quantity, unit_price])
                    detail_id = stock_cursor.fetchone()[0]
                    remaining = quantity
                    for lot_id, lot_qty, _ in stock_lots:
                        if remaining <= 0:
                            break
                        amount = min(lot_qty, remaining)
                        stock_cursor.execute("UPDATE lotes SET cantidad_actual=cantidad_actual-%s WHERE id=%s", [amount, lot_id])
                        stock_cursor.execute("INSERT INTO detalle_venta_lotes (id_detalle_venta,id_lote,cantidad) VALUES (%s,%s,%s)", [detail_id, lot_id, amount])
                        remaining -= amount
        administrator = is_administrator(request.user)
        user_id = None if administrator else request.user.id
        result = list_sales(user_id, include_costs=administrator, sale_id=sale_id)[0]
        return Response(result, status=201)
