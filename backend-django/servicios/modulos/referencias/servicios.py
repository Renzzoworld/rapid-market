from ...permissions import is_administrator
from .repositorio import reference_data


def obtener_referencias(user):
    data = reference_data()
    if not is_administrator(user):
        data["providers"] = []
        data["expense_categories"] = []
    return data
