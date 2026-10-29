from ...compartido.repositorio_base import rows


def reference_data():
    return {
        "units": rows("SELECT id,nombre AS name,abreviatura FROM unidades_medida ORDER BY nombre"),
        "providers": rows("SELECT id,nombre AS name FROM proveedores WHERE activo=true ORDER BY nombre"),
        "payment_methods": rows("SELECT id,nombre AS name FROM metodos_pago WHERE activo=true ORDER BY nombre"),
        "sale_types": rows("SELECT id,nombre AS name,descuento_porcentaje AS discount FROM tipos_venta WHERE activo=true ORDER BY nombre"),
        "expense_categories": rows("SELECT id,nombre AS name FROM categorias_gasto ORDER BY nombre"),
    }
