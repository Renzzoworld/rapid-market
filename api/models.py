# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.conf import settings
from django.db import models


class CategoriasGasto(models.Model):
    nombre = models.CharField(unique=True, max_length=50)

    class Meta:
        managed = False
        db_table = 'categorias_gasto'


class Compras(models.Model):
    fecha = models.DateTimeField()
    id_proveedor = models.ForeignKey('Proveedores', models.DO_NOTHING, db_column='id_proveedor')
    id_estado = models.ForeignKey('EstadosCompra', models.DO_NOTHING, db_column='id_estado')
    id_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, models.DO_NOTHING, db_column='id_usuario')

    class Meta:
        managed = False
        db_table = 'compras'


class DetalleCompras(models.Model):
    id_compra = models.ForeignKey(Compras, models.DO_NOTHING, db_column='id_compra')
    id_producto = models.ForeignKey('Productos', models.DO_NOTHING, db_column='id_producto')
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'detalle_compras'


class DetalleVentaLotes(models.Model):
    id_detalle_venta = models.ForeignKey('DetalleVentas', models.DO_NOTHING, db_column='id_detalle_venta')
    id_lote = models.ForeignKey('Lotes', models.DO_NOTHING, db_column='id_lote')
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)

    class Meta:
        managed = False
        db_table = 'detalle_venta_lotes'


class DetalleVentas(models.Model):
    id_venta = models.ForeignKey('Ventas', models.DO_NOTHING, db_column='id_venta')
    id_producto = models.ForeignKey('Productos', models.DO_NOTHING, db_column='id_producto')
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        managed = False
        db_table = 'detalle_ventas'


class EstadosCompra(models.Model):
    nombre = models.CharField(unique=True, max_length=50)

    class Meta:
        managed = False
        db_table = 'estados_compra'


class Gastos(models.Model):
    fecha = models.DateTimeField()
    descripcion = models.CharField(max_length=200)
    id_categoria = models.ForeignKey(CategoriasGasto, models.DO_NOTHING, db_column='id_categoria')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    id_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, models.DO_NOTHING, db_column='id_usuario')

    class Meta:
        managed = False
        db_table = 'gastos'


class Lotes(models.Model):
    id_detalle_compra = models.ForeignKey(DetalleCompras, models.DO_NOTHING, db_column='id_detalle_compra')
    cantidad_inicial = models.DecimalField(max_digits=12, decimal_places=3)
    cantidad_actual = models.DecimalField(max_digits=12, decimal_places=3)
    fecha_vencimiento = models.DateField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'lotes'


class MetodosPago(models.Model):
    nombre = models.CharField(unique=True, max_length=30)
    activo = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'metodos_pago'


class Productos(models.Model):
    nombre = models.CharField(unique=True, max_length=120)
    id_unidad = models.ForeignKey('UnidadesMedida', models.DO_NOTHING, db_column='id_unidad')
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2)
    perecible = models.BooleanField()
    stock_minimo = models.DecimalField(max_digits=12, decimal_places=3)
    activo = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'productos'


class Proveedores(models.Model):
    nombre = models.CharField(unique=True, max_length=150)
    activo = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'proveedores'


class TiposVenta(models.Model):
    nombre = models.CharField(unique=True, max_length=50)
    descuento_porcentaje = models.DecimalField(max_digits=5, decimal_places=2)
    activo = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'tipos_venta'


class UnidadesMedida(models.Model):
    nombre = models.CharField(unique=True, max_length=30)
    abreviatura = models.CharField(unique=True, max_length=10)

    class Meta:
        managed = False
        db_table = 'unidades_medida'


class Ventas(models.Model):
    fecha = models.DateTimeField()
    id_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, models.DO_NOTHING, db_column='id_usuario')
    id_tipo_venta = models.ForeignKey(TiposVenta, models.DO_NOTHING, db_column='id_tipo_venta')
    id_metodo_pago = models.ForeignKey(MetodosPago, models.DO_NOTHING, db_column='id_metodo_pago')

    class Meta:
        managed = False
        db_table = 'ventas'
