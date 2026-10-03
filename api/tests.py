from contextlib import nullcontext
from datetime import date, datetime
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from api.permissions import RapidMarketPermission
from api.views import DashboardSummaryView, InventorySummaryView, LoginView


class LoginViewTests(SimpleTestCase):
	def setUp(self):
		self.factory = APIRequestFactory()

	def test_login_uses_django_auth_and_returns_token_pair(self):
		user = SimpleNamespace(pk=7, id=7, is_active=True)
		with (
			patch(
				"rest_framework_simplejwt.serializers.authenticate",
				return_value=user,
			) as authenticate,
		):
			request = self.factory.post(
				"/api/login/",
				{"username": "admin", "password": "correct"},
				format="json",
			)
			response = LoginView.as_view()(request)

		self.assertEqual(response.status_code, 200)
		self.assertIn("access", response.data)
		self.assertIn("refresh", response.data)
		authenticate.assert_called_once()
		self.assertEqual(authenticate.call_args.kwargs["username"], "admin")
		self.assertEqual(
			RefreshToken(response.data["refresh"])["user_id"],
			"7",
		)

	def test_login_rejects_wrong_password(self):
		with patch(
			"rest_framework_simplejwt.serializers.authenticate",
			return_value=None,
		):
			request = self.factory.post(
				"/api/login/",
				{"username": "admin", "password": "wrong"},
				format="json",
			)
			response = LoginView.as_view()(request)

		self.assertEqual(response.status_code, 401)

	def test_api_permission_uses_django_user_permissions(self):
		user = SimpleNamespace(
			is_authenticated=True,
			is_superuser=False,
			has_perm=lambda permission: permission == "api.view_dashboard",
		)
		request = SimpleNamespace(user=user, method="GET")
		view = SimpleNamespace(required_permissions={"GET": "view_dashboard"})

		self.assertTrue(RapidMarketPermission().has_permission(request, view))

		request.method = "POST"
		self.assertFalse(RapidMarketPermission().has_permission(request, view))


class DashboardSummaryViewTests(SimpleTestCase):
	def setUp(self):
		self.factory = APIRequestFactory()

	def request_dashboard(self, cursor):
		cursor_context = Mock()
		cursor_context.__enter__ = Mock(return_value=cursor)
		cursor_context.__exit__ = Mock(return_value=False)
		mock_connection = Mock(cursor=Mock(return_value=cursor_context))
		with patch("api.views.connection", mock_connection):
			request = self.factory.get("/api/dashboard/")
			force_authenticate(
				request,
				user=SimpleNamespace(
					username="admin", is_authenticated=True, is_superuser=True
				),
			)
			return DashboardSummaryView.as_view()(request)

	def test_returns_inventory_and_financial_summary(self):
		cursor = Mock()
		cursor.fetchone.side_effect = [
			(7,),
			(Decimal("100.25"), Decimal("824.00"), Decimal("10.00")),
		]
		cursor.fetchall.side_effect = [
			[(2, "Azúcar rubia", Decimal("5.000"))],
			[(date(2026, 10, 1), Decimal("100.25"))],
			[(3, datetime(2026, 10, 1, 12, 30), Decimal("4"), Decimal("100.25"))],
		]

		response = self.request_dashboard(cursor)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["total_productos"], 7)
		self.assertEqual(response.data["productos_stock_bajo"][0]["cantidad"], 5)
		self.assertEqual(response.data["ventas_acumuladas"], 100.25)
		self.assertEqual(response.data["ganancia_estimada"], -733.75)
		self.assertEqual(response.data["ventas_por_fecha"][0]["fecha"], "2026-10-01")
		self.assertEqual(response.data["ventas_recientes"][0]["id"], 3)
		self.assertEqual(response.data["ventas_recientes"][0]["cantidad_productos"], 4)
		queries = " ".join(call.args[0] for call in cursor.execute.call_args_list)
		self.assertEqual(queries.count("LIMIT 4"), 2)
		self.assertIn("p.stock_minimo", queries)

	def test_empty_transactions_return_zero_totals(self):
		cursor = Mock()
		cursor.fetchone.side_effect = [(7,), (Decimal("0"), Decimal("0"), Decimal("0"))]
		cursor.fetchall.side_effect = [[], [], []]

		response = self.request_dashboard(cursor)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["ventas_acumuladas"], 0)
		self.assertEqual(response.data["ganancia_estimada"], 0)
		self.assertEqual(response.data["productos_stock_bajo"], [])
		self.assertEqual(response.data["ventas_por_fecha"], [])
		self.assertEqual(response.data["ventas_recientes"], [])

	def test_calculates_profit_with_decimal_precision(self):
		cursor = Mock()
		cursor.fetchone.side_effect = [
			(7,),
			(Decimal("0.30"), Decimal("0.10"), Decimal("0.20")),
		]
		cursor.fetchall.side_effect = [[], [], []]

		response = self.request_dashboard(cursor)

		self.assertEqual(response.data["ganancia_estimada"], 0)


	from contextlib import nullcontext


class InventorySummaryViewTests(SimpleTestCase):
	def test_updates_name_unit_and_price_without_changing_perishable(self):
		cursor = Mock()
		cursor.fetchone.side_effect = [
			(True,),
			(5, "Lata", "lata"),
			None,
		]
		cursor_context = Mock()
		cursor_context.__enter__ = Mock(return_value=cursor)
		cursor_context.__exit__ = Mock(return_value=False)
		mock_connection = Mock(cursor=Mock(return_value=cursor_context))
		with (
			patch("api.views.connection", mock_connection),
			patch("api.views.transaction.atomic", return_value=nullcontext()),
		):
			request = APIRequestFactory().patch(
				"/api/inventario/8/",
				{"nombre": "Leche evaporada", "unidad": "lata", "precio": "6.75"},
				format="json",
			)
			force_authenticate(
				request,
				user=SimpleNamespace(
					username="admin", is_authenticated=True, is_superuser=True
				),
			)
			response = InventorySummaryView.as_view()(request, product_id=8)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data["perecible"])
		self.assertEqual(response.data["unidad_nombre"], "Lata")
		self.assertEqual(
			cursor.execute.call_args_list[-1].args[1],
			["Leche evaporada", 5, Decimal("6.75"), 8],
		)

	def test_update_returns_not_found_for_missing_product(self):
		cursor = Mock()
		cursor.fetchone.return_value = None
		cursor_context = Mock()
		cursor_context.__enter__ = Mock(return_value=cursor)
		cursor_context.__exit__ = Mock(return_value=False)
		mock_connection = Mock(cursor=Mock(return_value=cursor_context))
		with (
			patch("api.views.connection", mock_connection),
			patch("api.views.transaction.atomic", return_value=nullcontext()),
		):
			request = APIRequestFactory().patch(
				"/api/inventario/999/",
				{"nombre": "Faltante", "unidad": "kg", "precio": "1.00"},
				format="json",
			)
			force_authenticate(
				request,
				user=SimpleNamespace(
					username="admin", is_authenticated=True, is_superuser=True
				),
			)
			response = InventorySummaryView.as_view()(request, product_id=999)

		self.assertEqual(response.status_code, 404)

	def test_creates_product_with_perecible_flag(self):
		cursor = Mock()
		cursor.fetchone.side_effect = [(4, "Paquete", "pqte"), None, (21,)]
		cursor_context = Mock()
		cursor_context.__enter__ = Mock(return_value=cursor)
		cursor_context.__exit__ = Mock(return_value=False)
		mock_connection = Mock(cursor=Mock(return_value=cursor_context))
		with (
			patch("api.views.connection", mock_connection),
			patch("api.views.transaction.atomic", return_value=nullcontext()),
		):
			request = APIRequestFactory().post(
				"/api/inventario/",
				{
					"nombre": "Mermelada",
					"unidad": "pqte",
					"precio": "8.50",
					"perecible": True,
				},
				format="json",
			)
			force_authenticate(
				request,
				user=SimpleNamespace(
					username="admin", is_authenticated=True, is_superuser=True
				),
			)
			response = InventorySummaryView.as_view()(request)

		self.assertEqual(response.status_code, 201)
		self.assertTrue(response.data["perecible"])
		self.assertEqual(response.data["unidad"], "pqte")
		self.assertEqual(cursor.execute.call_args_list[-1].args[1], [
			"Mermelada", 4, Decimal("8.50"), True
		])

	def test_requires_perecible_flag_when_creating_product(self):
		request = APIRequestFactory().post(
			"/api/inventario/",
			{"nombre": "Mermelada", "unidad": "lata", "precio": "8.50"},
			format="json",
		)
		force_authenticate(
			request,
			user=SimpleNamespace(
				username="admin", is_authenticated=True, is_superuser=True
			),
		)

		response = InventorySummaryView.as_view()(request)

		self.assertEqual(response.status_code, 400)

	def test_returns_database_inventory_and_lot_details(self):
		factory = APIRequestFactory()
		cursor = Mock()
		cursor.fetchall.side_effect = [
			[
				(1, "Arroz", Decimal("5.50"), "Kilogramo", "kg", 2, Decimal("5"), Decimal("5"), True),
				(2, "Azúcar", Decimal("5.20"), "Kilogramo", "kg", 0, Decimal("0"), Decimal("5"), False),
				(3, "Leche", Decimal("5.00"), "Lata", "lata", 1, Decimal("20"), Decimal("5"), True),
			],
			[
				(1, 11, 4, datetime(2026, 9, 1), "Arroz", Decimal("10"), Decimal("3"), date(2026, 12, 1)),
				(1, 12, 5, datetime(2026, 9, 2), "Arroz", Decimal("2"), Decimal("2"), None),
				(3, 13, 6, datetime(2026, 9, 3), "Leche", Decimal("20"), Decimal("20"), None),
			],
		]
		cursor_context = Mock()
		cursor_context.__enter__ = Mock(return_value=cursor)
		cursor_context.__exit__ = Mock(return_value=False)
		mock_connection = Mock(cursor=Mock(return_value=cursor_context))
		with patch("api.views.connection", mock_connection):
			request = factory.get("/api/inventario/")
			force_authenticate(
				request,
				user=SimpleNamespace(
					username="admin", is_authenticated=True, is_superuser=True
				),
			)
			response = InventorySummaryView.as_view()(request)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data["total_productos"], 3)
		self.assertEqual(response.data["stock_bajo"], 2)
		self.assertEqual(response.data["productos"][0]["estado"], "stock_bajo")
		self.assertEqual(response.data["productos"][0]["cantidad"], 5)
		self.assertEqual(response.data["productos"][0]["cantidad_lotes"], 2)
		self.assertTrue(response.data["productos"][0]["perecible"])
		self.assertEqual(response.data["productos"][0]["lotes"][0]["ordenCompra"], "CPA-4")
		self.assertEqual(response.data["productos"][0]["lotes"][0]["fechaVencimiento"], "01/12/2026")
		self.assertEqual(response.data["productos"][1]["estado"], "sin_stock")
		self.assertEqual(response.data["productos"][2]["estado"], "disponible")
