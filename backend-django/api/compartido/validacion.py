from collections.abc import Mapping
from decimal import Decimal, InvalidOperation

from rest_framework.exceptions import ValidationError


def required_id(value, field):
    try:
        result = int(value)
        if result < 1:
            raise ValueError
        return result
    except (TypeError, ValueError):
        raise ValidationError({field: "Selecciona una opción válida."})


def decimal_value(value, field, *, minimum=Decimal("0"), strict=False):
    try:
        result = Decimal(str(value))
        if not result.is_finite() or result > Decimal("999999999.999") or (result <= minimum if strict else result < minimum):
            raise InvalidOperation
        return result
    except (InvalidOperation, TypeError, ValueError):
        message = "Ingresa un número válido y mayor que cero." if strict else "Ingresa un número válido no negativo."
        raise ValidationError({field: message})


def boolean_value(value, field, default=False):
    if value is None:
        return default
    if not isinstance(value, bool):
        raise ValidationError({field: "El valor debe ser verdadero o falso."})
    return value


def object_payload(data):
    if not isinstance(data, Mapping):
        raise ValidationError({"detail": "Envía los datos en formato de objeto."})
    return data


def pagination_params(query_params):
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
    return page, search
