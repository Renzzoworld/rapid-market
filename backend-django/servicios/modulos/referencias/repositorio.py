from ...compartido.repositorio_base import rows


def reference_data():
    return {
        "units": rows("SELECT id,nombre AS name,abreviatura FROM unidades_medida ORDER BY nombre"),
        "providers": rows("""SELECT p.id,p.nombre AS name,COALESCE(array_agg(pc.id_categoria) FILTER (WHERE pc.id_categoria IS NOT NULL),'{}') AS category_ids
            FROM proveedores p LEFT JOIN proveedores_categorias pc ON pc.id_proveedor=p.id
            WHERE p.activo=true GROUP BY p.id,p.nombre ORDER BY p.nombre"""),
        "product_categories": rows("SELECT id,nombre FROM categorias_productos ORDER BY id"),
        "payment_methods": rows("SELECT id,nombre AS name FROM metodos_pago WHERE activo=true ORDER BY nombre"),
        "sale_types": rows("SELECT id,nombre AS name,descuento_porcentaje AS discount FROM tipos_venta WHERE activo=true ORDER BY nombre"),
        "expense_categories": rows("SELECT id,nombre AS name FROM categorias_gasto ORDER BY nombre"),
    }
