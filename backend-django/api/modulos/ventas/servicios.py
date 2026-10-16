from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .repositorio import (
    create_sale, create_sale_detail, consume_lot, get_sale_type,
    get_sale, list_sales_page, lock_available_lots, payment_method_is_active,
)
from ...compartido.validacion import decimal_value, object_payload, pagination_params, required_id


def listar_ventas(user, query_params):
    page, search = pagination_params(query_params)
    administrator = user.role_name.strip().lower() in {"admin", "administrador"}
    return list_sales_page(None if administrator else user.id, administrator, page, search)


@transaction.atomic
def registrar_venta(user, payload):
    data = object_payload(payload)
    lines = data.get("items")
    if not isinstance(lines, list) or not lines or len(lines) > 100 or any(not isinstance(line, dict) for line in lines):
        raise ValidationError({"items": "Agrega entre 1 y 100 productos."})
    sale_type_id = required_id(data.get("sale_type_id"), "sale_type_id")
    payment_id = required_id(data.get("payment_method_id"), "payment_method_id")
    sale_type = get_sale_type(sale_type_id)
    if not sale_type or not payment_method_is_active(payment_id):
        raise ValidationError({"detail": "Tipo de venta o método de pago inválido."})

    sale_id = create_sale(user.id, sale_type_id, payment_id)
    for line in lines:
        product_id = required_id(line.get("product_id"), "product_id")
        quantity = decimal_value(line.get("quantity"), "quantity", strict=True)
        stock_lots = lock_available_lots(product_id)
        stock = sum((lot[1] for lot in stock_lots), Decimal("0"))
        product_price = stock_lots[0][2] if stock_lots else None
        if product_price is None or quantity > stock:
            raise ValidationError({"items": "Stock insuficiente o producto sin lotes disponibles."})
        unit_price = (product_price * (Decimal("100") - sale_type["descuento_porcentaje"]) / Decimal("100")).quantize(Decimal("0.01"))
        detail_id = create_sale_detail(sale_id, product_id, quantity, unit_price)
        remaining = quantity
        for lot_id, lot_quantity, _ in stock_lots:
            if remaining <= 0:
                break
            amount = min(lot_quantity, remaining)
            consume_lot(detail_id, lot_id, amount)
            remaining -= amount

    administrator = user.role_name.strip().lower() in {"admin", "administrador"}
    user_id = None if administrator else user.id
    return get_sale(sale_id, user_id=user_id, include_costs=administrator)
