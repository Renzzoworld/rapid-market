from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.utils import timezone

from .servicios import listar_compras, procesar_accion_compra, registrar_compra
from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import CompraSerializer, DatosVaciosSerializer, EntregaCompraSerializer
from ...models import ConfiguracionTributaria, EmpresaCompradora
from .documentos import generar_pdf_orden_compra
from .repositorio import list_purchases


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
