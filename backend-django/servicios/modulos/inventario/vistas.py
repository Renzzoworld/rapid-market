from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import (
    actualizar_producto, crear_producto, desactivar_producto,
    listar_productos, obtener_producto,
)
from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import ActualizarProductoSerializer, ProductoSerializer


def datos_validados(clase_serializador, datos, *, parcial=False):
    serializador = clase_serializador(data=datos, partial=parcial)
    serializador.is_valid(raise_exception=True)
    return serializador.validated_data


class ProductListView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def get(self, request):
        return Response(listar_productos(request.query_params))

    def post(self, request):
        return Response(crear_producto(datos_validados(ProductoSerializer, request.data)), status=status.HTTP_201_CREATED)


class ProductDetailView(AdminWriteMixin, APIView):
    admin_methods = {"PATCH", "DELETE"}

    def get(self, request, product_id):
        product = obtener_producto(product_id)
        if not product:
            return Response({"detail": "Producto no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(product)

    def patch(self, request, product_id):
        payload = datos_validados(ActualizarProductoSerializer, request.data, parcial=True)
        product = actualizar_producto(product_id, payload)
        if not product:
            return Response({"detail": "Producto no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(product)

    def delete(self, request, product_id):
        if not desactivar_producto(product_id):
            return Response({"detail": "Producto no encontrado o ya desactivado."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
