from collections.abc import Mapping
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from ...models import ConfiguracionTributaria, ContactosProveedor, DatosProveedor, EmpresaCompradora, Proveedores

from .repositorio import (
    active_product, create_lot, create_purchase, create_purchase_detail,
    deliver_lot, list_purchase_page, list_purchases, lock_purchase,
    pending_purchase_state, purchase_lines, purchase_state_id,
    provider_category_ids, provider_is_active, set_purchase_state,
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
    if data["requested_delivery_date"] < timezone.localdate():
        raise ValidationError({"requested_delivery_date": "La fecha requerida de entrega no puede estar en el pasado."})
    supplier_email = DatosProveedor.objects.filter(
        pk=data["provider_email_id"], proveedor_id=provider_id, tipo="correo",
    ).values_list("valor", flat=True).first()
    supplier_phone = DatosProveedor.objects.filter(
        pk=data["provider_phone_id"], proveedor_id=provider_id, tipo="telefono",
    ).values_list("valor", flat=True).first()
    if not supplier_email or not supplier_phone:
        raise ValidationError({"detail": "Selecciona un correo y teléfono registrados para este proveedor."})
    supplier = Proveedores.objects.get(pk=provider_id)
    contact_snapshot = {"name": "", "role": "", "phone": "", "email": ""}
    contact_id = data.get("contact_id")
    if contact_id:
        contact = ContactosProveedor.objects.select_related("cargo").prefetch_related("datos_contacto").filter(
            pk=contact_id, proveedor_id=provider_id, activo=True,
        ).first()
        if not contact:
            raise ValidationError({"contact_id": "El contacto no pertenece al proveedor o está inactivo."})
        contact_data = list(contact.datos_contacto.all())
        contact_snapshot = {
            "name": contact.nombre,
            "role": contact.cargo_otro if contact.cargo.nombre.lower() == "otros" else contact.cargo.nombre,
            "phone": ", ".join(item.valor for item in contact_data if item.tipo == "telefono"),
            "email": ", ".join(item.valor for item in contact_data if item.tipo == "correo"),
        }
    company = EmpresaCompradora.objects.filter(pk=1).first()
    if not company:
        raise ValidationError({"detail": "No están configurados los datos de la empresa compradora."})
    tax = ConfiguracionTributaria.objects.filter(
        empresa=company, codigo="IGV", activo=True,
        vigente_desde__lte=timezone.localdate(),
    ).order_by("-vigente_desde").first()
    if not tax:
        raise ValidationError({"detail": "No hay una tasa de IGV vigente configurada."})
    categorias_proveedor = provider_category_ids(provider_id)
    if not categorias_proveedor:
        raise ValidationError({"detail": "El proveedor no tiene categorías de productos asignadas."})
    centavo = Decimal("0.01")
    line_subtotals = []
    validated_lines = []
    for line in lines:
        product_id = required_id(line.get("product_id"), "product_id")
        quantity = decimal_value(line.get("quantity"), "quantity", strict=True)
        unit_price = decimal_value(line.get("unit_price"), "unit_price", strict=True)
        product = active_product(product_id)
        if not product:
            raise ValidationError({"items": "Producto inválido."})
        if product["id_categoria"] not in categorias_proveedor:
            raise ValidationError({"items": "El producto no pertenece a las categorías del proveedor seleccionado."})
        line_subtotals.append((quantity * unit_price).quantize(centavo, rounding=ROUND_HALF_UP))
        validated_lines.append((product_id, product["name"], quantity, unit_price, product["perecible"], line.get("expiry_date")))
    subtotal = sum(line_subtotals, Decimal("0.00")).quantize(centavo, rounding=ROUND_HALF_UP)
    igv_amount = (subtotal * tax.porcentaje / Decimal("100")).quantize(centavo, rounding=ROUND_HALF_UP)
    total = subtotal + igv_amount
    group_names = list(user.groups.values_list("name", flat=True))
    role = "Administrador" if user.is_superuser or any(name.lower() in {"admin", "administrador"} for name in group_names) else (group_names[0] if group_names else "Usuario")
    company_snapshot = {
        "razon_social": company.razon_social,
        "nombre_comercial": company.nombre_comercial,
        "ruc": company.ruc,
        "domicilio_fiscal": company.domicilio_fiscal,
        "telefono": company.telefono,
        "correo_electronico": company.correo_electronico,
    }
    order_data = {
        "requested_delivery_date": data["requested_delivery_date"],
        "delivery_address": data["delivery_address"].strip(),
        "provider_name": supplier.nombre,
        "provider_legal_name": supplier.razon_social,
        "provider_ruc": supplier.ruc,
        "provider_email": supplier_email,
        "provider_phone": supplier_phone,
        "contact_name": contact_snapshot["name"],
        "contact_role": contact_snapshot["role"],
        "contact_phone": contact_snapshot["phone"],
        "contact_email": contact_snapshot["email"],
        "observations": data.get("observations", "").strip(),
        "subtotal": subtotal,
        "igv_rate": tax.porcentaje,
        "igv_amount": igv_amount,
        "total": total,
        "company": company_snapshot,
        "responsible_name": user.get_full_name().strip() or user.get_username(),
        "responsible_role": role,
    }
    purchase_id = create_purchase(provider_id, pending["id"], user.id, order_data)
    for product_id, product_name, quantity, unit_price, perishable, expiry in validated_lines:
        detail_id = create_purchase_detail(purchase_id, product_id, product_name, quantity, unit_price)
        create_lot(detail_id, quantity, expiry if perishable else None)
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
                    expiry_date = expiry if isinstance(expiry, date) else date.fromisoformat(expiry)
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
