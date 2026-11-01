from collections.abc import Mapping
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from ...models import (
    Compras, ConfiguracionTributaria, ContactosProveedor, DatosProveedor,
    DetalleRecepcionCompra, EmpresaCompradora, FacturaProveedor,
    RecepcionCompra, Proveedores,
)

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
def procesar_accion_compra(purchase_id, action, payload, user):
    data = object_payload(payload)
    purchase = lock_purchase(purchase_id)
    if not purchase:
        return None, {"detail": "Compra no encontrada."}, 404
    if purchase["state"] != "Pendiente":
        raise ValidationError({"detail": "Solo se puede modificar una compra pendiente."})
    if action == "receive":
        lines = purchase_lines(purchase_id)
        submitted = data.get("items")
        if not isinstance(submitted, list) or len(submitted) != len(lines):
            raise ValidationError({"items": "Registra la revisión de todos los productos de la orden."})
        by_id = {item["detail_id"]: item for item in submitted}
        line_ids = {line["id"] for line in lines}
        if len(by_id) != len(submitted) or set(by_id) != line_ids:
            raise ValidationError({"items": "Los productos revisados no coinciden con la orden."})

        reviewed = []
        accepted_count = 0
        for line in lines:
            item = by_id[line["id"]]
            quantity = item["received_quantity"]
            rejection_reason = item.get("motivo_rechazo", "").strip()
            if not item["conforme"] and not rejection_reason:
                raise ValidationError({"items": "Indica por qué se rechaza cada producto observado."})
            reasons = []
            quantity_matches = quantity == line["ordered_quantity"]
            if not quantity_matches:
                reasons.append("La cantidad recibida no coincide con la solicitada.")
            expiry = item.get("expiry_date")
            if line["perecible"] and item["conforme"] and quantity_matches and not expiry:
                raise ValidationError({"items": "Indica el vencimiento de cada producto perecible conforme."})
            if line["perecible"] and expiry and expiry < timezone.localdate():
                reasons.append("El producto tiene fecha de vencimiento pasada.")
            line_conforms = item["conforme"] and not reasons
            if line_conforms:
                accepted_count += 1
            reviewed.append({
                "detail_id": line["id"], "quantity": quantity,
                "conforme": line_conforms,
                "reason": " ".join(reason for reason in [rejection_reason, *reasons] if reason),
                "expiry": expiry,
            })

        if accepted_count == len(lines):
            result = "Recibido"
        elif accepted_count:
            result = "Parcialmente entregado"
        else:
            result = "Rechazado"
        receipt = RecepcionCompra.objects.create(
            compra_id=purchase_id, resultado=result,
            observaciones=data.get("observations", "").strip(), registrado_por=user,
        )
        for item in reviewed:
            DetalleRecepcionCompra.objects.create(
                recepcion=receipt, detalle_compra_id=item["detail_id"],
                cantidad_recibida=item["quantity"], conforme=item["conforme"],
                motivo_rechazo=item["reason"], fecha_vencimiento=item["expiry"],
            )
            if item["conforme"]:
                deliver_lot(item["detail_id"], item["quantity"], item["expiry"])
    else:
        return None, {"detail": "Acción no válida."}, 404
    state = purchase_state_id(result)
    set_purchase_state(purchase_id, state["id"])
    return list_purchases(purchase_id=purchase_id)[0], None, 200


@transaction.atomic
def registrar_factura_proveedor(user, purchase_id, payload):
    purchase = Compras.objects.select_for_update().filter(pk=purchase_id).first()
    if not purchase:
        raise ValidationError({"detail": "Orden de compra no encontrada."})
    if FacturaProveedor.objects.filter(compra_id=purchase_id).exists():
        raise ValidationError({"detail": "Esta orden ya tiene una factura registrada."})
    data = object_payload(payload)
    invoice = FacturaProveedor.objects.create(
        compra=purchase, tipo=data["tipo"], numero=data["numero"],
        fecha_emision=data["fecha_emision"], monto_total=data["monto_total"],
        archivo=data.get("archivo", ""), registrado_por=user,
    )
    return {
        "tipo": invoice.tipo, "numero": invoice.numero,
        "fecha_emision": invoice.fecha_emision,
        "monto_total": invoice.monto_total,
        "has_file": bool(invoice.archivo),
        "filename": invoice.archivo.name.rsplit("/", 1)[-1] if invoice.archivo else "",
    }
