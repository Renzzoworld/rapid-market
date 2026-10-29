from django.db import DatabaseError
from rest_framework.exceptions import ValidationError

from ...compartido.validacion import pagination_params
from .repositorio import listar_proveedores, guardar_proveedor


def consultar_proveedores(query_params):
    page, search = pagination_params(query_params)
    return listar_proveedores(page, search)


def crear_proveedor(data):
    nombre = data["name"].strip()
    if not nombre:
        raise ValidationError({"name": "El nombre es obligatorio."})

    ruc = data.get("ruc", "").strip()
    if ruc and (len(ruc) != 11 or not ruc.isdigit()):
        raise ValidationError({"ruc": "El RUC debe tener 11 dígitos."})

    try:
        return guardar_proveedor({**data, "name": nombre, "ruc": ruc})
    except DatabaseError:
        raise ValidationError({"detail": "El nombre o RUC ya está registrado."})