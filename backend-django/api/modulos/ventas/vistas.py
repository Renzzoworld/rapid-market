from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import listar_ventas, registrar_venta


class SalesView(APIView):
    def get(self, request):
        return Response(listar_ventas(request.user, request.query_params))

    def post(self, request):
        result = registrar_venta(request.user, request.data)
        return Response(result, status=status.HTTP_201_CREATED)
