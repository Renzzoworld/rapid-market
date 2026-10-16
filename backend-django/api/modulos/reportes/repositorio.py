from ...compartido.repositorio_base import one, rows
from ..ventas.repositorio import list_sales
from ..inventario.repositorio import list_product_page


def report_data(start, end, page, page_size):
    offset = (page - 1) * page_size
    params = [start, start, end, end]
    sales_count = one("SELECT COUNT(DISTINCT DATE(v.fecha)) AS total FROM ventas v WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date)", params)["total"]
    purchases_count = one("SELECT COUNT(*) AS total FROM compras c WHERE (%s IS NULL OR c.fecha::date >= %s::date) AND (%s IS NULL OR c.fecha::date <= %s::date)", params)["total"]
    expenses_count = one("SELECT COUNT(*) AS total FROM gastos g WHERE (%s IS NULL OR g.fecha::date >= %s::date) AND (%s IS NULL OR g.fecha::date <= %s::date)", params)["total"]
    products_count = one("SELECT COUNT(*) AS total FROM productos WHERE activo=true")["total"]
    sales = rows("SELECT DATE(v.fecha) AS day,COALESCE(SUM(d.cantidad*d.precio_unitario),0) AS total,COUNT(DISTINCT v.id) AS count FROM ventas v LEFT JOIN detalle_ventas d ON d.id_venta=v.id WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date) GROUP BY DATE(v.fecha) ORDER BY day DESC LIMIT %s OFFSET %s", [*params, page_size, offset])
    expenses = one("SELECT COALESCE(SUM(monto),0) AS total FROM gastos WHERE (%s IS NULL OR fecha::date >= %s::date) AND (%s IS NULL OR fecha::date <= %s::date)", params)
    purchases = one("SELECT COALESCE(SUM(dc.cantidad*dc.precio_unitario),0) AS total FROM compras c JOIN estados_compra ec ON ec.id=c.id_estado JOIN detalle_compras dc ON dc.id_compra=c.id WHERE ec.nombre='Entregado' AND (%s IS NULL OR c.fecha::date >= %s::date) AND (%s IS NULL OR c.fecha::date <= %s::date)", params)
    cost_summary = one("""SELECT COALESCE(SUM(dvl.cantidad * dc.precio_unitario), 0) AS total
        FROM ventas v JOIN detalle_ventas dv ON dv.id_venta = v.id
        JOIN detalle_venta_lotes dvl ON dvl.id_detalle_venta = dv.id
        JOIN lotes l ON l.id = dvl.id_lote
        JOIN detalle_compras dc ON dc.id = l.id_detalle_compra
        WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date)""", params)
    missing_costs = one("""SELECT COUNT(DISTINCT v.id) AS count
        FROM ventas v JOIN detalle_ventas dv ON dv.id_venta = v.id
        WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date)
          AND (SELECT COALESCE(SUM(dvl.cantidad), 0) FROM detalle_venta_lotes dvl
               WHERE dvl.id_detalle_venta = dv.id) < dv.cantidad""", params)
    purchase_rows = rows("SELECT c.id,c.fecha,p.nombre AS provider,ec.nombre AS state,COALESCE(SUM(dc.cantidad*dc.precio_unitario),0) AS total FROM compras c JOIN proveedores p ON p.id=c.id_proveedor JOIN estados_compra ec ON ec.id=c.id_estado LEFT JOIN detalle_compras dc ON dc.id_compra=c.id WHERE (%s IS NULL OR c.fecha::date >= %s::date) AND (%s IS NULL OR c.fecha::date <= %s::date) GROUP BY c.id,p.nombre,ec.nombre ORDER BY c.fecha DESC,c.id DESC LIMIT %s OFFSET %s", [*params, page_size, offset])
    expense_rows = rows("SELECT g.id,g.fecha,g.descripcion AS description,g.monto AS amount,c.nombre AS category FROM gastos g JOIN categorias_gasto c ON c.id=g.id_categoria WHERE (%s IS NULL OR g.fecha::date >= %s::date) AND (%s IS NULL OR g.fecha::date <= %s::date) ORDER BY g.fecha DESC,g.id DESC LIMIT %s OFFSET %s", [*params, page_size, offset])
    sales_total = one("SELECT COALESCE(SUM(d.cantidad*d.precio_unitario),0) AS total FROM ventas v LEFT JOIN detalle_ventas d ON d.id_venta=v.id WHERE (%s IS NULL OR v.fecha::date >= %s::date) AND (%s IS NULL OR v.fecha::date <= %s::date)", params)["total"]
    return {
        "sales": sales, "sales_total": sales_total,
        "cost_of_goods_sold": cost_summary["total"],
        "expenses_total": expenses["total"], "sales_without_complete_cost": missing_costs["count"],
        "purchases_total": purchases["total"], "products": list_product_page(page)["results"],
        "purchases": purchase_rows, "expenses": expense_rows, "page": page,
        "page_size": page_size,
        "counts": {"sales": sales_count, "products": products_count,
                   "purchases": purchases_count, "expenses": expenses_count},
    }


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
