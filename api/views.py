from decimal import Decimal, InvalidOperation

from django.db import connection, transaction
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.status import (
	HTTP_201_CREATED,
	HTTP_400_BAD_REQUEST,
	HTTP_404_NOT_FOUND,
	HTTP_409_CONFLICT,
)
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView


# ===== LOGIN API: INICIO =====
class LoginView(TokenObtainPairView):
	"""Autentica usuarios de Django Auth y emite tokens JWT."""

	authentication_classes = []
	permission_classes = [AllowAny]


# ===== LOGIN API: FIN =====


# ===== DASHBOARD API: INICIO =====
# Calcula el resumen del inventario y movimientos para la pantalla principal.
class DashboardSummaryView(APIView):
	"""Devuelve indicadores actuales del inventario y movimientos registrados."""

	required_permissions = {"GET": "view_dashboard"}

	def get(self, request):
		with connection.cursor() as cursor:
			cursor.execute("SELECT COUNT(*) FROM productos")
			total_productos = cursor.fetchone()[0]

			cursor.execute(
				"""
				SELECT p.id, p.nombre, COALESCE(SUM(l.cantidad_actual), 0)
				FROM productos p
				LEFT JOIN detalle_compras dc ON dc.id_producto = p.id
				LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
				GROUP BY p.id, p.nombre, p.stock_minimo
				HAVING COALESCE(SUM(l.cantidad_actual), 0) <= p.stock_minimo
				ORDER BY p.nombre
				"""
			)
			productos_stock_bajo = [
				{"id": row[0], "nombre": row[1], "cantidad": float(row[2])}
				for row in cursor.fetchall()
			]

			cursor.execute(
				"""
				SELECT
					COALESCE((
						SELECT SUM(dv.cantidad * dv.precio_unitario)
						FROM detalle_ventas dv
				), 0),
					COALESCE((
						SELECT SUM(dc.cantidad * dc.precio_unitario)
						FROM compras c
						JOIN estados_compra ec ON ec.id = c.id_estado
						JOIN detalle_compras dc ON dc.id_compra = c.id
						WHERE ec.nombre = %s
				), 0),
					COALESCE((SELECT SUM(g.monto) FROM gastos g), 0)
				""",
				["Entregado"],
			)
			ventas, compras, gastos = cursor.fetchone()

			cursor.execute(
				"""
				SELECT DATE(v.fecha), SUM(dv.cantidad * dv.precio_unitario)
				FROM ventas v
				JOIN detalle_ventas dv ON dv.id_venta = v.id
				GROUP BY DATE(v.fecha)
				ORDER BY DATE(v.fecha) DESC
				LIMIT 4
				"""
			)
			ventas_por_fecha = [
				{"fecha": row[0].isoformat(), "total": float(row[1])}
				for row in cursor.fetchall()
			]

			cursor.execute(
				"""
				SELECT v.id, v.fecha,
					SUM(dv.cantidad),
					SUM(dv.cantidad * dv.precio_unitario)
				FROM ventas v
				JOIN detalle_ventas dv ON dv.id_venta = v.id
				GROUP BY v.id, v.fecha
				ORDER BY v.fecha DESC, v.id DESC
				LIMIT 4
				"""
			)
			ventas_recientes = [
				{
					"id": row[0],
					"fecha": row[1].isoformat(),
					"cantidad_productos": float(row[2]),
					"total": float(row[3]),
				}
				for row in cursor.fetchall()
			]

		ganancia_estimada = ventas - compras - gastos
		return Response(
			{
				"total_productos": total_productos,
				"productos_stock_bajo": productos_stock_bajo,
				"ventas_acumuladas": float(ventas),
				"ganancia_estimada": float(ganancia_estimada),
				"ventas_por_fecha": ventas_por_fecha,
				"ventas_recientes": ventas_recientes,
			}
		)


# ===== DASHBOARD API: FIN =====


# ===== INVENTORY API: INICIO =====
# GET consulta el inventario, POST crea productos y PATCH edita sus datos básicos.
class InventorySummaryView(APIView):
	"""Devuelve productos, existencias y lotes para la pantalla de inventario."""

	required_permissions = {
		"GET": "view_inventory",
		"POST": "add_product",
		"PATCH": "change_product",
	}

	def post(self, request):
		name = request.data.get("nombre")
		unit_abbreviation = request.data.get("unidad")
		perishable = request.data.get("perecible")
		try:
			price = Decimal(str(request.data.get("precio")))
		except (InvalidOperation, TypeError, ValueError):
			return Response(
				{"detail": "El precio debe ser un número válido."},
				status=HTTP_400_BAD_REQUEST,
			)

		if not isinstance(name, str) or not name.strip():
			return Response(
				{"detail": "El nombre del producto es obligatorio."},
				status=HTTP_400_BAD_REQUEST,
			)
		if not isinstance(unit_abbreviation, str) or not unit_abbreviation:
			return Response(
				{"detail": "Selecciona una unidad válida."},
				status=HTTP_400_BAD_REQUEST,
			)
		if not price.is_finite() or price <= 0:
			return Response(
				{"detail": "El precio debe ser mayor que cero."},
				status=HTTP_400_BAD_REQUEST,
			)
		if not isinstance(perishable, bool):
			return Response(
				{"detail": "Indica si el producto es perecible."},
				status=HTTP_400_BAD_REQUEST,
			)

		name = name.strip()
		with transaction.atomic():
			with connection.cursor() as cursor:
				cursor.execute(
					"SELECT id, nombre, abreviatura FROM unidades_medida WHERE abreviatura = %s",
					[unit_abbreviation],
				)
				unit = cursor.fetchone()
				if unit is None:
					return Response(
						{"detail": "La unidad seleccionada no existe."},
						status=HTTP_400_BAD_REQUEST,
					)

				cursor.execute(
					"SELECT id FROM productos WHERE lower(nombre) = lower(%s)",
					[name],
				)
				if cursor.fetchone() is not None:
					return Response(
						{"detail": "Ya existe un producto con ese nombre."},
						status=HTTP_409_CONFLICT,
					)

				cursor.execute(
					"""
					INSERT INTO productos
						(nombre, id_unidad, precio_venta, perecible, stock_minimo, activo)
					VALUES (%s, %s, %s, %s, 5, TRUE)
					RETURNING id
					""",
					[name, unit[0], price, perishable],
				)
				product_id = cursor.fetchone()[0]

		return Response(
			{
				"id": product_id,
				"nombre": name,
				"precio": float(price),
				"unidad_nombre": unit[1],
				"unidad": unit_abbreviation,
				"cantidad_lotes": 0,
				"cantidad": 0,
				"stock_minimo": 5,
				"perecible": perishable,
				"estado": "sin_stock",
				"lotes": [],
			},
			status=HTTP_201_CREATED,
		)

	def patch(self, request, product_id):
		name = request.data.get("nombre")
		unit_abbreviation = request.data.get("unidad")
		try:
			price = Decimal(str(request.data.get("precio")))
		except (InvalidOperation, TypeError, ValueError):
			return Response(
				{"detail": "El precio debe ser un número válido."},
				status=HTTP_400_BAD_REQUEST,
			)

		if not isinstance(name, str) or not name.strip():
			return Response(
				{"detail": "El nombre del producto es obligatorio."},
				status=HTTP_400_BAD_REQUEST,
			)
		if not isinstance(unit_abbreviation, str) or not unit_abbreviation:
			return Response(
				{"detail": "Selecciona una unidad válida."},
				status=HTTP_400_BAD_REQUEST,
			)
		if not price.is_finite() or price <= 0:
			return Response(
				{"detail": "El precio debe ser mayor que cero."},
				status=HTTP_400_BAD_REQUEST,
			)

		name = name.strip()
		with transaction.atomic():
			with connection.cursor() as cursor:
				cursor.execute(
					"SELECT perecible FROM productos WHERE id = %s",
					[product_id],
				)
				product = cursor.fetchone()
				if product is None:
					return Response(
						{"detail": "No se encontró el producto."},
						status=HTTP_404_NOT_FOUND,
					)

				cursor.execute(
					"SELECT id, nombre, abreviatura FROM unidades_medida WHERE abreviatura = %s",
					[unit_abbreviation],
				)
				unit = cursor.fetchone()
				if unit is None:
					return Response(
						{"detail": "La unidad seleccionada no existe."},
						status=HTTP_400_BAD_REQUEST,
					)

				cursor.execute(
					"SELECT id FROM productos WHERE lower(nombre) = lower(%s) AND id <> %s",
					[name, product_id],
				)
				if cursor.fetchone() is not None:
					return Response(
						{"detail": "Ya existe otro producto con ese nombre."},
						status=HTTP_409_CONFLICT,
					)

				cursor.execute(
					"UPDATE productos SET nombre = %s, id_unidad = %s, precio_venta = %s WHERE id = %s",
					[name, unit[0], price, product_id],
				)

		return Response(
			{
				"id": product_id,
				"nombre": name,
				"precio": float(price),
				"unidad_nombre": unit[1],
				"unidad": unit[2],
				"perecible": product[0],
			}
		)

	def get(self, request):
		with connection.cursor() as cursor:
			cursor.execute(
				"""
				SELECT p.id, p.nombre, p.precio_venta, u.nombre, u.abreviatura,
					COUNT(DISTINCT l.id),
					COALESCE(SUM(l.cantidad_actual), 0),
					p.stock_minimo, p.perecible
				FROM productos p
				JOIN unidades_medida u ON u.id = p.id_unidad
				LEFT JOIN detalle_compras dc ON dc.id_producto = p.id
				LEFT JOIN lotes l ON l.id_detalle_compra = dc.id
				GROUP BY p.id, p.nombre, p.precio_venta, u.nombre, u.abreviatura,
					p.stock_minimo, p.perecible
				ORDER BY p.nombre
				"""
			)
			product_rows = cursor.fetchall()

			products_by_id = {}
			products = []
			for row in product_rows:
				quantity = row[6]
				minimum_stock = row[7]
				if quantity <= 0:
					status = "sin_stock"
				elif quantity <= minimum_stock:
					status = "stock_bajo"
				else:
					status = "disponible"

				product = {
					"id": row[0],
					"nombre": row[1],
					"precio": float(row[2]),
					"unidad_nombre": row[3],
					"unidad": row[4],
					"cantidad_lotes": row[5],
					"cantidad": float(quantity),
					"stock_minimo": float(minimum_stock),
					"perecible": row[8],
					"estado": status,
					"lotes": [],
				}
				products.append(product)
				products_by_id[product["id"]] = product

			cursor.execute(
				"""
				SELECT dc.id_producto, l.id, c.id, c.fecha, p.nombre,
					l.cantidad_inicial, l.cantidad_actual, l.fecha_vencimiento
				FROM lotes l
				JOIN detalle_compras dc ON dc.id = l.id_detalle_compra
				JOIN compras c ON c.id = dc.id_compra
				JOIN productos p ON p.id = dc.id_producto
				ORDER BY c.fecha, l.id
				"""
			)
			for row in cursor.fetchall():
				product = products_by_id.get(row[0])
				if product is None:
					continue
				product["lotes"].append(
					{
						"idLote": row[1],
						"ordenCompra": f"CPA-{row[2]}",
						"fecha": row[3].strftime("%d/%m/%Y"),
						"producto": row[4],
						"cantidadInicial": float(row[5]),
						"cantidadActual": float(row[6]),
						"fechaVencimiento": (
							row[7].strftime("%d/%m/%Y") if row[7] else ""
						),
					}
				)

		low_stock_count = sum(
			product["estado"] in {"stock_bajo", "sin_stock"}
			for product in products
		)
		return Response(
			{
				"total_productos": len(products),
				"stock_bajo": low_stock_count,
				"productos": products,
			}
		)


# ===== INVENTORY API: FIN =====
