from django.db import connection

from ...compartido.repositorio_base import one, rows

PAGE_SIZE = 10


def pending_purchase_state():
    return one("SELECT id FROM estados_compra WHERE nombre='Pendiente de entrega'")


def provider_is_active(provider_id):
    return one("SELECT id FROM proveedores WHERE id=%s AND activo=true", [provider_id]) is not None


def create_purchase(provider_id, state_id, user_id):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO compras (id_proveedor,id_estado,id_usuario) VALUES (%s,%s,%s) RETURNING id", [provider_id, state_id, user_id])
        return cursor.fetchone()[0]


def active_product(product_id):
    return one("SELECT id,perecible FROM productos WHERE id=%s AND activo=true", [product_id])


def create_purchase_detail(purchase_id, product_id, quantity, unit_price):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO detalle_compras (id_compra,id_producto,cantidad,precio_unitario) VALUES (%s,%s,%s,%s) RETURNING id", [purchase_id, product_id, quantity, unit_price])
        return cursor.fetchone()[0]


def create_lot(detail_id, quantity, expiry):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO lotes (id_detalle_compra,cantidad_inicial,cantidad_actual,fecha_vencimiento) VALUES (%s,%s,0,%s)", [detail_id, quantity, expiry])


def lock_purchase(purchase_id):
    return one("SELECT c.id,ec.nombre AS state FROM compras c JOIN estados_compra ec ON ec.id=c.id_estado WHERE c.id=%s FOR UPDATE", [purchase_id])


def purchase_lines(purchase_id):
    return rows("SELECT dc.id,p.perecible FROM detalle_compras dc JOIN productos p ON p.id=dc.id_producto WHERE dc.id_compra=%s", [purchase_id])


def deliver_lot(detail_id, expiry):
    with connection.cursor() as cursor:
        cursor.execute("UPDATE lotes SET cantidad_actual=cantidad_inicial,fecha_vencimiento=%s WHERE id_detalle_compra=%s", [expiry, detail_id])


def purchase_state_id(state_name):
    return one("SELECT id FROM estados_compra WHERE nombre=%s", [state_name])


def set_purchase_state(purchase_id, state_id):
    with connection.cursor() as cursor:
        cursor.execute("UPDATE compras SET id_estado=%s WHERE id=%s", [state_id, purchase_id])


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
