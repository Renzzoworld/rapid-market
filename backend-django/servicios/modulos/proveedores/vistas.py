from pathlib import Path
from uuid import uuid4

from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import ProveedorSerializer
from .servicios import consultar_proveedores, crear_proveedor


class ProvidersManagementView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        return Response(consultar_proveedores(request.query_params))

    def post(self, request):
        payload = request.data.copy()
        logo_file = request.FILES.get("logo_file")
        payload.pop("logo_file", None)
        serializer = ProveedorSerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        logo_path = ""
        if logo_file:
            allowed = {".png", ".jpg", ".jpeg", ".webp"}
            extension = Path(logo_file.name).suffix.lower()
            if extension not in allowed or logo_file.content_type not in {"image/png", "image/jpeg", "image/webp"}:
                raise ValidationError({"logo_file": "El logo debe ser PNG, JPG o WebP."})
            if logo_file.size > 2 * 1024 * 1024:
                raise ValidationError({"logo_file": "El logo no puede superar 2 MB."})
            logo_path = default_storage.save(f"Proveedores/{uuid4().hex}{extension}", logo_file)
        data = {**serializer.validated_data, "logo": logo_path}
        return Response(crear_proveedor(data), status=status.HTTP_201_CREATED)
