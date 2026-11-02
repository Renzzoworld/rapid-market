from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from pathlib import PurePath

from .servicios import listar_compras, procesar_accion_compra, registrar_compra, registrar_factura_proveedor
from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import CompraSerializer, FacturaProveedorSerializer, RecepcionCompraSerializer
from ...models import ConfiguracionTributaria, EmpresaCompradora, FacturaProveedor
from .documentos import generar_pdf_orden_compra
from .repositorio import last_provider_product_price, list_purchases


class PurchaseOrderDefaultsView(AdminWriteMixin, APIView):
    admin_methods = {"GET"}

    def get(self, request):
        empresa = EmpresaCompradora.objects.filter(pk=1).first()
        if not empresa:
            return Response({"detail": "Configura los datos de la empresa compradora."}, status=409)
        tasa = ConfiguracionTributaria.objects.filter(
            empresa=empresa, codigo="IGV", activo=True,
            vigente_desde__lte=timezone.localdate(),
        ).order_by("-vigente_desde").first()
        if not tasa:
            return Response({"detail": "No hay una tasa de IGV vigente configurada."}, status=409)
        return Response({
            "company": {
                "razon_social": empresa.razon_social,
                "nombre_comercial": empresa.nombre_comercial,
                "ruc": empresa.ruc,
                "domicilio_fiscal": empresa.domicilio_fiscal,
                "telefono": empresa.telefono,
                "correo_electronico": empresa.correo_electronico,
            },
            "igv_rate": str(tasa.porcentaje),
        })


class PurchaseOrderPDFView(AdminWriteMixin, APIView):
    admin_methods = {"GET"}

    def get(self, request, purchase_id):
        compras = list_purchases(purchase_id=purchase_id)
        if not compras:
            return Response({"detail": "Orden de compra no encontrada."}, status=404)
        purchase = compras[0]
        pdf = generar_pdf_orden_compra(purchase)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="OC-{purchase_id:06d}.pdf"'
        return response


class PurchaseLastPriceView(AdminWriteMixin, APIView):
    admin_methods = {"GET"}

    def get(self, request):
        provider_id = request.query_params.get("provider_id")
        product_id = request.query_params.get("product_id")
        if provider_id is None or product_id is None:
            return Response({"detail": "provider_id y product_id son obligatorios."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            provider_id = int(provider_id)
            product_id = int(product_id)
        except (TypeError, ValueError):
            return Response({"detail": "provider_id y product_id deben ser enteros válidos."}, status=status.HTTP_400_BAD_REQUEST)
        price = last_provider_product_price(provider_id, product_id)
        return Response({"last_price": float(price) if price is not None else None})


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
        if action == "cancel":
            result, error, response_status = procesar_accion_compra(purchase_id, action, {}, request.user)
            if error:
                return Response(error, status=response_status)
            return Response(result, status=response_status)
        if action != "receive":
            return Response({"detail": "Acción no válida."}, status=status.HTTP_404_NOT_FOUND)
        serializador = RecepcionCompraSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        result, error, response_status = procesar_accion_compra(purchase_id, action, serializador.validated_data, request.user)
        if error:
            return Response(error, status=response_status)
        return Response(result, status=response_status)


class PurchaseInvoiceView(AdminWriteMixin, APIView):
    admin_methods = {"POST"}

    def post(self, request, purchase_id):
        serializer = FacturaProveedorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"invoice": registrar_factura_proveedor(request.user, purchase_id, serializer.validated_data)}, status=status.HTTP_201_CREATED)


class PurchaseInvoiceFileView(AdminWriteMixin, APIView):
    admin_methods = {"GET"}

    def get(self, request, purchase_id):
        invoice = get_object_or_404(FacturaProveedor, compra_id=purchase_id)
        if not invoice.archivo:
            return Response({"detail": "Esta factura no tiene un archivo adjunto."}, status=status.HTTP_404_NOT_FOUND)
        filename = PurePath(invoice.archivo.name).name
        return FileResponse(invoice.archivo.open("rb"), as_attachment=True, filename=filename)
