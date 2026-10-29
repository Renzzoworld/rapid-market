from django.conf import settings
from django.db import models
from django.db.models.functions import Now


class CategoriasGasto(models.Model):
    nombre = models.CharField(unique=True, max_length=50)

    class Meta:
        managed = True
        db_table = 'categorias_gasto'


class Compras(models.Model):
    fecha = models.DateTimeField(db_default=Now())
    id_proveedor = models.ForeignKey('Proveedores', models.DO_NOTHING, db_column='id_proveedor')
    id_estado = models.ForeignKey('EstadosCompra', models.DO_NOTHING, db_column='id_estado')
    id_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, models.DO_NOTHING, db_column='id_usuario')

    class Meta:
        managed = True
        db_table = 'compras'


class DetalleCompras(models.Model):
    id_compra = models.ForeignKey(Compras, models.DO_NOTHING, db_column='id_compra')
    id_producto = models.ForeignKey('Productos', models.DO_NOTHING, db_column='id_producto')
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        managed = True
        db_table = 'detalle_compras'
        constraints = [
            models.CheckConstraint(condition=models.Q(cantidad__gte=0), name='chk_detalle_compra_cantidad'),
            models.CheckConstraint(condition=models.Q(precio_unitario__gte=0), name='chk_detalle_compra_precio'),
        ]


class DetalleVentaLotes(models.Model):
    id_detalle_venta = models.ForeignKey('DetalleVentas', models.DO_NOTHING, db_column='id_detalle_venta')
    id_lote = models.ForeignKey('Lotes', models.DO_NOTHING, db_column='id_lote')
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)

    class Meta:
        managed = True
        db_table = 'detalle_venta_lotes'

    constraints = [
        models.CheckConstraint(condition=models.Q(cantidad__gte=0), name='chk_dvl_cantidad'),
    ]



class DetalleVentas(models.Model):
    id_venta = models.ForeignKey('Ventas', models.DO_NOTHING, db_column='id_venta')
    id_producto = models.ForeignKey('Productos', models.DO_NOTHING, db_column='id_producto')
    cantidad = models.DecimalField(max_digits=12, decimal_places=3)
    precio_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        managed = True
        db_table = 'detalle_ventas'
    constraints = [
            models.CheckConstraint( condition=models.Q(cantidad__gt=0), name='chk_detalle_venta_cantidad'),
            models.CheckConstraint( condition=models.Q(precio_unitario__gt=0), name='chk_detalle_venta_precio'),
        ]


class EstadosCompra(models.Model):
    nombre = models.CharField(unique=True, max_length=50)

    class Meta:
        managed = True
        db_table = 'estados_compra'


class Gastos(models.Model):
    fecha = models.DateTimeField(db_default=Now())
    descripcion = models.CharField(max_length=200)
    id_categoria = models.ForeignKey(CategoriasGasto, models.DO_NOTHING, db_column='id_categoria')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    id_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, models.DO_NOTHING, db_column='id_usuario')

    class Meta:
        managed = True
        db_table = 'gastos'

    constraints = [    
        models.CheckConstraint(condition=models.Q(monto__gte=0), name='chk_gasto_monto'),
]

class Lotes(models.Model):
    id_detalle_compra = models.ForeignKey(DetalleCompras, models.DO_NOTHING, db_column='id_detalle_compra')
    cantidad_inicial = models.DecimalField(max_digits=12, decimal_places=3)
    cantidad_actual = models.DecimalField(max_digits=12, decimal_places=3)
    fecha_vencimiento = models.DateField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'lotes'

    constraints = [
        models.CheckConstraint(condition=models.Q(cantidad_inicial__gte=0), name='chk_lote_cantidad_inicial'),
        models.CheckConstraint(condition=models.Q(cantidad_actual__gte=0), name='chk_lote_cantidad_actual'),
]

class MetodosPago(models.Model):
    nombre = models.CharField(unique=True, max_length=30)
    activo = models.BooleanField(default=True,db_default=True)

    class Meta:
        managed = True
        db_table = 'metodos_pago'


class Productos(models.Model):
    nombre = models.CharField(unique=True, max_length=120)
    id_unidad = models.ForeignKey('UnidadesMedida', models.DO_NOTHING, db_column='id_unidad')
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2)
    perecible = models.BooleanField(default=False,db_default=False)
    stock_minimo = models.DecimalField(max_digits=12, decimal_places=3, default=5,db_default=5)
    activo = models.BooleanField(default=True,db_default=True)

    class Meta:
        managed = True
        db_table = 'productos'
    constraints = [
        models.CheckConstraint(condition=models.Q(precio_venta__gte=0), name='chk_producto_precio_venta'),
        models.CheckConstraint(condition=models.Q(stock_minimo__gte=0), name='chk_producto_stock_minimo'),
    ]


class Proveedores(models.Model):
    nombre = models.CharField(unique=True, max_length=150)
    ruc = models.CharField(max_length=11, unique=True, blank=True, null=True)
    contacto = models.CharField(max_length=150, blank=True, default='', db_default='')
    telefono = models.CharField(max_length=30, blank=True, default='', db_default='')
    email = models.EmailField(blank=True, default='', db_default='')
    direccion = models.CharField(max_length=250, blank=True, default='', db_default='')
    logo = models.CharField(max_length=255, blank=True, default='', db_default='')
    activo = models.BooleanField(default=True,db_default=True)

    class Meta:
        managed = True
        db_table = 'proveedores'


class TiposVenta(models.Model):
    nombre = models.CharField(unique=True, max_length=50)
    descuento_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=0,db_default=0)
    activo = models.BooleanField(default=True,db_default=True)

    class Meta:
        managed = True
        db_table = 'tipos_venta'
        constraints = [
            models.CheckConstraint(condition=models.Q(descuento_porcentaje__gte=0) & models.Q(descuento_porcentaje__lte=100), name='chk_tipo_venta_descuento'),
        ]   


class UnidadesMedida(models.Model):
    nombre = models.CharField(unique=True, max_length=30)
    abreviatura = models.CharField(unique=True, max_length=10)

    class Meta:
        managed = True
        db_table = 'unidades_medida'


class Ventas(models.Model):
    fecha = models.DateTimeField()
    id_usuario = models.ForeignKey(settings.AUTH_USER_MODEL, models.DO_NOTHING, db_column='id_usuario')
    id_tipo_venta = models.ForeignKey(TiposVenta, models.DO_NOTHING, db_column='id_tipo_venta')
    id_metodo_pago = models.ForeignKey(MetodosPago, models.DO_NOTHING, db_column='id_metodo_pago')

    class Meta:
        managed = True
        db_table = 'ventas'
