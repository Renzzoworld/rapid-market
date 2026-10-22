from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import obtener_referencias, registrar_proveedor
from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import ProveedorSerializer


class ReferenceDataView(APIView):
    def get(self, request):
        return Response(obtener_referencias(request.user))


class ProvidersView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def post(self, request):
        serializador = ProveedorSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        return Response(registrar_proveedor(serializador.validated_data), status=status.HTTP_201_CREATED)
