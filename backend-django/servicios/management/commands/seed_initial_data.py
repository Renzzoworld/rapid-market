from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.auth.models import Group
from servicios.models import ConfiguracionTributaria, EmpresaCompradora


class Command(BaseCommand):
    help = "Crea catálogos iniciales requeridos por Rapid Market (seguro para ejecutar varias veces)."

    def handle(self, *args, **options):
        for name in ("Administrador", "Vendedor"):
            Group.objects.get_or_create(name=name)
        empresa, _ = EmpresaCompradora.objects.get_or_create(pk=1, defaults={
            "razon_social": "Rapid Market E.I.R.L",
            "nombre_comercial": "Rapid Market",
            "ruc": "20601234568",
            "domicilio_fiscal": "Av. Iquitos N° 450, Int. 220",
            "telefono": "977654321",
            "correo_electronico": "ventas@rapidmarket.com",
        })
        ConfiguracionTributaria.objects.get_or_create(
            empresa=empresa,
            codigo="IGV",
            vigente_desde=date(2026, 1, 1),
            defaults={
                "nombre": "Impuesto General a las Ventas",
                "porcentaje": Decimal("18.00"),
                "activo": True,
            },
        )
        seed = {
            "unidades_medida": [("Unidad", "unidad"), ("Kilogramo", "kg"), ("Caja", "caja"), ("Paquete", "paquete"), ("Litro", "L")],
            "estados_compra": [("Pendiente",), ("Parcialmente entregado",), ("Recibido",), ("Rechazado",)],
            "metodos_pago": [("Efectivo",), ("Yape",), ("Plin",), ("Tarjeta",)],
            "tipos_venta": [("Minorista", 0), ("Mayorista", 5)],
            "categorias_gasto": [("Operativo",), ("Servicios",), ("Transporte",), ("Personal",), ("Otros",)],
            "categorias_productos": [("Abarrotes",), ("Lácteos y refrigerados",), ("Higiene y cuidado personal",), ("Bebidas y licores",), ("Snack y golosinas",), ("Limpieza y cuidado del hogar",), ("Otros",)],
            "cargos_proveedor": [("Gerente comercial",), ("Ejecutivo de ventas",), ("Asesor comercial",), ("Representante de ventas",), ("Ejecutivo de cuenta",), ("Atención al cliente",), ("Coordinador de pedidos",), ("Jefe de ventas",), ("Propietario",), ("Otros",)],
            "departamentos_proveedor": [("Ventas",), ("Pedidos",), ("Atención al cliente",), ("Administración",), ("Facturación",), ("Logística y despacho",), ("Créditos y cobranzas",), ("Soporte técnico",), ("Otros",)],
            "redes_sociales": [("LinkedIn",), ("Instagram",), ("Facebook",), ("Twitter/X",), ("Otros",)],
        }
        with connection.cursor() as cursor:
            for table, rows in seed.items():
                for record in rows:
                    placeholders = ",".join(["%s"] * len(record))
                    columns = {
                        "unidades_medida": "nombre,abreviatura",
                        "estados_compra": "nombre",
                        "metodos_pago": "nombre",
                        "tipos_venta": "nombre,descuento_porcentaje",
                        "categorias_gasto": "nombre",
                        "categorias_productos": "nombre",
                        "cargos_proveedor": "nombre",
                        "departamentos_proveedor": "nombre",
                        "redes_sociales": "nombre",
                    }[table]
                    cursor.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", record)
        self.stdout.write(self.style.SUCCESS("Datos iniciales listos: empresa compradora, IGV, catálogos de negocio y grupos de Django."))
