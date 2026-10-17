from collections.abc import Mapping
from datetime import date

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .repositorio import (
    active_product, create_lot, create_purchase, create_purchase_detail,
    deliver_lot, list_purchase_page, list_purchases, lock_purchase,
    pending_purchase_state, purchase_lines, purchase_state_id,
    provider_is_active, set_purchase_state,
)
from ...compartido.validacion import decimal_value, object_payload, pagination_params, required_id


def listar_compras(query_params):
    page, search = pagination_params(query_params)
    return list_purchase_page(page, search)


@transaction.atomic
def registrar_compra(user, payload):
    data = object_payload(payload)
    provider_id = required_id(data.get("provider_id"), "provider_id")
    lines = data.get("items")
    if not isinstance(lines, list) or not lines or len(lines) > 100 or any(not isinstance(line, Mapping) for line in lines):
        raise ValidationError({"items": "Agrega entre 1 y 100 productos."})
    pending = pending_purchase_state()
    if not pending or not provider_is_active(provider_id):
        raise ValidationError({"detail": "Proveedor o estado no configurado."})
    purchase_id = create_purchase(provider_id, pending["id"], user.id)
    for line in lines:
        product_id = required_id(line.get("product_id"), "product_id")
        quantity = decimal_value(line.get("quantity"), "quantity", strict=True)
        unit_price = decimal_value(line.get("unit_price"), "unit_price", strict=True)
        product = active_product(product_id)
        if not product:
            raise ValidationError({"items": "Producto inválido."})
        detail_id = create_purchase_detail(purchase_id, product_id, quantity, unit_price)
        expiry = line.get("expiry_date") if product["perecible"] else None
        create_lot(detail_id, quantity, expiry)
    return list_purchases(purchase_id=purchase_id)[0]


@transaction.atomic
def procesar_accion_compra(purchase_id, action, payload):
    data = object_payload(payload)
    purchase = lock_purchase(purchase_id)
    if not purchase:
        return None, {"detail": "Compra no encontrada."}, 404
    if purchase["state"] != "Pendiente de entrega":
        raise ValidationError({"detail": "Solo se puede modificar una compra pendiente."})
    if action == "deliver":
        lines = purchase_lines(purchase_id)
        expiries = data.get("expiries", {})
        if not isinstance(expiries, Mapping):
            raise ValidationError({"expiries": "Envía las fechas de vencimiento en un formato válido."})
        for line in lines:
            expiry = expiries.get(str(line["id"]))
            if line["perecible"] and not expiry:
                raise ValidationError({"expiries": "Indica el vencimiento de todos los productos perecibles."})
            if expiry:
                try:
                    expiry_date = date.fromisoformat(expiry)
                except (ValueError, TypeError):
                    raise ValidationError({"expiries": "Fecha de vencimiento no válida."})
                if expiry_date < timezone.localdate():
                    raise ValidationError({"expiries": "La fecha de vencimiento no puede estar en el pasado."})
            deliver_lot(line["id"], expiry or None)
        new_state = "Entregado"
    elif action == "cancel":
        new_state = "Cancelado"
    else:
        return None, {"detail": "Acción no válida."}, 404
    state = purchase_state_id(new_state)
    set_purchase_state(purchase_id, state["id"])
    return list_purchases(purchase_id=purchase_id)[0], None, 200
