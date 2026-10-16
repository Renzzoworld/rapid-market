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
from .authentication import lookup_database_user
from .permissions import IsAdministrator, is_administrator

PAGE_SIZE = 10

def rows(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        names = [col[0] for col in cursor.description]
        return [dict(zip(names, row)) for row in cursor.fetchall()]

def one(sql, params=()):
    result = rows(sql, params)
    return result[0] if result else None

def required_id(value, field):
    try:
        result = int(value)
        if result < 1:
            raise ValueError
        return result
    except (TypeError, ValueError):
        raise ValidationError({field: "Selecciona una opción válida."})

def decimal_value(value, field, *, minimum=Decimal("0"), strict=False):
    try:
        result = Decimal(str(value))
        if not result.is_finite() or result > Decimal("999999999.999") or (result <= minimum if strict else result < minimum):
            raise InvalidOperation
        return result
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field: "Ingresa un número válido y mayor que cero." if strict else "Ingresa un número válido no negativo."})

def boolean_value(value, field, default=False):
    if value is None:
        return default
    if not isinstance(value, bool):
        raise ValidationError({field: "El valor debe ser verdadero o falso."})
    return value

def object_payload(data):
    if not isinstance(data, Mapping):
        raise ValidationError({"detail": "Envía los datos en formato de objeto."})
    return data

def get_product(product_id):
    return one("""
        SELECT p.id, p.nombre AS name, p.precio_venta AS price,
               p.perecible AS perishable, p.stock_minimo AS min_stock,
               p.activo AS active, u.id AS unit_id, u.nombre AS unit,
               u.abreviatura AS unit_abbr,
               COALESCE(SUM(CASE
                   WHEN ec.nombre = 'Entregado'
                     AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
                   THEN l.cantidad_actual ELSE 0
               END), 0) AS stock,
               COUNT(DISTINCT l.id) FILTER (WHERE ec.nombre = 'Entregado') AS lot_count
        FROM productos p
        JOIN unidades_medida u ON u.id = p.id_unidad
        LEFT JOIN detalle_compras dc ON dc.id_producto = p.id
        LEFT JOIN compras c ON c.id = dc.id_compra
        LEFT JOIN estados_compra ec ON ec.id = c.id_estado
        LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
        WHERE p.id = %s
        GROUP BY p.id, u.id
    """, [product_id])

def list_product_lots(product_id):
    return rows("""
        SELECT c.id AS purchase_id, c.fecha AS purchase_date, l.id AS lot_id,
               p.nombre AS product, u.abreviatura AS unit,
               l.cantidad_inicial AS initial_quantity,
               l.cantidad_actual AS current_quantity,
               l.fecha_vencimiento AS expiry_date
        FROM lotes l
        JOIN detalle_compras dc ON dc.id = l.id_detalle_compra
        JOIN compras c ON c.id = dc.id_compra
        JOIN estados_compra ec ON ec.id = c.id_estado
        JOIN productos p ON p.id = dc.id_producto
        JOIN unidades_medida u ON u.id = p.id_unidad
        WHERE dc.id_producto = %s AND ec.nombre = 'Entregado'
        ORDER BY c.fecha DESC, l.id DESC
    """, [product_id])

def list_product_page(page, search=""):
    search_term = f"%{search}%"
    total = one(
        "SELECT COUNT(*) AS total FROM productos WHERE activo=true AND nombre ILIKE %s",
        [search_term],
    )["total"]
    page_size = 10
    total_pages = (total + page_size - 1) // page_size
    page = min(page, max(total_pages, 1))
    products = rows("""
        WITH product_page AS (
            SELECT p.id, p.nombre AS name, p.precio_venta AS price,
                   p.perecible AS perishable, p.stock_minimo AS min_stock,
                   p.activo AS active, u.id AS unit_id, u.nombre AS unit,
                   u.abreviatura AS unit_abbr
            FROM productos p
            JOIN unidades_medida u ON u.id = p.id_unidad
            WHERE p.activo=true AND p.nombre ILIKE %s
            ORDER BY p.nombre, p.id
            LIMIT %s OFFSET %s
        )
        SELECT pp.id, pp.name, pp.price, pp.perishable, pp.min_stock, pp.active,
               pp.unit_id, pp.unit, pp.unit_abbr,
               COALESCE(SUM(CASE
                   WHEN ec.nombre = 'Entregado'
                     AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
                   THEN l.cantidad_actual ELSE 0
               END), 0) AS stock,
               COUNT(DISTINCT l.id) FILTER (WHERE ec.nombre = 'Entregado') AS lot_count
        FROM product_page pp
        LEFT JOIN detalle_compras dc ON dc.id_producto = pp.id
        LEFT JOIN compras c ON c.id = dc.id_compra
        LEFT JOIN estados_compra ec ON ec.id = c.id_estado
        LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
        GROUP BY pp.id, pp.name, pp.price, pp.perishable, pp.min_stock,
                 pp.active, pp.unit_id, pp.unit, pp.unit_abbr
        ORDER BY pp.name, pp.id
    """, [search_term, page_size, (page - 1) * page_size])
    return {
        "results": products,
        "count": total,
        "page": page,
        "page_size": page_size,
    }

def list_sales(user_id=None, include_costs=True, *, page=None, search="", sale_id=None):
    conditions = []
    params = []
    if user_id is not None:
        conditions.append("v.id_usuario = %s")
        params.append(user_id)
    if sale_id is not None:
        conditions.append("v.id = %s")
        params.append(sale_id)
    if search:
        search_term = f"%{search}%"
        conditions.append("""(
            v.id::text ILIKE %s OR v.fecha::date::text ILIKE %s OR
            tv.nombre ILIKE %s OR mp.nombre ILIKE %s OR EXISTS (
                SELECT 1 FROM detalle_ventas dv_search
                JOIN productos p_search ON p_search.id = dv_search.id_producto
                WHERE dv_search.id_venta = v.id AND p_search.nombre ILIKE %s
            )
        )""")
        params.extend([search_term] * 5)
    sales_filter = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    cost_fields = """
               ,COALESCE((SELECT SUM(dvl.cantidad * dc.precio_unitario)
                         FROM detalle_ventas dv_cost
                         JOIN detalle_venta_lotes dvl ON dvl.id_detalle_venta = dv_cost.id
                         JOIN lotes l ON l.id = dvl.id_lote
                         JOIN detalle_compras dc ON dc.id = l.id_detalle_compra
                         WHERE dv_cost.id_venta = v.id), 0) AS cost_of_goods_sold,
               NOT EXISTS (
                   SELECT 1 FROM detalle_ventas dv_missing
                   WHERE dv_missing.id_venta = v.id
                     AND (SELECT COALESCE(SUM(dvl_missing.cantidad), 0)
                          FROM detalle_venta_lotes dvl_missing
                          WHERE dvl_missing.id_detalle_venta = dv_missing.id) < dv_missing.cantidad
               ) AS cost_data_complete
    """ if include_costs else ""
    sales = rows("""
        SELECT v.id, v.fecha, tv.nombre AS type, tv.descuento_porcentaje AS discount,
               mp.nombre AS payment,
               COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) AS total,
               COALESCE(SUM(dv.cantidad), 0) AS quantity
               {cost_fields}
        FROM ventas v JOIN tipos_venta tv ON tv.id = v.id_tipo_venta
        JOIN metodos_pago mp ON mp.id = v.id_metodo_pago
        LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id
        {sales_filter}
        GROUP BY v.id, tv.nombre, tv.descuento_porcentaje, mp.nombre
        ORDER BY v.fecha DESC, v.id DESC
        {limit_clause}
    """.format(
        cost_fields=cost_fields,
        sales_filter=sales_filter,
        limit_clause="LIMIT %s OFFSET %s" if page is not None else "",
    ), params + ([PAGE_SIZE, (page - 1) * PAGE_SIZE] if page is not None else []))
    for sale in sales:
        sale["items"] = rows("""
            SELECT p.id AS product_id, p.nombre AS name, dv.cantidad AS quantity,
                   dv.precio_unitario AS price
            FROM detalle_ventas dv JOIN productos p ON p.id = dv.id_producto
            WHERE dv.id_venta = %s ORDER BY p.nombre
        """, [sale["id"]])
    return sales

def list_sales_page(user_id=None, include_costs=True, page=1, search=""):
    conditions = []
    params = []
    if user_id is not None:
        conditions.append("v.id_usuario = %s")
        params.append(user_id)
    if search:
        search_term = f"%{search}%"
        conditions.append("""(
            v.id::text ILIKE %s OR v.fecha::date::text ILIKE %s OR
            tv.nombre ILIKE %s OR mp.nombre ILIKE %s OR EXISTS (
                SELECT 1 FROM detalle_ventas dv_search
                JOIN productos p_search ON p_search.id = dv_search.id_producto
                WHERE dv_search.id_venta = v.id AND p_search.nombre ILIKE %s
            )
        )""")
        params.extend([search_term] * 5)
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    count = one(f"""
        SELECT COUNT(*) AS total
        FROM ventas v
        JOIN tipos_venta tv ON tv.id = v.id_tipo_venta
        JOIN metodos_pago mp ON mp.id = v.id_metodo_pago
        {where_clause}
    """, params)["total"]
    page = min(page, max((count + PAGE_SIZE - 1) // PAGE_SIZE, 1))
    sales = list_sales(user_id, include_costs, page=page, search=search)
    return {"results": sales, "count": count, "page": page, "page_size": PAGE_SIZE}

def list_purchases(*, page=None, search="", purchase_id=None):
    conditions = []
    params = []
    if purchase_id is not None:
        conditions.append("c.id = %s")
        params.append(purchase_id)
    if search:
        search_term = f"%{search}%"
        conditions.append("""(
            c.id::text ILIKE %s OR c.fecha::date::text ILIKE %s OR
            p.nombre ILIKE %s OR ec.nombre ILIKE %s OR EXISTS (
                SELECT 1 FROM detalle_compras dc_search
                JOIN productos p_search ON p_search.id = dc_search.id_producto
                WHERE dc_search.id_compra = c.id AND p_search.nombre ILIKE %s
            )
        )""")
        params.extend([search_term] * 5)
    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    purchases = rows("""
        SELECT c.id, c.fecha, p.nombre AS provider, ec.nombre AS state,
               COALESCE(SUM(dc.cantidad * dc.precio_unitario), 0) AS total
        FROM compras c JOIN proveedores p ON p.id = c.id_proveedor
        JOIN estados_compra ec ON ec.id = c.id_estado
        LEFT JOIN detalle_compras dc ON dc.id_compra = c.id
        {where_clause}
        GROUP BY c.id, p.nombre, ec.nombre ORDER BY c.fecha DESC, c.id DESC
        {limit_clause}
    """.format(
        where_clause=where_clause,
        limit_clause="LIMIT %s OFFSET %s" if page is not None else "",
    ), params + ([PAGE_SIZE, (page - 1) * PAGE_SIZE] if page is not None else []))
    for purchase in purchases:
        purchase["items"] = rows("""
            SELECT dc.id AS detail_id, p.id AS product_id, p.nombre AS name,
                   p.perecible AS perishable, dc.cantidad AS quantity,
                   dc.precio_unitario AS unit_price, l.id AS lot_id,
                   COALESCE(l.cantidad_actual, 0) AS current_quantity,
                   l.fecha_vencimiento AS expiry_date
            FROM detalle_compras dc JOIN productos p ON p.id = dc.id_producto
            LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
            WHERE dc.id_compra = %s ORDER BY dc.id
        """, [purchase["id"]])
    return purchases

def list_purchase_page(page=1, search=""):
    search_term = f"%{search}%"
    count = one("""
        SELECT COUNT(*) AS total
        FROM compras c
        JOIN proveedores p ON p.id = c.id_proveedor
        JOIN estados_compra ec ON ec.id = c.id_estado
        WHERE (%s = '' OR c.id::text ILIKE %s OR c.fecha::date::text ILIKE %s
               OR p.nombre ILIKE %s OR ec.nombre ILIKE %s OR EXISTS (
                   SELECT 1 FROM detalle_compras dc
                   JOIN productos pr ON pr.id = dc.id_producto
                   WHERE dc.id_compra = c.id AND pr.nombre ILIKE %s
               ))
    """, [search, search_term, search_term, search_term, search_term, search_term])["total"]
    page = min(page, max((count + PAGE_SIZE - 1) // PAGE_SIZE, 1))
    purchases = list_purchases(page=page, search=search)
    return {"results": purchases, "count": count, "page": page, "page_size": PAGE_SIZE}

def list_expense_page(page=1, search=""):
    search_term = f"%{search}%"
    count = one("""
        SELECT COUNT(*) AS total
        FROM gastos g
        JOIN categorias_gasto c ON c.id = g.id_categoria
        WHERE (%s = '' OR g.id::text ILIKE %s OR g.fecha::date::text ILIKE %s
               OR g.descripcion ILIKE %s OR c.nombre ILIKE %s OR g.monto::text ILIKE %s)
    """, [search, search_term, search_term, search_term, search_term, search_term])["total"]
    page = min(page, max((count + PAGE_SIZE - 1) // PAGE_SIZE, 1))
    expenses = rows("""
        SELECT g.id,g.fecha,g.descripcion AS description,g.monto AS amount,
               g.id_categoria AS category_id,c.nombre AS category
        FROM gastos g
        JOIN categorias_gasto c ON c.id=g.id_categoria
        WHERE (%s = '' OR g.id::text ILIKE %s OR g.fecha::date::text ILIKE %s
               OR g.descripcion ILIKE %s OR c.nombre ILIKE %s OR g.monto::text ILIKE %s)
        ORDER BY g.fecha DESC,g.id DESC
        LIMIT %s OFFSET %s
    """, [search, search_term, search_term, search_term, search_term, search_term,
          PAGE_SIZE, (page - 1) * PAGE_SIZE])
    return {"results": expenses, "count": count, "page": page, "page_size": PAGE_SIZE}

def pagination_params(request):
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
    return page, search

def dashboard_summary(user_id=None, include_financials=True):
    product_stats = one("""
        WITH product_stock AS (
            SELECT p.id, p.nombre, p.stock_minimo,
                   COALESCE(SUM(CASE
                       WHEN ec.nombre = 'Entregado'
                         AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
                       THEN l.cantidad_actual ELSE 0
                   END), 0) AS stock
            FROM productos p
            LEFT JOIN detalle_compras dc ON dc.id_producto = p.id
            LEFT JOIN compras c ON c.id = dc.id_compra
            LEFT JOIN estados_compra ec ON ec.id = c.id_estado
            LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
            WHERE p.activo = true
            GROUP BY p.id
        )
        SELECT COUNT(*) AS product_count,
               COUNT(*) FILTER (WHERE stock <= stock_minimo) AS low_stock_count
        FROM product_stock
    """)
    low_stock_products = rows("""
        WITH product_stock AS (
            SELECT p.id, p.nombre AS name, u.abreviatura AS unit_abbr,
                   p.stock_minimo,
                   COALESCE(SUM(CASE
                       WHEN ec.nombre = 'Entregado'
                         AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
                       THEN l.cantidad_actual ELSE 0
                   END), 0) AS stock
            FROM productos p
            JOIN unidades_medida u ON u.id = p.id_unidad
            LEFT JOIN detalle_compras dc ON dc.id_producto = p.id
            LEFT JOIN compras c ON c.id = dc.id_compra
            LEFT JOIN estados_compra ec ON ec.id = c.id_estado
            LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
            WHERE p.activo = true
            GROUP BY p.id, u.id
        )
        SELECT id, name, unit_abbr, stock
        FROM product_stock WHERE stock <= stock_minimo
        ORDER BY stock, name LIMIT 5
    """)
    sales_filter = "WHERE id_usuario = %s" if user_id is not None else ""
    sales_params = [user_id] if user_id is not None else []
    sales = one(f"""
        SELECT COUNT(*) AS sales_count,
               COALESCE(SUM(sale_total), 0) AS sales_total
        FROM (
            SELECT v.id,
                   COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) AS sale_total
            FROM ventas v LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id
            {sales_filter}
            GROUP BY v.id
        ) sale_totals
    """, sales_params)
    recent_sales = list_sales(user_id, include_costs=include_financials, page=1)[:5]
    sales_by_day = rows(f"""
        SELECT DATE(v.fecha) AS day,
               COALESCE(SUM(dv.cantidad * dv.precio_unitario), 0) AS total
        FROM ventas v LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id
        {sales_filter}
        GROUP BY DATE(v.fecha)
        ORDER BY day DESC LIMIT 5
    """, sales_params)
    summary = {
        "product_count": product_stats["product_count"],
        "low_stock_count": product_stats["low_stock_count"],
        "sales_count": sales["sales_count"],
        "sales_total": sales["sales_total"],
        "recent_sales": recent_sales,
        "sales_by_day": sales_by_day,
    }
    if include_financials:
        costs = one("""
            SELECT COALESCE(SUM(dvl.cantidad * dc.precio_unitario), 0) AS total
            FROM ventas v
            JOIN detalle_ventas dv ON dv.id_venta = v.id
            JOIN detalle_venta_lotes dvl ON dvl.id_detalle_venta = dv.id
            JOIN lotes l ON l.id = dvl.id_lote
            JOIN detalle_compras dc ON dc.id = l.id_detalle_compra
        """)
        missing_costs = one("""
            SELECT COUNT(DISTINCT v.id) AS total
            FROM ventas v JOIN detalle_ventas dv ON dv.id_venta = v.id
            WHERE (SELECT COALESCE(SUM(dvl.cantidad), 0)
                   FROM detalle_venta_lotes dvl
                   WHERE dvl.id_detalle_venta = dv.id) < dv.cantidad
        """)
        expenses = one("SELECT COUNT(*) AS expense_count, COALESCE(SUM(monto),0) AS total FROM gastos")
        purchases = one("""
            SELECT COUNT(*) AS purchase_count,
                   COALESCE(SUM(CASE WHEN ec.nombre = 'Entregado'
                       THEN totals.total ELSE 0 END), 0) AS total
            FROM compras c
            JOIN estados_compra ec ON ec.id = c.id_estado
            JOIN (
                SELECT id_compra, SUM(cantidad * precio_unitario) AS total
                FROM detalle_compras GROUP BY id_compra
            ) totals ON totals.id_compra = c.id
        """)
        summary.update({
            "cost_of_goods_sold": costs["total"],
            "sales_without_complete_cost": missing_costs["total"],
            "expenses_count": expenses["expense_count"],
            "expenses_total": expenses["total"],
            "purchases_count": purchases["purchase_count"],
            "purchases_total": purchases["total"],
            "estimated_profit": sales["sales_total"] - costs["total"] - expenses["total"],
        })
    return {
        "summary": summary,
        "low_stock_products": low_stock_products,
    }
