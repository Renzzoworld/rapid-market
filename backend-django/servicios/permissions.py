from rest_framework.permissions import BasePermission


def is_administrator(user):
    return bool(
        user.is_authenticated
        and user.is_active
        and (user.is_superuser or user.groups.filter(name="Administrador").exists())
    )


def user_role(user):
    if is_administrator(user):
        return "Administrador"
    if user.groups.filter(name="Vendedor").exists():
        return "Vendedor"
    return ""


class IsAdministrator(BasePermission):
    message = "Esta acción requiere el rol Administrador."

    def has_permission(self, request, view):
        return is_administrator(request.user)
