from django.db import connection
import json

from ...compartido.repositorio_base import one, rows

PAGE_SIZE = 10


def pending_purchase_state():
    return one("SELECT id FROM estados_compra WHERE nombre='Pendiente de entrega'")


def provider_is_active(provider_id):
    return one("SELECT id FROM proveedores WHERE id=%s AND activo=true", [provider_id]) is not None


def create_purchase(provider_id, state_id, user_id, order_data):
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO compras (
                id_proveedor, id_estado, id_usuario, fecha_entrega_requerida,
                lugar_entrega, proveedor_nombre_comercial, proveedor_razon_social,
                proveedor_ruc, proveedor_correo, proveedor_telefono,
                contacto_proveedor_nombre, contacto_proveedor_cargo,
                contacto_proveedor_telefono, contacto_proveedor_correo,
                observaciones, subtotal, igv_porcentaje, igv_monto, total,
                datos_empresa, responsable_nombre, responsable_rol
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s
            ) RETURNING id
        """, [
            provider_id, state_id, user_id, order_data["requested_delivery_date"],
            order_data["delivery_address"], order_data["provider_name"], order_data["provider_legal_name"],
            order_data["provider_ruc"], order_data["provider_email"], order_data["provider_phone"],
            order_data["contact_name"], order_data["contact_role"], order_data["contact_phone"],
            order_data["contact_email"], order_data["observations"], order_data["subtotal"],
            order_data["igv_rate"], order_data["igv_amount"], order_data["total"],
            json.dumps(order_data["company"]), order_data["responsible_name"], order_data["responsible_role"],
        ])
        return cursor.fetchone()[0]


def active_product(product_id):
    return one("SELECT id,nombre AS name,perecible,id_categoria FROM productos WHERE id=%s AND activo=true", [product_id])


def provider_category_ids(provider_id):
    result = one("SELECT COALESCE(array_agg(id_categoria), '{}') AS category_ids FROM proveedores_categorias WHERE id_proveedor=%s", [provider_id])
    return result["category_ids"] if result else []


def create_purchase_detail(purchase_id, product_id, product_name, quantity, unit_price):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO detalle_compras (id_compra,id_producto,nombre_producto_snapshot,cantidad,precio_unitario) VALUES (%s,%s,%s,%s,%s) RETURNING id", [purchase_id, product_id, product_name, quantity, unit_price])
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
        SELECT c.id, c.fecha,
               COALESCE(NULLIF(c.proveedor_nombre_comercial, ''), p.nombre) AS provider,
               COALESCE(NULLIF(c.proveedor_razon_social, ''), p.razon_social) AS provider_legal_name,
               COALESCE(NULLIF(c.proveedor_ruc, ''), p.ruc) AS provider_ruc,
               ec.nombre AS state,
               c.fecha_entrega_requerida AS requested_delivery_date,
               c.lugar_entrega AS delivery_address,
               c.proveedor_correo AS provider_email, c.proveedor_telefono AS provider_phone,
               c.contacto_proveedor_nombre AS contact_name,
               c.contacto_proveedor_cargo AS contact_role,
               c.contacto_proveedor_telefono AS contact_phone,
               c.contacto_proveedor_correo AS contact_email,
               c.observaciones AS observations,
               c.subtotal, c.igv_porcentaje AS igv_rate,
               c.igv_monto AS igv_amount, c.total, c.datos_empresa AS company,
               c.responsable_nombre AS responsible_name,
               c.responsable_rol AS responsible_role
        FROM compras c JOIN proveedores p ON p.id = c.id_proveedor
        JOIN estados_compra ec ON ec.id = c.id_estado
        {where_clause}
        ORDER BY c.fecha DESC, c.id DESC
        {limit_clause}
    """.format(
        where_clause=where_clause,
        limit_clause="LIMIT %s OFFSET %s" if page is not None else "",
    ), params + ([PAGE_SIZE, (page - 1) * PAGE_SIZE] if page is not None else []))
    for purchase in purchases:
        company = purchase.get("company")
        if isinstance(company, str):
            try:
                purchase["company"] = json.loads(company)
            except json.JSONDecodeError:
                purchase["company"] = {}
        elif not isinstance(company, dict):
            purchase["company"] = {}
        purchase["items"] = rows("""
            SELECT dc.id AS detail_id, p.id AS product_id,
                   COALESCE(NULLIF(dc.nombre_producto_snapshot, ''), p.nombre) AS name,
                   p.perecible AS perishable, dc.cantidad AS quantity,
                   dc.precio_unitario AS unit_price,
                   ROUND(dc.cantidad * dc.precio_unitario, 2) AS amount, l.id AS lot_id,
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
