from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.test import SimpleTestCase
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from servicios.authentication import RapidMarketJWTAuthentication
from servicios.permissions import IsAdministrator
from servicios.modulos.autenticacion.vistas import LoginView
from servicios.modulos.compras.vistas import PurchasesView
from servicios.modulos.inventario.vistas import ProductDetailView, ProductListView
from servicios.modulos.resumen.vistas import DashboardView
from servicios.modulos.ventas.vistas import SalesView
from servicios.modulos.inventario.repositorio import list_product_page


class APIIndexTests(SimpleTestCase):
    def test_api_root_lists_endpoints_and_documents_authorization(self):
        response = APIClient().get("/api/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "API Rapid Market")
        self.assertContains(response, "/api/login/")
        self.assertContains(response, "/api/products/")
        self.assertContains(response, "Authorization: Bearer")

    def test_product_endpoint_renders_browsable_json_form(self):
        client = APIClient()
        client.force_authenticate(user=SimpleNamespace(id=1, is_authenticated=True, role_name="Administrador"))
        with patch(
            "servicios.modulos.inventario.vistas.listar_productos",
            return_value={"results": [], "count": 0, "page": 1, "page_size": 10},
        ):
            response = client.get("/api/products/", HTTP_ACCEPT="text/html")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("text/html"))
        self.assertContains(response, "<textarea", html=False)


class LoginViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_login_accepts_hashed_database_password_and_returns_role(self):
        row = (7, "admin", "Administrador", make_password("correct-password"), True, 1, "Administrador")
        with patch("servicios.modulos.autenticacion.servicios.usuario_por_nombre", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "correct-password"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["id"], 7)
        self.assertEqual(response.data["user"]["role"], "Administrador")

    def test_login_rejects_wrong_password(self):
        row = (7, "admin", "Administrador", make_password("correct-password"), True, 1, "Administrador")
        with patch("servicios.modulos.autenticacion.servicios.usuario_por_nombre", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "wrong"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_legacy_plaintext_password(self):
        row = (7, "admin", "Administrador", "legacy-password", True, 1, "Administrador")
        with patch("servicios.modulos.autenticacion.servicios.usuario_por_nombre", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "legacy-password"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_inactive_user(self):
        row = (7, "admin", "Administrador", make_password("correct-password"), False, 1, "Administrador")
        with patch("servicios.modulos.autenticacion.servicios.usuario_por_nombre", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "correct-password"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 401)

    def test_jwt_resolves_database_user_by_numeric_id(self):
        with patch("servicios.authentication.lookup_database_user_by_id", return_value=(7, "admin", "Administrador", True, 1, "Administrador")):
            user = RapidMarketJWTAuthentication().get_user({"user_id": 7})
        self.assertEqual(user.id, 7)
        self.assertTrue(user.is_authenticated)

    def test_administrator_permission_rejects_sales_role(self):
        request = SimpleNamespace(user=SimpleNamespace(role_name="Vendedor"))
        self.assertFalse(IsAdministrator().has_permission(request, None))


class RoleAccessTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.vendor = SimpleNamespace(id=19, is_authenticated=True, role_name="Vendedor")

    def vendor_request(self, path):
        request = self.factory.get(path)
        force_authenticate(request, user=self.vendor)
        return request

    def test_vendor_cannot_read_purchases(self):
        purchases = PurchasesView.as_view()(self.vendor_request("/api/purchases/"))
        self.assertEqual(purchases.status_code, 403)

    def test_vendor_dashboard_does_not_include_admin_financial_data(self):
        safe_references = Response({"units": [], "providers": [], "payment_methods": [], "sale_types": [], "expense_categories": []})
        dashboard = {
            "summary": {"sales_total": 0},
            "low_stock_products": [],
        }
        with patch("servicios.modulos.resumen.servicios.dashboard_summary", return_value=dashboard) as dashboard_summary, \
             patch("servicios.modulos.resumen.vistas.obtener_referencias", return_value=safe_references.data):
            response = DashboardView.as_view()(self.vendor_request("/api/dashboard/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"], dashboard["summary"])
        self.assertEqual(response.data["low_stock_products"], [])
        dashboard_summary.assert_called_once_with(user_id=19, include_financials=False)

    def test_vendor_sales_history_is_limited_to_own_sales(self):
        paginated_sales = {"results": [], "count": 0, "page": 1, "page_size": 10}
        with patch("servicios.modulos.ventas.servicios.list_sales_page", return_value=paginated_sales) as list_sales_page:
            response = SalesView.as_view()(self.vendor_request("/api/sales/"))
        self.assertEqual(response.status_code, 200)
        list_sales_page.assert_called_once_with(19, False, 1, "")


class ProductPaginationTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = SimpleNamespace(id=19, is_authenticated=True, role_name="Vendedor")

    def test_product_list_returns_requested_page_and_search(self):
        page_data = {"results": [], "count": 23, "page": 2, "page_size": 10}
        request = self.factory.get("/api/products/?page=2&search=arroz")
        force_authenticate(request, user=self.user)
        with patch("servicios.modulos.inventario.servicios.list_product_page", return_value=page_data) as list_page:
            response = ProductListView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, page_data)
        list_page.assert_called_once_with(2, "arroz")

    def test_product_list_rejects_invalid_page(self):
        request = self.factory.get("/api/products/?page=0")
        force_authenticate(request, user=self.user)
        response = ProductListView.as_view()(request)

        self.assertEqual(response.status_code, 400)

    def test_product_page_queries_only_ten_rows(self):
        with patch("servicios.modulos.inventario.repositorio.one", return_value={"total": 25}), \
             patch("servicios.modulos.inventario.repositorio.rows", return_value=[]) as query_rows:
            result = list_product_page(2, "arroz")

        self.assertEqual(result, {"results": [], "count": 25, "page": 2, "page_size": 10})
        self.assertIn("LIMIT %s OFFSET %s", query_rows.call_args.args[0])
        self.assertEqual(query_rows.call_args.args[1], ["%arroz%", 10, 10])

    def test_product_details_load_lots_independently_of_purchase_page(self):
        product = {
            "id": 5,
            "name": "Leche",
            "price": 2,
            "perishable": True,
            "min_stock": 5,
            "active": True,
            "unit_id": 1,
            "unit": "Unidad",
            "unit_abbr": "und",
            "stock": 10,
            "lot_count": 2,
        }
        lots = [{"lot_id": 14}, {"lot_id": 15}]
        request = self.factory.get("/api/products/5/")
        force_authenticate(request, user=self.user)

        with patch("servicios.modulos.inventario.servicios.get_product", return_value=product), \
             patch("servicios.modulos.inventario.servicios.list_product_lots", return_value=lots) as list_lots:
            response = ProductDetailView.as_view()(request, product_id=5)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["lots"], lots)
        list_lots.assert_called_once_with(5)
