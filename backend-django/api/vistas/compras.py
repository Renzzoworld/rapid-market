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

class PurchasesView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        page, search = pagination_params(request)
        return Response(list_purchase_page(page, search))

    @transaction.atomic
    def post(self, request):
        data = object_payload(request.data)
        provider_id = required_id(data.get("provider_id"), "provider_id")
        lines = data.get("items")
        if not isinstance(lines, list) or not lines or len(lines) > 100 or any(not isinstance(line, Mapping) for line in lines):
            raise ValidationError({"items": "Agrega entre 1 y 100 productos."})
        pending = one("SELECT id FROM estados_compra WHERE nombre='Pendiente de entrega'")
        if not pending or not one("SELECT id FROM proveedores WHERE id=%s AND activo=true", [provider_id]):
            raise ValidationError({"detail": "Proveedor o estado no configurado."})
        with connection.cursor() as cursor:
            cursor.execute("INSERT INTO compras (id_proveedor,id_estado,id_usuario) VALUES (%s,%s,%s) RETURNING id", [provider_id, pending["id"], request.user.id])
            purchase_id = cursor.fetchone()[0]
            for line in lines:
                product_id = required_id(line.get("product_id"), "product_id")
                quantity = decimal_value(line.get("quantity"), "quantity", strict=True)
                unit_price = decimal_value(line.get("unit_price"), "unit_price", strict=True)
                product = one("SELECT id,perecible FROM productos WHERE id=%s AND activo=true", [product_id])
                if not product:
                    raise ValidationError({"items": "Producto inválido."})
                cursor.execute("INSERT INTO detalle_compras (id_compra,id_producto,cantidad,precio_unitario) VALUES (%s,%s,%s,%s) RETURNING id", [purchase_id, product_id, quantity, unit_price])
                detail_id = cursor.fetchone()[0]
                cursor.execute("INSERT INTO lotes (id_detalle_compra,cantidad_inicial,cantidad_actual,fecha_vencimiento) VALUES (%s,%s,0,%s)", [detail_id, quantity, line.get("expiry_date") if product["perecible"] else None])
        return Response(list_purchases(purchase_id=purchase_id)[0], status=201)

class PurchaseActionView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    @transaction.atomic
    def post(self, request, purchase_id, action):
        data = object_payload(request.data)
        purchase = one("SELECT c.id,ec.nombre AS state FROM compras c JOIN estados_compra ec ON ec.id=c.id_estado WHERE c.id=%s FOR UPDATE", [purchase_id])
        if not purchase:
            return Response({"detail": "Compra no encontrada."}, status=404)
        if purchase["state"] != "Pendiente de entrega":
            raise ValidationError({"detail": "Solo se puede modificar una compra pendiente."})
        if action == "deliver":
            lines = rows("SELECT dc.id,p.perecible FROM detalle_compras dc JOIN productos p ON p.id=dc.id_producto WHERE dc.id_compra=%s", [purchase_id])
            expiries = data.get("expiries", {})
            if not isinstance(expiries, Mapping):
                raise ValidationError({"expiries": "Envía las fechas de vencimiento en un formato válido."})
            for line in lines:
                expiry = expiries.get(str(line["id"]))
                if line["perecible"] and not expiry:
                    raise ValidationError({"expiries": "Indica el vencimiento de todos los productos perecibles."})
                if expiry:
                    try:
                        expiry_date = date.fromisoformat(expiry)
                    except (ValueError, TypeError):
                        raise ValidationError({"expiries": "Fecha de vencimiento no válida."})
                    if expiry_date < timezone.localdate():
                        raise ValidationError({"expiries": "La fecha de vencimiento no puede estar en el pasado."})
                with connection.cursor() as cursor:
                    cursor.execute("UPDATE lotes SET cantidad_actual=cantidad_inicial,fecha_vencimiento=%s WHERE id_detalle_compra=%s", [expiry or None, line["id"]])
            new_state = "Entregado"
        elif action == "cancel":
            new_state = "Cancelado"
        else:
            return Response({"detail": "Acción no válida."}, status=404)
        state = one("SELECT id FROM estados_compra WHERE nombre=%s", [new_state])
        with connection.cursor() as cursor:
            cursor.execute("UPDATE compras SET id_estado=%s WHERE id=%s", [state["id"], purchase_id])
        return Response(list_purchases(purchase_id=purchase_id)[0])
