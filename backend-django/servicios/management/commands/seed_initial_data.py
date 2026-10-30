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
        self.stdout.write(self.style.SUCCESS("Catálogos listos: unidades, estados, pagos, tipos de venta, categorías de productos y gastos, cargos, departamentos, redes sociales y grupos de Django."))
