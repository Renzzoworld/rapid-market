from decimal import Decimal
from ...permissions import is_administrator

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .repositorio import (
    create_sale, create_sale_detail, consume_lot, get_sale_type,
    get_sale, list_sales_page, lock_available_lots, payment_method_is_active,
)
from ...compartido.validacion import decimal_value, object_payload, pagination_params, required_id


def listar_ventas(user, query_params):
    page, search = pagination_params(query_params)
    administrator = is_administrator(user)
    period = query_params.get("period", "all")
    if period not in {"all", "today", "week"}:
        raise ValidationError({"period": "Usa all, today o week."})
    return list_sales_page(None if administrator else user.id, administrator, page, search, period)


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

    administrator = is_administrator(user)
    user_id = None if administrator else user.id
    return get_sale(sale_id, user_id=user_id, include_costs=administrator)


@transaction.atomic
def anular_venta(user, sale_id):
    from django.db import connection
    from django.utils import timezone
    from ...permissions import is_administrator

    with connection.cursor() as cursor:
        cursor.execute("SELECT id, id_usuario, anulada FROM ventas WHERE id=%s FOR UPDATE", [sale_id])
        sale = cursor.fetchone()
        if not sale or (not is_administrator(user) and sale[1] != user.id):
            return None
        if sale[2]:
            raise ValidationError({"detail": "La venta ya está anulada."})
        cursor.execute("""UPDATE lotes l SET cantidad_actual = l.cantidad_actual + x.cantidad
            FROM (SELECT dvl.id_lote, SUM(dvl.cantidad) cantidad
                  FROM detalle_venta_lotes dvl JOIN detalle_ventas dv ON dv.id=dvl.id_detalle_venta
                  WHERE dv.id_venta=%s GROUP BY dvl.id_lote) x WHERE l.id=x.id_lote""", [sale_id])
        cursor.execute("UPDATE ventas SET anulada=true, anulada_en=%s, anulada_por=%s WHERE id=%s", [timezone.now(), user.id, sale_id])
    return get_sale(sale_id, include_costs=is_administrator(user))


@transaction.atomic
def editar_venta(user, sale_id, payload):
    from django.db import connection
    from ...permissions import is_administrator
    data = object_payload(payload)
    sale_type_id = required_id(data.get("sale_type_id"), "sale_type_id")
    payment_id = required_id(data.get("payment_method_id"), "payment_method_id")
    if not get_sale_type(sale_type_id) or not payment_method_is_active(payment_id):
        raise ValidationError({"detail": "Tipo de venta o método de pago inválido."})
    with connection.cursor() as cursor:
        cursor.execute("SELECT id_usuario, anulada, id_tipo_venta FROM ventas WHERE id=%s FOR UPDATE", [sale_id])
        sale = cursor.fetchone()
        if not sale or (not is_administrator(user) and sale[0] != user.id):
            return None
        if sale[1]:
            raise ValidationError({"detail": "No se puede editar una venta anulada."})
        cursor.execute("SELECT descuento_porcentaje FROM tipos_venta WHERE id=%s", [sale[2]])
        previous_discount = Decimal(str(cursor.fetchone()[0]))
        new_discount = Decimal(str(get_sale_type(sale_type_id)["descuento_porcentaje"]))
        old_factor = Decimal("100") - previous_discount
        new_factor = Decimal("100") - new_discount
        if old_factor <= 0:
            raise ValidationError({"detail": "No se puede recalcular el precio histórico de esta venta."})
        cursor.execute("SELECT id, precio_unitario FROM detalle_ventas WHERE id_venta=%s", [sale_id])
        for detail_id, old_price in cursor.fetchall():
            recalculated_price = (Decimal(str(old_price)) * new_factor / old_factor).quantize(Decimal("0.01"))
            cursor.execute("UPDATE detalle_ventas SET precio_unitario=%s WHERE id=%s", [recalculated_price, detail_id])
        cursor.execute("UPDATE ventas SET id_tipo_venta=%s,id_metodo_pago=%s WHERE id=%s", [sale_type_id, payment_id, sale_id])
    return get_sale(sale_id, include_costs=is_administrator(user))
