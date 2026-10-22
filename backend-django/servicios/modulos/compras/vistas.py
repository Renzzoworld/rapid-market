from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import listar_compras, procesar_accion_compra, registrar_compra
from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import CompraSerializer, DatosVaciosSerializer, EntregaCompraSerializer


class PurchasesView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        return Response(listar_compras(request.query_params))

    def post(self, request):
        serializador = CompraSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        return Response(registrar_compra(request.user, serializador.validated_data), status=status.HTTP_201_CREATED)


class PurchaseActionView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def post(self, request, purchase_id, action):
        if action == "deliver":
            serializador = EntregaCompraSerializer(data=request.data)
            serializador.is_valid(raise_exception=True)
            payload = serializador.validated_data
        elif action == "cancel":
            serializador = DatosVaciosSerializer(data=request.data)
            serializador.is_valid(raise_exception=True)
            payload = serializador.validated_data
        else:
            payload = request.data
        result, error, response_status = procesar_accion_compra(purchase_id, action, payload)
        if error:
            return Response(error, status=response_status)
        return Response(result, status=response_status)
