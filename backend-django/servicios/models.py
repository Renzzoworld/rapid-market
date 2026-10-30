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
    id_proveedor = models.ForeignKey('Proveedores', models.PROTECT, db_column='id_proveedor')
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
    categoria = models.ForeignKey('CategoriasProductos', models.PROTECT, db_column='id_categoria', related_name='productos')

    class Meta:
        managed = True
        db_table = 'productos'
    constraints = [
        models.CheckConstraint(condition=models.Q(precio_venta__gte=0), name='chk_producto_precio_venta'),
        models.CheckConstraint(condition=models.Q(stock_minimo__gte=0), name='chk_producto_stock_minimo'),
    ]


class Proveedores(models.Model):
    razon_social = models.CharField(max_length=180, default='')
    nombre = models.CharField(unique=True, max_length=150)
    ruc = models.CharField(max_length=11, unique=True)
    direccion = models.CharField(max_length=250, default='')
    logo = models.CharField(max_length=255, blank=True, default='', db_default='')
    activo = models.BooleanField(default=True, db_default=True)
    categorias = models.ManyToManyField('CategoriasProductos', through='ProveedoresCategorias', related_name='proveedores')

    class Meta:
        managed = True
        db_table = 'proveedores'


class ContactosProveedor(models.Model):
    proveedor = models.ForeignKey(
        Proveedores,
        on_delete=models.CASCADE,
        db_column='id_proveedor',
        related_name='contactos',
    )
    nombre = models.CharField(max_length=150)
    cargo = models.ForeignKey('CargosProveedor', models.PROTECT, db_column='id_cargo')
    cargo_otro = models.CharField(max_length=120, blank=True, default='')
    direccion = models.CharField(max_length=250, default='')
    activo = models.BooleanField(default=True, db_default=True)

    class Meta:
        managed = True
        db_table = 'contactos_proveedor'


class CanalesProveedor(models.Model):
    MEDIO_TELEFONO = 'telefono'
    MEDIO_WHATSAPP = 'whatsapp'
    MEDIO_CORREO = 'correo'
    MEDIO_WEB = 'web'
    MEDIO_RED_SOCIAL = 'red_social'

    MEDIOS = [
        (MEDIO_TELEFONO, 'Teléfono'),
        (MEDIO_WHATSAPP, 'WhatsApp'),
        (MEDIO_CORREO, 'Correo'),
        (MEDIO_WEB, 'Sitio web'),
        (MEDIO_RED_SOCIAL, 'Red social'),
    ]

    proveedor = models.ForeignKey(
        Proveedores,
        on_delete=models.CASCADE,
        db_column='id_proveedor',
        related_name='canales',
    )
    departamento = models.ForeignKey('DepartamentosProveedor', models.PROTECT, db_column='id_departamento', blank=True, null=True)
    departamento_otro = models.CharField(max_length=120, blank=True, default='')
    red_social = models.ForeignKey('RedesSociales', models.PROTECT, db_column='id_red_social', blank=True, null=True)
    red_social_otro = models.CharField(max_length=80, blank=True, default='')
    medio = models.CharField(max_length=20, choices=MEDIOS)
    valor = models.CharField(max_length=255)
    activo = models.BooleanField(default=True, db_default=True)

    class Meta:
        managed = True
        db_table = 'canales_proveedor'
        constraints = [
            models.UniqueConstraint(
                fields=['proveedor', 'medio', 'valor'],
                name='uq_canal_medio_valor_proveedor',
            ),
        ]


class CategoriasProductos(models.Model):
    nombre = models.CharField(unique=True, max_length=80)
    class Meta:
        managed = True
        db_table = 'categorias_productos'


class ProveedoresCategorias(models.Model):
    proveedor = models.ForeignKey(Proveedores, on_delete=models.CASCADE, db_column='id_proveedor')
    categoria = models.ForeignKey(CategoriasProductos, on_delete=models.PROTECT, db_column='id_categoria')
    class Meta:
        managed = True
        db_table = 'proveedores_categorias'
        constraints = [models.UniqueConstraint(fields=['proveedor', 'categoria'], name='uq_proveedor_categoria')]


class HorariosProveedor(models.Model):
    DIAS = HorariosDias = [(0, 'Lunes'), (1, 'Martes'), (2, 'Miércoles'), (3, 'Jueves'), (4, 'Viernes'), (5, 'Sábado'), (6, 'Domingo')]
    proveedor = models.ForeignKey(Proveedores, on_delete=models.CASCADE, db_column='id_proveedor', related_name='horarios')
    dia_semana = models.PositiveSmallIntegerField(choices=DIAS)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    class Meta:
        managed = True
        db_table = 'horarios_proveedor'
        constraints = [models.CheckConstraint(condition=models.Q(hora_fin__gt=models.F('hora_inicio')), name='chk_horario_proveedor_intervalo'), models.UniqueConstraint(fields=['proveedor', 'dia_semana', 'hora_inicio'], name='uq_horario_proveedor_inicio')]


class CargosProveedor(models.Model):
    nombre = models.CharField(unique=True, max_length=80)
    class Meta:
        managed = True
        db_table = 'cargos_proveedor'


class DepartamentosProveedor(models.Model):
    nombre = models.CharField(unique=True, max_length=80)
    class Meta:
        managed = True
        db_table = 'departamentos_proveedor'


class RedesSociales(models.Model):
    nombre = models.CharField(unique=True, max_length=40)
    class Meta:
        managed = True
        db_table = 'redes_sociales'


class DatosContactoProveedor(models.Model):
    TIPOS = [('telefono', 'Teléfono'), ('correo', 'Correo')]
    contacto = models.ForeignKey(ContactosProveedor, on_delete=models.CASCADE, db_column='id_contacto', related_name='datos_contacto')
    tipo = models.CharField(max_length=10, choices=TIPOS)
    valor = models.CharField(max_length=254)
    class Meta:
        managed = True
        db_table = 'datos_contacto_proveedor'
        constraints = [models.UniqueConstraint(fields=['contacto', 'tipo', 'valor'], name='uq_dato_contacto_tipo_valor')]


class HorariosContacto(models.Model):
    DIAS = [
        (0, 'Lunes'),
        (1, 'Martes'),
        (2, 'Miércoles'),
        (3, 'Jueves'),
        (4, 'Viernes'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]

    contacto = models.ForeignKey(
        ContactosProveedor,
        on_delete=models.CASCADE,
        db_column='id_contacto',
        related_name='horarios',
    )
    dia_semana = models.PositiveSmallIntegerField(choices=DIAS)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()

    class Meta:
        managed = True
        db_table = 'horarios_contacto'
        constraints = [
            models.CheckConstraint(
                condition=models.Q(hora_fin__gt=models.F('hora_inicio')),
                name='chk_horario_contacto_intervalo',
            ),
            models.UniqueConstraint(
                fields=['contacto', 'dia_semana', 'hora_inicio'],
                name='uq_horario_contacto_inicio',
            ),
        ]

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
