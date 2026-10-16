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

logger = logging.getLogger("rapid_market.api")
PAGE_SIZE = 10


# ===== HELPERS COMPARTIDOS DE SQL Y VALIDACIÓN: INICIO =====
# rows/one centralizan la lectura SQL; los validadores convierten y verifican entradas API.
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
# ===== HELPERS COMPARTIDOS DE SQL Y VALIDACIÓN: FIN =====


# ===== INVENTARIO - CONSULTAS DE PRODUCTOS Y LOTES: INICIO =====
# Devuelven el detalle y stock de un producto, sus lotes o una página filtrada.
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
# ===== INVENTARIO - CONSULTAS DE PRODUCTOS Y LOTES: FIN =====


# ===== VENTAS - CONSULTAS E HISTORIAL: INICIO =====
# Construyen los detalles de ventas y su historial filtrado/paginado.
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
# ===== VENTAS - CONSULTAS E HISTORIAL: FIN =====


# ===== COMPRAS - CONSULTAS E HISTORIAL: INICIO =====
# Consultan compras con sus lotes/detalles y entregan páginas para el historial.
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
# ===== COMPRAS - CONSULTAS E HISTORIAL: FIN =====


# ===== GASTOS - HISTORIAL: INICIO =====
# Filtra y devuelve una página de gastos sin transferir el historial completo.
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
# ===== GASTOS - HISTORIAL: FIN =====


# ===== PAGINACIÓN COMPARTIDA: INICIO =====
# Valida page/search recibidos por los endpoints de listas.
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
# ===== PAGINACIÓN COMPARTIDA: FIN =====


# ===== RESUMEN - CÁLCULOS AGREGADOS EN POSTGRESQL: INICIO =====
# Calcula métricas globales y devuelve solo datos breves para el dashboard.
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
# ===== RESUMEN - CÁLCULOS AGREGADOS EN POSTGRESQL: FIN =====


# ===== LOGIN - AUTENTICACIÓN Y TOKENS: INICIO =====
# LoginView valida credenciales y emite JWT; LogoutView revoca el token de renovación.
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
# ===== LOGIN - AUTENTICACIÓN Y TOKENS: FIN =====


# ===== PERMISOS COMPARTIDOS: INICIO =====
# AdminWriteMixin restringe los métodos de escritura/lectura indicados al administrador.
class AdminWriteMixin:
    admin_methods = set()

    def get_permissions(self):
        if self.request.method in self.admin_methods:
            return [IsAuthenticated(), IsAdministrator()]
        return [IsAuthenticated()]
# ===== PERMISOS COMPARTIDOS: FIN =====


# ===== INVENTARIO - ENDPOINTS DE PRODUCTOS: INICIO =====
# ProductListView pagina/crea; ProductDetailView muestra lotes, edita o desactiva.
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
# ===== INVENTARIO - ENDPOINTS DE PRODUCTOS: FIN =====


# ===== REFERENCIAS Y PROVEEDORES: INICIO =====
# Entregan catálogos para formularios y permiten crear proveedores.
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
# ===== REFERENCIAS Y PROVEEDORES: FIN =====


# ===== VENTAS - ENDPOINT: INICIO =====
# SalesView lista ventas paginadas y registra una venta descontando sus lotes.
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
# ===== VENTAS - ENDPOINT: FIN =====


# ===== COMPRAS - ENDPOINTS Y ESTADOS: INICIO =====
# PurchasesView registra/lista compras; PurchaseActionView las entrega o cancela.
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
# ===== COMPRAS - ENDPOINTS Y ESTADOS: FIN =====


# ===== GASTOS - ENDPOINT: INICIO =====
# ExpensesView consulta una página de gastos o registra un nuevo gasto.
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
# ===== GASTOS - ENDPOINT: FIN =====


# ===== REPORTES - ENDPOINT DE API SIN VISTA EN EL FRONTEND: INICIO =====
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
# ===== REPORTES - ENDPOINT DE API SIN VISTA EN EL FRONTEND: FIN =====


# ===== RESUMEN - ENDPOINT DEL DASHBOARD: INICIO =====
# Combina agregados del negocio con los catálogos autorizados para el rol actual.
class DashboardView(APIView):
    def get(self, request):
        administrator = is_administrator(request.user)
        summary = dashboard_summary(
            user_id=None if administrator else request.user.id,
            include_financials=administrator,
        )
        summary["references"] = ReferenceDataView().get(request).data
        return Response(summary)
# ===== RESUMEN - ENDPOINT DEL DASHBOARD: FIN =====
