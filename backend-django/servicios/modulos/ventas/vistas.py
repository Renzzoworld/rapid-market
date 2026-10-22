from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import listar_ventas, registrar_venta
from ...compartido.serializers import VentaSerializer


class SalesView(APIView):
    def get(self, request):
        return Response(listar_ventas(request.user, request.query_params))

    def post(self, request):
        serializador = VentaSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        result = registrar_venta(request.user, serializador.validated_data)
        return Response(result, status=status.HTTP_201_CREATED)
