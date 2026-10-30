from django.db import DatabaseError
from rest_framework.exceptions import ValidationError

from .repositorio import (
    create_product, deactivate_product, get_product, get_product_record,
    list_product_lots, list_product_page, update_product,
)
from ...models import CategoriasProductos
from ...compartido.validacion import boolean_value, decimal_value, object_payload, required_id


def listar_productos(query_params):
    raw_page = query_params.get("page", "1")
    search = query_params.get("search", "").strip()
    if len(search) > 120:
        raise ValidationError({"search": "La búsqueda debe tener hasta 120 caracteres."})
    try:
        page = int(raw_page)
        if page < 1:
            raise ValueError
    except (TypeError, ValueError):
        raise ValidationError({"page": "La página debe ser un entero mayor que cero."})
    raw_categories = query_params.get("category_ids", "").strip()
    try:
        category_ids = [int(value) for value in raw_categories.split(",") if value] if raw_categories else []
        if any(value < 1 for value in category_ids):
            raise ValueError
    except ValueError:
        raise ValidationError({"category_ids": "Las categorías solicitadas no son válidas."})
    return list_product_page(page, search, category_ids)


def crear_producto(payload):
    data = object_payload(payload)
    name = str(data.get("name", "")).strip()
    if not name or len(name) > 120:
        raise ValidationError({"name": "El nombre es obligatorio y debe tener hasta 120 caracteres."})
    price = decimal_value(data.get("price"), "price", strict=True)
    minimum = decimal_value(data.get("min_stock", 5), "min_stock")
    unit_id = required_id(data.get("unit_id"), "unit_id")
    category_id = required_id(data.get("category_id"), "category_id")
    if not CategoriasProductos.objects.filter(pk=category_id).exists():
        raise ValidationError({"category_id": "Selecciona una categoría válida."})
    perishable = boolean_value(data.get("perishable"), "perishable")
    try:
        product_id = create_product(name, unit_id, category_id, price, perishable, minimum)
    except DatabaseError:
        raise ValidationError({"name": "No se pudo crear el producto. Verifica que el nombre no esté repetido y la unidad exista."})
    return get_product(product_id)


def obtener_producto(product_id):
    product = get_product(product_id)
    if not product or not product["active"]:
        return None
    product["lots"] = list_product_lots(product_id)
    return product


def actualizar_producto(product_id, payload):
    old = get_product_record(product_id)
    if not old or not old["activo"]:
        return None
    data = object_payload(payload)
    values = [str(data.get("name", old["nombre"])).strip(),
              required_id(data.get("unit_id", old["id_unidad"]), "unit_id"),
              required_id(data.get("category_id", old["id_categoria"]), "category_id"),
              decimal_value(data.get("price", old["precio_venta"]), "price", strict=True),
              boolean_value(data.get("perishable"), "perishable", old["perecible"]),
              decimal_value(data.get("min_stock", old["stock_minimo"]), "min_stock"), product_id]
    if not values[0] or len(values[0]) > 120:
        raise ValidationError({"name": "Nombre inválido."})
    if not CategoriasProductos.objects.filter(pk=values[2]).exists():
        raise ValidationError({"category_id": "Selecciona una categoría válida."})
    try:
        update_product(values)
    except DatabaseError:
        raise ValidationError({"detail": "No se pudo actualizar; revisa que el nombre no esté repetido."})
    return get_product(product_id)


def desactivar_producto(product_id):
    return deactivate_product(product_id)
