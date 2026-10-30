from django.core.management.base import BaseCommand
from django.db import connection
from django.contrib.auth.models import Group


class Command(BaseCommand):
    help = "Crea catálogos iniciales requeridos por Rapid Market (seguro para ejecutar varias veces)."

    def handle(self, *args, **options):
        for name in ("Administrador", "Vendedor"):
            Group.objects.get_or_create(name=name)
        seed = {
            "unidades_medida": [("Unidad", "unidad"), ("Kilogramo", "kg"), ("Caja", "caja"), ("Paquete", "paquete"), ("Litro", "L")],
            "estados_compra": [("Pendiente de entrega",), ("Entregado",), ("Cancelado",)],
            "metodos_pago": [("Efectivo",), ("Yape",), ("Plin",), ("Tarjeta",)],
            "tipos_venta": [("Minorista", 0), ("Mayorista", 5)],
            "categorias_gasto": [("Operativo",), ("Servicios",), ("Transporte",), ("Personal",), ("Otros",)],
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
                    }[table]
                    cursor.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", record)
        self.stdout.write(self.style.SUCCESS("Catálogos listos: unidades, estados, pagos, tipos de venta, gastos, y grupos de Django."))
