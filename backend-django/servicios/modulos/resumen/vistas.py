from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import obtener_dashboard
from ..referencias.servicios import obtener_referencias


class DashboardView(APIView):
    def get(self, request):
        summary = obtener_dashboard(request.user)
        summary["references"] = obtener_referencias(request.user)
        return Response(summary)
