from django.db import connection

from ...compartido.repositorio_base import one, rows

PAGE_SIZE = 10


def get_sale_type(sale_type_id):
    return one("SELECT id,nombre,descuento_porcentaje FROM tipos_venta WHERE id=%s AND activo=true", [sale_type_id])


def payment_method_is_active(payment_id):
    return one("SELECT id FROM metodos_pago WHERE id=%s AND activo=true", [payment_id]) is not None


def create_sale(user_id, sale_type_id, payment_id):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO ventas (fecha,id_usuario,id_tipo_venta,id_metodo_pago) VALUES (CURRENT_TIMESTAMP,%s,%s,%s) RETURNING id", [user_id, sale_type_id, payment_id])
        return cursor.fetchone()[0]


def lock_available_lots(product_id):
    with connection.cursor() as cursor:
        cursor.execute("""SELECT l.id,l.cantidad_actual,p.precio_venta FROM lotes l
            JOIN detalle_compras dc ON dc.id=l.id_detalle_compra JOIN compras c ON c.id=dc.id_compra
            JOIN estados_compra ec ON ec.id=c.id_estado JOIN productos p ON p.id=dc.id_producto
            WHERE dc.id_producto=%s AND p.activo=true AND ec.nombre='Entregado'
              AND l.cantidad_actual>0 AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
            ORDER BY l.fecha_vencimiento NULLS LAST,c.fecha,l.id FOR UPDATE OF l""", [product_id])
        return cursor.fetchall()


def create_sale_detail(sale_id, product_id, quantity, unit_price):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO detalle_ventas (id_venta,id_producto,cantidad,precio_unitario) VALUES (%s,%s,%s,%s) RETURNING id", [sale_id, product_id, quantity, unit_price])
        return cursor.fetchone()[0]


def consume_lot(detail_id, lot_id, amount):
    with connection.cursor() as cursor:
        cursor.execute("UPDATE lotes SET cantidad_actual=cantidad_actual-%s WHERE id=%s", [amount, lot_id])
        cursor.execute("INSERT INTO detalle_venta_lotes (id_detalle_venta,id_lote,cantidad) VALUES (%s,%s,%s)", [detail_id, lot_id, amount])


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


def get_sale(sale_id, user_id=None, include_costs=True):
    sales = list_sales(user_id, include_costs=include_costs, sale_id=sale_id)
    return sales[0] if sales else None


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
