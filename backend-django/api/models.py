# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class CategoriasGasto(models.Model):
    nombre = models.CharField(unique=True, max_length=50)

    class Meta:
        managed = False
        db_table = 'categorias_gasto'


class Compras(models.Model):
    fecha = models.DateTimeField()
    id_proveedor = models.ForeignKey('Proveedores', models.DO_NOTHING, db_column='id_proveedor')
    id_estado = models.ForeignKey('EstadosCompra', models.DO_NOTHING, db_column='id_estado')
    id_usuario = models.ForeignKey('Usuarios', models.DO_NOTHING, db_column='id_usuario')

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


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey('Usuarios', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


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
    id_usuario = models.ForeignKey('Usuarios', models.DO_NOTHING, db_column='id_usuario')

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


class Roles(models.Model):
    nombre = models.CharField(unique=True, max_length=50)
    descripcion = models.CharField(max_length=150, blank=True, null=True)
    activo = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'roles'


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


class Usuarios(models.Model):
    username = models.CharField(unique=True, max_length=50)
    password_hash = models.TextField()
    nombre_completo = models.CharField(max_length=150)
    id_rol = models.ForeignKey(Roles, models.DO_NOTHING, db_column='id_rol')
    activo = models.BooleanField()
    created_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'usuarios'


class Ventas(models.Model):
    fecha = models.DateTimeField()
    id_usuario = models.ForeignKey(Usuarios, models.DO_NOTHING, db_column='id_usuario')
    id_tipo_venta = models.ForeignKey(TiposVenta, models.DO_NOTHING, db_column='id_tipo_venta')
    id_metodo_pago = models.ForeignKey(MetodosPago, models.DO_NOTHING, db_column='id_metodo_pago')

    class Meta:
        managed = False
        db_table = 'ventas'
