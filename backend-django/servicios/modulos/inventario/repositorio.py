from django.db import connection

from ...compartido.repositorio_base import one, rows


def create_product(name, unit_id, category_id, price, perishable, minimum):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO productos (nombre,id_unidad,id_categoria,precio_venta,perecible,stock_minimo,activo) VALUES (%s,%s,%s,%s,%s,%s,true) RETURNING id", [name, unit_id, category_id, price, perishable, minimum])
        return cursor.fetchone()[0]


def get_product_record(product_id):
    return one("SELECT id,nombre,id_unidad,id_categoria,precio_venta,perecible,stock_minimo,activo FROM productos WHERE id=%s", [product_id])


def update_product(values):
    with connection.cursor() as cursor:
        cursor.execute("UPDATE productos SET nombre=%s,id_unidad=%s,id_categoria=%s,precio_venta=%s,perecible=%s,stock_minimo=%s WHERE id=%s", values)


def deactivate_product(product_id):
    with connection.cursor() as cursor:
        cursor.execute("UPDATE productos SET activo=false WHERE id=%s AND activo=true", [product_id])
        return cursor.rowcount > 0


def get_product(product_id):
    return one("""
        SELECT p.id, p.nombre AS name, p.precio_venta AS price,
               p.perecible AS perishable, p.stock_minimo AS min_stock,
               p.activo AS active, p.id_categoria AS category_id, cp.nombre AS category, u.id AS unit_id, u.nombre AS unit,
               u.abreviatura AS unit_abbr,
               COALESCE(SUM(CASE
                   WHEN ec.nombre = 'Entregado'
                     AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)
                   THEN l.cantidad_actual ELSE 0
               END), 0) AS stock,
               COUNT(DISTINCT l.id) FILTER (WHERE ec.nombre = 'Entregado') AS lot_count
        FROM productos p
        JOIN unidades_medida u ON u.id = p.id_unidad
        JOIN categorias_productos cp ON cp.id = p.id_categoria
        LEFT JOIN detalle_compras dc ON dc.id_producto = p.id
        LEFT JOIN compras c ON c.id = dc.id_compra
        LEFT JOIN estados_compra ec ON ec.id = c.id_estado
        LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
        WHERE p.id = %s
        GROUP BY p.id, u.id, cp.id
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

def list_product_page(page, search="", category_ids=None):
    search_term = f"%{search}%"
    category_ids = category_ids or []
    category_clause = " AND id_categoria = ANY(%s)" if category_ids else ""
    count_params = [search_term] + ([category_ids] if category_ids else [])
    total = one(f"SELECT COUNT(*) AS total FROM productos WHERE activo=true AND nombre ILIKE %s{category_clause}", count_params)["total"]
    page_size = 10
    total_pages = (total + page_size - 1) // page_size
    page = min(page, max(total_pages, 1))
    products = rows(f"""
        WITH product_page AS (
            SELECT p.id, p.nombre AS name, p.precio_venta AS price, p.id_categoria AS category_id, cp.nombre AS category,
                   p.perecible AS perishable, p.stock_minimo AS min_stock,
                   p.activo AS active, u.id AS unit_id, u.nombre AS unit,
                   u.abreviatura AS unit_abbr
            FROM productos p
            JOIN unidades_medida u ON u.id = p.id_unidad
            JOIN categorias_productos cp ON cp.id = p.id_categoria
            WHERE p.activo=true AND p.nombre ILIKE %s {category_clause.replace('id_categoria', 'p.id_categoria')}
            ORDER BY p.nombre, p.id
            LIMIT %s OFFSET %s
        )
        SELECT pp.id, pp.name, pp.price, pp.perishable, pp.min_stock, pp.active, pp.category_id, pp.category,
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
                 pp.active, pp.category_id, pp.category, pp.unit_id, pp.unit, pp.unit_abbr
        ORDER BY pp.name, pp.id
    """, [search_term] + ([category_ids] if category_ids else []) + [page_size, (page - 1) * page_size])
    return {
        "results": products,
        "count": total,
        "page": page,
        "page_size": page_size,
    }
