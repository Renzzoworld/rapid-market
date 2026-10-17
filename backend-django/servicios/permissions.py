from rest_framework.permissions import BasePermission


def is_administrator(user):
    return getattr(user, "role_name", "").strip().casefold() in {"administrador", "admin"}


class IsAdministrator(BasePermission):
    message = "Esta acción requiere el rol Administrador."

    def has_permission(self, request, view):
        return is_administrator(request.user)
