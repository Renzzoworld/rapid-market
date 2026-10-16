from django.db import DatabaseError
from rest_framework.exceptions import ValidationError

from ...permissions import is_administrator
from .repositorio import create_provider, reference_data
from ...compartido.validacion import object_payload


def obtener_referencias(user):
    data = reference_data()
    if not is_administrator(user):
        data["providers"] = []
        data["expense_categories"] = []
    return data


def registrar_proveedor(payload):
    data = object_payload(payload)
    name = str(data.get("name", "")).strip()
    if not name or len(name) > 150:
        raise ValidationError({"name": "El nombre es obligatorio y debe tener hasta 150 caracteres."})
    try:
        provider_id, provider_name = create_provider(name)
    except DatabaseError:
        raise ValidationError({"name": "Ese proveedor ya existe o los datos no son válidos."})
    return {"id": provider_id, "name": provider_name}
