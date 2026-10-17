from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import listar_gastos, registrar_gasto
from ...compartido.api_base import AdminWriteMixin


class ExpensesView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        return Response(listar_gastos(request.query_params))

    def post(self, request):
        return Response(registrar_gasto(request.user, request.data), status=status.HTTP_201_CREATED)
