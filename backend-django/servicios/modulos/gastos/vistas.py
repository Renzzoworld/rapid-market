from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import listar_gastos, registrar_gasto
from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import GastoSerializer


class ExpensesView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        return Response(listar_gastos(request.query_params))

    def post(self, request):
        serializador = GastoSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        return Response(registrar_gasto(request.user, serializador.validated_data), status=status.HTTP_201_CREATED)
