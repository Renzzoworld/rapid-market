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
from ...compartido.serializers import ActualizarProveedorSerializer, ProveedorSerializer
from ...models import (
    CanalesProveedor, CargosProveedor, CategoriasProductos, Compras,
    ContactosProveedor, DepartamentosProveedor, HorariosProveedor,
    Proveedores, RedesSociales,
)
from .serializers_relacionados import (
    CanalProveedorSerializer, ContactoProveedorSerializer,
    HorarioProveedorSerializer,
)
from ...compartido.validacion import pagination_params


def proveedor_como_json(proveedor, incluir_relaciones=False):
    data = {
        'id': proveedor.id, 'name': proveedor.nombre,
        'razon_social': proveedor.razon_social, 'ruc': proveedor.ruc,
        'address': proveedor.direccion, 'logo': proveedor.logo,
        'active': proveedor.activo,
        'categorias': list(proveedor.categorias.values('id', 'nombre')),
        'horarios': list(proveedor.horarios.order_by('dia_semana', 'hora_inicio').values('dia_semana', 'hora_inicio', 'hora_fin')),
    }
    if incluir_relaciones:
        data['contacts'] = ContactoProveedorSerializer(proveedor.contactos.select_related('cargo').prefetch_related('horarios', 'datos_contacto').order_by('nombre'), many=True).data
        data['channels'] = CanalProveedorSerializer(proveedor.canales.select_related('departamento', 'red_social').order_by('medio', 'valor'), many=True).data
    return data


def guardar_logo(upload):
    extension = Path(upload.name).suffix.lower()
    return default_storage.save(f'Proveedores/{uuid4().hex}{extension}', upload)


def validar_horarios(datos):
    if not isinstance(datos, list) or not datos:
        raise ValidationError({'horarios': 'Registra al menos un día y horario de atención.'})
    serializer = HorarioProveedorSerializer(data=datos, many=True)
    serializer.is_valid(raise_exception=True)
    por_dia = {}
    for h in serializer.validated_data:
        por_dia.setdefault(h['dia_semana'], []).append((h['hora_inicio'], h['hora_fin']))
    for intervalos in por_dia.values():
        intervalos.sort()
        if any(next_[0] < prev[1] for prev, next_ in zip(intervalos, intervalos[1:])):
            raise ValidationError({'horarios': 'Los horarios del mismo día no pueden solaparse.'})
    return serializer.validated_data


def validar_categorias(ids):
    if not isinstance(ids, list) or not ids or any(type(x) is not int or x < 1 for x in ids) or len(set(ids)) != len(ids):
        raise ValidationError({'categorias': 'Selecciona una o más categorías válidas sin repetir.'})
    encontrados = list(CategoriasProductos.objects.filter(id__in=ids))
    if len(encontrados) != len(ids):
        raise ValidationError({'categorias': 'Una o más categorías no existen.'})
    return encontrados


class ProvidersManagementView(AdminWriteMixin, APIView):
    admin_methods = {'GET', 'POST'}

    def get(self, request):
        page, search = pagination_params(request.query_params)
        qs = Proveedores.objects.filter(nombre__icontains=search) | Proveedores.objects.filter(razon_social__icontains=search) | Proveedores.objects.filter(ruc__icontains=search)
        qs = qs.distinct().order_by('nombre', 'id')
        total = qs.count()
        page_size = 9
        page = min(page, max((total + page_size - 1) // page_size, 1))
        proveedores = qs[(page - 1) * page_size:page * page_size]
        return Response({'results': [proveedor_como_json(p) for p in proveedores], 'count': total, 'page': page, 'page_size': page_size})

    @transaction.atomic
    def post(self, request):
        serializer = ProveedorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        categories = validar_categorias(values.pop('categorias'))
        hours = validar_horarios(values.pop('horarios'))
        image = values.pop('logo_file', None)
        logo = guardar_logo(image) if image else ''
        try:
            proveedor = Proveedores.objects.create(
                razon_social=values['razon_social'].strip(), nombre=values['name'].strip(),
                ruc=values['ruc'], direccion=values['address'].strip(), logo=logo,
                activo=True,
            )
            proveedor.categorias.set(categories)
            HorariosProveedor.objects.bulk_create([HorariosProveedor(proveedor=proveedor, **h) for h in hours])
        except IntegrityError as error:
            if logo:
                default_storage.delete(logo)
            raise ValidationError({'detail': 'El nombre comercial o RUC ya está registrado.'}) from error
        return Response(proveedor_como_json(proveedor), status=status.HTTP_201_CREATED)


class ProviderDetailView(AdminWriteMixin, APIView):
    admin_methods = {'GET', 'PATCH', 'DELETE'}

    def get(self, request, provider_id):
        return Response(proveedor_como_json(get_object_or_404(Proveedores, pk=provider_id), True))

    @transaction.atomic
    def patch(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        serializer = ActualizarProveedorSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        values = dict(serializer.validated_data)
        categories = validar_categorias(values.pop('categorias')) if 'categorias' in values else None
        hours = validar_horarios(values.pop('horarios')) if 'horarios' in values else None
        image = values.pop('logo_file', None)
        old_logo = proveedor.logo
        new_logo = guardar_logo(image) if image else None
        for key, field in [('razon_social', 'razon_social'), ('name', 'nombre'), ('ruc', 'ruc'), ('address', 'direccion'), ('active', 'activo')]:
            if key in values:
                setattr(proveedor, field, values[key].strip() if isinstance(values[key], str) else values[key])
        if new_logo:
            proveedor.logo = new_logo
        try:
            proveedor.save()
            if categories is not None:
                proveedor.categorias.set(categories)
            if hours is not None:
                proveedor.horarios.all().delete()
                HorariosProveedor.objects.bulk_create([HorariosProveedor(proveedor=proveedor, **h) for h in hours])
        except IntegrityError as error:
            if new_logo:
                default_storage.delete(new_logo)
            raise ValidationError({'detail': 'El nombre comercial o RUC ya está registrado.'}) from error
        if new_logo and old_logo:
            default_storage.delete(old_logo)
        return Response(proveedor_como_json(proveedor))

    def delete(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        if Compras.objects.filter(id_proveedor_id=provider_id).exists():
            return Response({'detail': 'Tiene compras asociadas; desactívalo para conservar el historial.'}, status=409)
        logo = proveedor.logo
        try:
            proveedor.delete()
        except ProtectedError:
            return Response({'detail': 'No se puede eliminar por sus registros asociados.'}, status=409)
        if logo:
            default_storage.delete(logo)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CatalogosProveedorView(AdminWriteMixin, APIView):
    admin_methods = {'GET'}

    def get(self, request):
        return Response({
            'categorias': list(CategoriasProductos.objects.order_by('id').values('id', 'nombre')),
            'cargos': list(CargosProveedor.objects.order_by('id').values('id', 'nombre')),
            'departamentos': list(DepartamentosProveedor.objects.order_by('id').values('id', 'nombre')),
            'redes_sociales': list(RedesSociales.objects.order_by('id').values('id', 'nombre')),
        })


class ContactosProveedorView(AdminWriteMixin, APIView):
    admin_methods = {'GET', 'POST'}
    def get(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        qs = proveedor.contactos.select_related('cargo').prefetch_related('horarios', 'datos_contacto')
        return Response(ContactoProveedorSerializer(qs, many=True).data)
    @transaction.atomic
    def post(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        serializer = ContactoProveedorSerializer(data=request.data, context={'proveedor': proveedor})
        serializer.is_valid(raise_exception=True)
        return Response(ContactoProveedorSerializer(serializer.save()).data, status=status.HTTP_201_CREATED)


class ContactoProveedorDetailView(AdminWriteMixin, APIView):
    admin_methods = {'PATCH', 'DELETE'}
    @transaction.atomic
    def patch(self, request, provider_id, contact_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        contacto = get_object_or_404(ContactosProveedor, pk=contact_id, proveedor_id=provider_id)
        serializer = ContactoProveedorSerializer(contacto, data=request.data, partial=True, context={'proveedor': proveedor})
        serializer.is_valid(raise_exception=True)
        return Response(ContactoProveedorSerializer(serializer.save()).data)
    def delete(self, request, provider_id, contact_id):
        get_object_or_404(ContactosProveedor, pk=contact_id, proveedor_id=provider_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CanalesProveedorView(AdminWriteMixin, APIView):
    admin_methods = {'GET', 'POST'}
    def get(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        return Response(CanalProveedorSerializer(proveedor.canales.select_related('departamento', 'red_social'), many=True).data)
    def post(self, request, provider_id):
        proveedor = get_object_or_404(Proveedores, pk=provider_id)
        serializer = CanalProveedorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            channel = CanalesProveedor.objects.create(proveedor=proveedor, **serializer.validated_data)
        except IntegrityError as error:
            raise ValidationError({'valor': 'Ese dato ya está registrado para el proveedor.'}) from error
        return Response(CanalProveedorSerializer(channel).data, status=status.HTTP_201_CREATED)


class CanalProveedorDetailView(AdminWriteMixin, APIView):
    admin_methods = {'PATCH', 'DELETE'}
    def patch(self, request, provider_id, channel_id):
        channel = get_object_or_404(CanalesProveedor, pk=channel_id, proveedor_id=provider_id)
        serializer = CanalProveedorSerializer(channel, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            channel = serializer.save()
        except IntegrityError as error:
            raise ValidationError({'valor': 'Ese dato ya está registrado para el proveedor.'}) from error
        return Response(CanalProveedorSerializer(channel).data)
    def delete(self, request, provider_id, channel_id):
        get_object_or_404(CanalesProveedor, pk=channel_id, proveedor_id=provider_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
