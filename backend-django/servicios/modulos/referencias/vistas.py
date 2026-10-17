from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import obtener_referencias, registrar_proveedor
from ...compartido.api_base import AdminWriteMixin


class ReferenceDataView(APIView):
    def get(self, request):
        return Response(obtener_referencias(request.user))


class ProvidersView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def post(self, request):
        return Response(registrar_proveedor(request.data), status=status.HTTP_201_CREATED)
