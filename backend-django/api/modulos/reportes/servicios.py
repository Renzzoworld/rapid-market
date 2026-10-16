from datetime import date

from rest_framework.exceptions import ValidationError

from ...permissions import is_administrator
from .repositorio import dashboard_summary, report_data
from ...compartido.validacion import pagination_params

PAGE_SIZE = 10


def obtener_dashboard(user):
    administrator = is_administrator(user)
    return dashboard_summary(
        user_id=None if administrator else user.id,
        include_financials=administrator,
    )


def obtener_reporte(query_params):
    page, _ = pagination_params(query_params)
    start = query_params.get("from")
    end = query_params.get("to")
    try:
        if start:
            date.fromisoformat(start)
        if end:
            date.fromisoformat(end)
        if start and end and start > end:
            raise ValueError
    except ValueError:
        raise ValidationError({"detail": "Rango de fechas no válido."})
    data = report_data(start, end, page, PAGE_SIZE)
    data["estimated_profit"] = data["sales_total"] - data["cost_of_goods_sold"] - data["expenses_total"]
    return data
