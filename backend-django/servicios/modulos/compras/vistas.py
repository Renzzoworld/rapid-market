from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import listar_compras, procesar_accion_compra, registrar_compra
from ...compartido.api_base import AdminWriteMixin


class PurchasesView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        return Response(listar_compras(request.query_params))

    def post(self, request):
        return Response(registrar_compra(request.user, request.data), status=status.HTTP_201_CREATED)


class PurchaseActionView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def post(self, request, purchase_id, action):
        result, error, response_status = procesar_accion_compra(purchase_id, action, request.data)
        if error:
            return Response(error, status=response_status)
        return Response(result, status=response_status)
