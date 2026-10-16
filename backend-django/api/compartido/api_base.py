from rest_framework.permissions import IsAuthenticated

from ..permissions import IsAdministrator

class AdminWriteMixin:
    admin_methods = set()

    def get_permissions(self):
        if self.request.method in self.admin_methods:
            return [IsAuthenticated(), IsAdministrator()]
        return [IsAuthenticated()]
