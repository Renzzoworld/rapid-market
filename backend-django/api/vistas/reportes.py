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
from .referencias import ReferenceDataView

class ReportsView(AdminWriteMixin, APIView):
    admin_methods = {"GET"}
    def get(self, request):
        page, _ = pagination_params(request)
        offset = (page - 1) * PAGE_SIZE
        start = request.query_params.get("from")
        end = request.query_params.get("to")
        try:
            if start: date.fromisoformat(start)
            if end: date.fromisoformat(end)
            if start and end and start > end: raise ValueError
        except ValueError:
            raise ValidationError({"detail": "Rango de fechas no válido."})
        sales_count = one("SELECT COUNT(DISTINCT DATE(v.fecha)) AS total FROM ventas v WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date)", [start,start,end,end])["total"]
        purchases_count = one("SELECT COUNT(*) AS total FROM compras c WHERE (%s IS NULL OR c.fecha::date >= %s::date) AND (%s IS NULL OR c.fecha::date <= %s::date)", [start,start,end,end])["total"]
        expenses_count = one("SELECT COUNT(*) AS total FROM gastos g WHERE (%s IS NULL OR g.fecha::date >= %s::date) AND (%s IS NULL OR g.fecha::date <= %s::date)", [start,start,end,end])["total"]
        products_count = one("SELECT COUNT(*) AS total FROM productos WHERE activo=true")["total"]
        sales = rows("SELECT DATE(v.fecha) AS day,COALESCE(SUM(d.cantidad*d.precio_unitario),0) AS total,COUNT(DISTINCT v.id) AS count FROM ventas v LEFT JOIN detalle_ventas d ON d.id_venta=v.id WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date) GROUP BY DATE(v.fecha) ORDER BY day DESC LIMIT %s OFFSET %s", [start,start,end,end,PAGE_SIZE,offset])
        expenses = one("SELECT COALESCE(SUM(monto),0) AS total FROM gastos WHERE (%s IS NULL OR fecha::date >= %s::date) AND (%s IS NULL OR fecha::date <= %s::date)", [start,start,end,end])
        purchases = one("SELECT COALESCE(SUM(dc.cantidad*dc.precio_unitario),0) AS total FROM compras c JOIN estados_compra ec ON ec.id=c.id_estado JOIN detalle_compras dc ON dc.id_compra=c.id WHERE ec.nombre='Entregado' AND (%s IS NULL OR c.fecha::date >= %s::date) AND (%s IS NULL OR c.fecha::date <= %s::date)", [start,start,end,end])
        cost_summary = one("""SELECT COALESCE(SUM(dvl.cantidad * dc.precio_unitario), 0) AS total
                            FROM ventas v
                            JOIN detalle_ventas dv ON dv.id_venta = v.id
                            JOIN detalle_venta_lotes dvl ON dvl.id_detalle_venta = dv.id
                            JOIN lotes l ON l.id = dvl.id_lote
                            JOIN detalle_compras dc ON dc.id = l.id_detalle_compra
                            WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date)""", [start,start,end,end])
        # Compute missing-cost sales separately to avoid multiplying costs across joins.
        missing_costs = one("""SELECT COUNT(DISTINCT v.id) AS count
                               FROM ventas v JOIN detalle_ventas dv ON dv.id_venta = v.id
                               WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date)
                                 AND (SELECT COALESCE(SUM(dvl.cantidad), 0) FROM detalle_venta_lotes dvl WHERE dvl.id_detalle_venta = dv.id) < dv.cantidad""", [start,start,end,end])
        purchase_rows = rows("SELECT c.id,c.fecha,p.nombre AS provider,ec.nombre AS state,COALESCE(SUM(dc.cantidad*dc.precio_unitario),0) AS total FROM compras c JOIN proveedores p ON p.id=c.id_proveedor JOIN estados_compra ec ON ec.id=c.id_estado LEFT JOIN detalle_compras dc ON dc.id_compra=c.id WHERE (%s IS NULL OR c.fecha::date >= %s::date) AND (%s IS NULL OR c.fecha::date <= %s::date) GROUP BY c.id,p.nombre,ec.nombre ORDER BY c.fecha DESC,c.id DESC LIMIT %s OFFSET %s", [start,start,end,end,PAGE_SIZE,offset])
        expense_rows = rows("SELECT g.id,g.fecha,g.descripcion AS description,g.monto AS amount,c.nombre AS category FROM gastos g JOIN categorias_gasto c ON c.id=g.id_categoria WHERE (%s IS NULL OR g.fecha::date >= %s::date) AND (%s IS NULL OR g.fecha::date <= %s::date) ORDER BY g.fecha DESC,g.id DESC LIMIT %s OFFSET %s", [start,start,end,end,PAGE_SIZE,offset])
        sales_total = one(
            "SELECT COALESCE(SUM(d.cantidad*d.precio_unitario),0) AS total "
            "FROM ventas v LEFT JOIN detalle_ventas d ON d.id_venta=v.id "
            "WHERE (%s IS NULL OR v.fecha::date >= %s::date) "
            "AND (%s IS NULL OR v.fecha::date <= %s::date)",
            [start, start, end, end],
        )["total"]
        estimated_profit = sales_total - cost_summary["total"] - expenses["total"]
        product_rows = list_product_page(page)["results"]
        return Response({"sales": sales, "sales_total": sales_total,
                         "cost_of_goods_sold": cost_summary["total"],
                         "expenses_total": expenses["total"],
                         "estimated_profit": estimated_profit,
                         "sales_without_complete_cost": missing_costs["count"],
                         "purchases_total": purchases["total"],
                         "products": product_rows, "purchases": purchase_rows, "expenses": expense_rows,
                         "page": page, "page_size": PAGE_SIZE,
                         "counts": {"sales": sales_count, "products": products_count,
                                    "purchases": purchases_count, "expenses": expenses_count}})

class DashboardView(APIView):
    def get(self, request):
        administrator = is_administrator(request.user)
        summary = dashboard_summary(
            user_id=None if administrator else request.user.id,
            include_financials=administrator,
        )
        summary["references"] = ReferenceDataView().get(request).data
        return Response(summary)
