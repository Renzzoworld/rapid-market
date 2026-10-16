from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import obtener_dashboard, obtener_reporte
from ..referencias.servicios import obtener_referencias
from ...compartido.api_base import AdminWriteMixin


class ReportsView(AdminWriteMixin, APIView):
    admin_methods = {"GET"}

    def get(self, request):
        return Response(obtener_reporte(request.query_params))


class DashboardView(APIView):
    def get(self, request):
        summary = obtener_dashboard(request.user)
        summary["references"] = obtener_referencias(request.user)
        return Response(summary)
