from .repositorio import (
    create_expense, expense_category_exists, get_expense, list_expense_page,
)
from ...compartido.validacion import decimal_value, object_payload, pagination_params, required_id
from rest_framework.exceptions import ValidationError


def listar_gastos(query_params):
    page, search = pagination_params(query_params)
    return list_expense_page(page, search)


def registrar_gasto(user, payload):
    data = object_payload(payload)
    description = str(data.get("description", "")).strip()
    if not description or len(description) > 200:
        raise ValidationError({"description": "La descripción es obligatoria (máximo 200 caracteres)."})
    category_id = required_id(data.get("category_id"), "category_id")
    amount = decimal_value(data.get("amount"), "amount", strict=True)
    if not expense_category_exists(category_id):
        raise ValidationError({"category_id": "Categoría inválida."})
    expense_id = create_expense(description, category_id, amount, user.id)
    return get_expense(expense_id)
