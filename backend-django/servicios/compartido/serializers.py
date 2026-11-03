"""Serializadores para validar los datos recibidos por la API."""

from decimal import Decimal
import json

from rest_framework import serializers

from .campos_imagen import ImagenValidadaField


class JSONListField(serializers.Field):
    """Acepta listas JSON tanto en application/json como en multipart/form-data."""
    default_error_messages = {"invalid": "Envía una lista válida."}

    def to_internal_value(self, data):
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except (TypeError, ValueError):
                self.fail("invalid")
        if not isinstance(data, list):
            self.fail("invalid")
        return data

    def to_representation(self, value):
        return value


class ProductoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True, required=True)
    unit_id = serializers.IntegerField(min_value=1)
    category_id = serializers.IntegerField(min_value=1)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("999999999.99"))
    perishable = serializers.BooleanField(required=False, default=False)
    min_stock = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0"), max_value=Decimal("999999999.999"), required=False, default=5)
    image = ImagenValidadaField(required=False)


class ActualizarProductoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True, required=False)
    unit_id = serializers.IntegerField(min_value=1, required=False)
    category_id = serializers.IntegerField(min_value=1, required=False)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("999999999.99"), required=False)
    perishable = serializers.BooleanField(required=False)
    min_stock = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0"), max_value=Decimal("999999999.999"), required=False)
    image = ImagenValidadaField(required=False)
    remove_image = serializers.BooleanField(required=False, default=False)


class ArticuloVentaSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"), max_value=Decimal("999999999.999"))


class VentaSerializer(serializers.Serializer):
    sale_type_id = serializers.IntegerField(min_value=1)
    payment_method_id = serializers.IntegerField(min_value=1)
    items = ArticuloVentaSerializer(many=True, allow_empty=False, max_length=100)


class ArticuloCompraSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0.001"), max_value=Decimal("999999999.999"))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("999999999.99"))
    expiry_date = serializers.DateField(required=False, allow_null=True)


class CompraSerializer(serializers.Serializer):
    provider_id = serializers.IntegerField(min_value=1)
    provider_email_id = serializers.IntegerField(min_value=1)
    provider_phone_id = serializers.IntegerField(min_value=1)
    contact_id = serializers.IntegerField(min_value=1, required=False, allow_null=True)
    requested_delivery_date = serializers.DateField()
    delivery_address = serializers.CharField(max_length=250, trim_whitespace=True)
    observations = serializers.CharField(max_length=2000, trim_whitespace=False, allow_blank=True, required=False, default='')
    items = ArticuloCompraSerializer(many=True, allow_empty=False, max_length=100)


class GastoSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=200, trim_whitespace=True)
    category_id = serializers.IntegerField(min_value=1)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("999999999.99"))


class ProveedorSerializer(serializers.Serializer):
    razon_social = serializers.CharField(max_length=180, trim_whitespace=True)
    name = serializers.CharField(max_length=150, trim_whitespace=True)
    ruc = serializers.RegexField(r'^\d{11}$')
    address = serializers.CharField(max_length=250, trim_whitespace=True)
    categorias = JSONListField()
    horarios = JSONListField()
    datos_contacto = JSONListField()
    logo_file = ImagenValidadaField(required=False)


class ActualizarProveedorSerializer(serializers.Serializer):
    razon_social = serializers.CharField(max_length=180, trim_whitespace=True, required=False)
    name = serializers.CharField(
        max_length=150,
        trim_whitespace=True,
        required=False,
    )
    ruc = serializers.RegexField(r'^\d{11}$', required=False)
    address = serializers.CharField(
        max_length=250,
        required=False,
    )
    categorias = JSONListField(required=False)
    horarios = JSONListField(required=False)
    datos_contacto = JSONListField(required=False)
    logo_file = ImagenValidadaField(required=False)
    active = serializers.BooleanField(required=False)


class InicioSesionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


class CierreSesionSerializer(serializers.Serializer):
    refresh = serializers.CharField(max_length=4096, trim_whitespace=True)


class DetalleRecepcionSerializer(serializers.Serializer):
    detail_id = serializers.IntegerField(min_value=1)
    received_quantity = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0"), max_value=Decimal("999999999.999"))
    conforme = serializers.BooleanField()
    motivo_rechazo = serializers.CharField(max_length=250, allow_blank=True, required=False, default='')
    expiry_date = serializers.DateField(required=False, allow_null=True)


class RecepcionCompraSerializer(serializers.Serializer):
    items = DetalleRecepcionSerializer(many=True, allow_empty=False, max_length=100)
    observations = serializers.CharField(max_length=2000, allow_blank=True, required=False, default='')


class FacturaProveedorSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=["Factura", "Boleta", "Otro"])
    numero = serializers.CharField(max_length=50, trim_whitespace=True)
    fecha_emision = serializers.DateField()
    monto_total = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("999999999.99"))
    archivo = serializers.FileField(required=False, allow_empty_file=False)

    def validate_archivo(self, archivo):
        extension = archivo.name.rsplit(".", 1)[-1].lower() if "." in archivo.name else ""
        if extension not in {"pdf", "xml", "jpg", "jpeg", "png"}:
            raise serializers.ValidationError("Adjunta un PDF, XML, JPG o PNG.")
        if archivo.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("El archivo no puede superar los 10 MB.")
        return archivo
