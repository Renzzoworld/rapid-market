from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Crea catálogos iniciales requeridos por Rapid Market (seguro para ejecutar varias veces)."

    def handle(self, *args, **options):
        seed = {
            "roles": [
                ("Administrador", "Acceso administrativo"),
                ("Vendedor", "Acceso a ventas e inventario"),
            ],
            "unidades_medida": [("Unidad", "unidad"), ("Kilogramo", "kg"), ("Caja", "caja"), ("Paquete", "paquete"), ("Litro", "L")],
            "estados_compra": [("Pendiente de entrega",), ("Entregado",), ("Cancelado",)],
            "metodos_pago": [("Efectivo",), ("Yape",), ("Plin",), ("Tarjeta",)],
            "tipos_venta": [("Minorista", 0), ("Mayorista", 5)],
            "categorias_gasto": [("Operativo",), ("Servicios",), ("Transporte",), ("Personal",), ("Otros",)],
            "proveedores": [("Proveedor general",)],
        }
        with connection.cursor() as cursor:
            for table, rows in seed.items():
                for record in rows:
                    placeholders = ",".join(["%s"] * len(record))
                    columns = {
                        "roles": "nombre,descripcion",
                        "unidades_medida": "nombre,abreviatura",
                        "estados_compra": "nombre",
                        "metodos_pago": "nombre",
                        "tipos_venta": "nombre,descuento_porcentaje",
                        "categorias_gasto": "nombre",
                        "proveedores": "nombre",
                    }[table]
                    cursor.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", record)
        self.stdout.write(self.style.SUCCESS("Catálogos listos: unidades, estados, pagos, tipos de venta, gastos, proveedor y rol."))
