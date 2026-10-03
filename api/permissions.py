from rest_framework.permissions import BasePermission


class RapidMarketPermission(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        required_permissions = getattr(view, "required_permissions", {})
        method = "GET" if request.method == "HEAD" else request.method
        permission = required_permissions.get(method)

        if permission is None:
            return request.method == "OPTIONS"
        return user.is_superuser or user.has_perm(f"api.{permission}")
