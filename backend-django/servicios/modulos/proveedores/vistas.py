from pathlib import Path
from uuid import uuid4

from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from ...compartido.api_base import AdminWriteMixin
from ...compartido.serializers import (
    ActualizarProveedorSerializer,
    ProveedorSerializer,
)
from ...models import CanalesProveedor, Compras, ContactosProveedor, Proveedores
from .serializers_relacionados import (
    CanalProveedorSerializer,
    ContactoProveedorSerializer,
)
from .servicios import consultar_proveedores, crear_proveedor


def proveedor_como_json(proveedor, *, incluir_relaciones=False):
    resultado = {
        "id": proveedor.id,
        "name": proveedor.nombre,
        "ruc": proveedor.ruc or "",
        "address": proveedor.direccion,
        "logo": proveedor.logo,
        "active": proveedor.activo,
    }
    if incluir_relaciones:
        resultado["contacts"] = ContactoProveedorSerializer(
            proveedor.contactos.order_by("nombre"), many=True
        ).data
        resultado["channels"] = CanalProveedorSerializer(
            proveedor.canales.select_related("contacto").order_by("nombre"),
            many=True,
        ).data
    return resultado


def guardar_logo(upload):
    extension = Path(upload.name).suffix.lower()
    return default_storage.save(f"Proveedores/{uuid4().hex}{extension}", upload)


class ProvidersManagementView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request):
        return Response(consultar_proveedores(request.query_params))

    def post(self, request):
        serializer = ProveedorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = dict(serializer.validated_data)
        archivo_logo = datos.pop("logo_file", None)
        ruta_logo = guardar_logo(archivo_logo) if archivo_logo else ""
        datos["logo"] = ruta_logo

        try:
            proveedor = crear_proveedor(datos)
        except ValidationError:
            if ruta_logo:
                default_storage.delete(ruta_logo)
            raise
        return Response(proveedor, status=status.HTTP_201_CREATED)


class ProviderDetailView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "PATCH", "DELETE"}

    def get(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        return Response(proveedor_como_json(proveedor, incluir_relaciones=True))

    def patch(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        serializer = ActualizarProveedorSerializer(
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        datos = dict(serializer.validated_data)
        archivo_logo = datos.pop("logo_file", None)
        logo_anterior = proveedor.logo
        logo_nuevo = guardar_logo(archivo_logo) if archivo_logo else None

        if "name" in datos:
            proveedor.nombre = datos["name"].strip()
        if "ruc" in datos:
            proveedor.ruc = datos["ruc"] or None
        if "address" in datos:
            proveedor.direccion = datos["address"]
        if "active" in datos:
            proveedor.activo = datos["active"]
        if logo_nuevo:
            proveedor.logo = logo_nuevo

        try:
            proveedor.save()
        except IntegrityError as error:
            if logo_nuevo:
                default_storage.delete(logo_nuevo)
            raise ValidationError(
                {"detail": "El nombre o RUC ya está registrado."}
            ) from error

        if logo_nuevo and logo_anterior:
            default_storage.delete(logo_anterior)
        return Response(proveedor_como_json(proveedor))

    def delete(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        if Compras.objects.filter(id_proveedor_id=provider_id).exists():
            return Response(
                {"detail": "Este proveedor tiene compras asociadas. Desactívalo para conservar el historial."},
                status=status.HTTP_409_CONFLICT,
            )

        ruta_logo = proveedor.logo
        try:
            proveedor.delete()
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar un proveedor que tiene compras asociadas. Desactívalo."},
                status=status.HTTP_409_CONFLICT,
            )
        if ruta_logo:
            default_storage.delete(ruta_logo)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ContactosProveedorView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        contactos = proveedor.contactos.order_by("nombre")
        return Response(ContactoProveedorSerializer(contactos, many=True).data)

    @transaction.atomic
    def post(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        serializer = ContactoProveedorSerializer(
            data=request.data,
            context={"proveedor": proveedor},
        )
        serializer.is_valid(raise_exception=True)
        contacto = serializer.save()
        return Response(
            ContactoProveedorSerializer(contacto).data,
            status=status.HTTP_201_CREATED,
        )


class ContactoProveedorDetailView(AdminWriteMixin, APIView):
    admin_methods = {"PATCH", "DELETE"}

    @transaction.atomic
    def patch(self, request, provider_id, contact_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        contacto = get_object_or_404(
            ContactosProveedor,
            pk=contact_id,
            proveedor_id=provider_id,
        )
        serializer = ContactoProveedorSerializer(
            contacto,
            data=request.data,
            partial=True,
            context={"proveedor": proveedor},
        )
        serializer.is_valid(raise_exception=True)
        return Response(ContactoProveedorSerializer(serializer.save()).data)

    def delete(self, request, provider_id, contact_id):
        get_object_or_404(Proveedores, pk=provider_id)
        contacto = get_object_or_404(
            ContactosProveedor,
            pk=contact_id,
            proveedor_id=provider_id,
        )
        contacto.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CanalesProveedorView(AdminWriteMixin, APIView):
    admin_methods = {"GET", "POST"}

    def get(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        canales = proveedor.canales.select_related("contacto").order_by("nombre")
        return Response(CanalProveedorSerializer(canales, many=True).data)

    def post(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        serializer = CanalProveedorSerializer(
            data=request.data,
            context={"proveedor": proveedor},
        )
        serializer.is_valid(raise_exception=True)
        try:
            canal = CanalesProveedor.objects.create(
                proveedor=proveedor,
                **serializer.validated_data,
            )
        except IntegrityError as error:
            raise ValidationError(
                {"valor": "Ya existe ese dato para el mismo medio en este proveedor."}
            ) from error
        return Response(
            CanalProveedorSerializer(canal).data,
            status=status.HTTP_201_CREATED,
        )


class CanalProveedorDetailView(AdminWriteMixin, APIView):
    admin_methods = {"PATCH", "DELETE"}

    def patch(self, request, provider_id, channel_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        canal = get_object_or_404(
            CanalesProveedor,
            pk=channel_id,
            proveedor_id=provider_id,
        )
        serializer = CanalProveedorSerializer(
            canal,
            data=request.data,
            partial=True,
            context={"proveedor": proveedor},
        )
        serializer.is_valid(raise_exception=True)
        try:
            canal = serializer.save()
        except IntegrityError as error:
            raise ValidationError(
                {"valor": "Ya existe ese dato para el mismo medio en este proveedor."}
            ) from error
        return Response(CanalProveedorSerializer(canal).data)

    def delete(self, request, provider_id, channel_id):
        get_object_or_404(Proveedores, pk=provider_id)
        canal = get_object_or_404(
            CanalesProveedor,
            pk=channel_id,
            proveedor_id=provider_id,
        )
        canal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
