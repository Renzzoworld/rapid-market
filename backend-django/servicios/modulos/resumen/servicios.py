from ...permissions import is_administrator
from .repositorio import dashboard_summary


def obtener_dashboard(user):
    administrator = is_administrator(user)
    return dashboard_summary(
        user_id=None if administrator else user.id,
        include_financials=administrator,
    )
