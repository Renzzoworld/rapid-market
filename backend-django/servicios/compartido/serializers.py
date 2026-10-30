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


class ActualizarProductoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120, trim_whitespace=True, required=False)
    unit_id = serializers.IntegerField(min_value=1, required=False)
    category_id = serializers.IntegerField(min_value=1, required=False)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"), max_value=Decimal("999999999.99"), required=False)
    perishable = serializers.BooleanField(required=False)
    min_stock = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal("0"), max_value=Decimal("999999999.999"), required=False)


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
    logo_file = ImagenValidadaField(required=False)
    active = serializers.BooleanField(required=False)


class InicioSesionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, trim_whitespace=True)
    password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


class CierreSesionSerializer(serializers.Serializer):
    refresh = serializers.CharField(max_length=4096, trim_whitespace=True)


class EntregaCompraSerializer(serializers.Serializer):
    expiries = serializers.DictField(child=serializers.DateField(input_formats=["%Y-%m-%d"]), required=False, default=dict)


class DatosVaciosSerializer(serializers.Serializer):
    """Acepta un objeto vacío para acciones de compra sin datos adicionales."""

