from types import SimpleNamespace
from unittest.mock import patch, Mock

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test import SimpleTestCase
from rest_framework.response import Response
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

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
        client.force_authenticate(user=fake_user(1, administrator=True))
        with patch(
            "servicios.modulos.inventario.vistas.listar_productos",
            return_value={"results": [], "count": 0, "page": 1, "page_size": 10},
        ):
            response = client.get("/api/products/", HTTP_ACCEPT="text/html")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("text/html"))
        self.assertContains(response, "<textarea", html=False)


class DjangoAuthenticationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="admin", password="correct-password", first_name="Ana", last_name="Test"
        )
        self.user.groups.add(Group.objects.get_or_create(name="Administrador")[0])

    def login(self, password="correct-password"):
        return self.client.post("/api/login/", {"username": "admin", "password": password}, format="json")

    def test_login_uses_django_password_and_groups(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user"], {"id": self.user.pk, "username": "admin", "name": "Ana Test", "role": "Administrador"})
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + response.data["access"])
        self.assertEqual(self.client.get("/api/purchases/").status_code, 200)

    def test_wrong_password_and_inactive_account_are_rejected(self):
        self.assertEqual(self.login("wrong").status_code, 401)
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.login().status_code, 401)

    def test_plaintext_password_is_rejected(self):
        self.user.password = "correct-password"
        self.user.save()
        self.assertEqual(self.login().status_code, 401)

    def test_existing_access_token_rejects_deactivated_user(self):
        token = self.login().data["access"]
        self.user.is_active = False
        self.user.save()
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + token)
        self.assertEqual(self.client.get("/api/products/").status_code, 401)

    def test_refresh_and_logout_use_django_token_tables(self):
        refresh = self.login().data["refresh"]
        response = self.client.post("/api/login/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(response.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + response.data["access"])
        self.assertEqual(self.client.post("/api/logout/", {"refresh": response.data["refresh"]}, format="json").status_code, 204)
        self.assertEqual(self.client.post("/api/login/refresh/", {"refresh": response.data["refresh"]}, format="json").status_code, 401)

    def test_group_changes_take_effect_with_existing_token(self):
        token = self.login().data["access"]
        self.user.groups.clear()
        self.user.groups.add(Group.objects.get_or_create(name="Vendedor")[0])
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + token)
        self.assertEqual(self.client.get("/api/purchases/").status_code, 403)
        self.assertEqual(self.client.get("/api/expenses/").status_code, 403)
        self.assertEqual(self.client.get("/api/products/").status_code, 200)
        self.assertEqual(self.client.post("/api/products/", {}, format="json").status_code, 403)

    def test_superuser_can_use_application(self):
        self.user.groups.clear()
        self.user.is_superuser = True
        self.user.save()
        self.assertEqual(self.login().data["user"]["role"], "Administrador")


def fake_user(user_id=19, administrator=False):
    groups = Mock()
    groups.filter.return_value.exists.return_value = administrator
    return SimpleNamespace(id=user_id, is_authenticated=True, is_active=True, is_superuser=False, groups=groups)


class RoleAccessTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.vendor = fake_user()

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
        self.user = fake_user()

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


class DjangoBusinessIntegrationTests(TestCase):
    def setUp(self):
        cache.clear()
        call_command("seed_initial_data", verbosity=0)
        self.admin = get_user_model().objects.create_user("integration_admin", password="Integration-pass-458!")
        self.vendor = get_user_model().objects.create_user("integration_vendor", password="Integration-pass-458!")
        self.admin.groups.add(Group.objects.get(name="Administrador"))
        self.vendor.groups.add(Group.objects.get(name="Vendedor"))
        self.client = APIClient()

    def authenticate(self, user):
        self.client.credentials()
        result = self.client.post("/api/login/", {"username": user.username, "password": "Integration-pass-458!"}, format="json")
        self.assertEqual(result.status_code, 200, result.data)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + result.data["access"])

    def post(self, path, payload, status=201):
        response = self.client.post(path, payload, format="json")
        self.assertEqual(response.status_code, status, response.data)
        return response.data

    def test_purchase_delivery_sale_and_expense_reference_django_accounts(self):
        self.authenticate(self.admin)
        refs = self.client.get("/api/references/").data
        product = self.post("/api/products/", {
            "name": "Producto de prueba", "unit_id": refs["units"][0]["id"],
            "price": "10.00", "min_stock": "1", "perishable": False,
        })
        purchase = self.post("/api/purchases/", {
            "provider_id": refs["providers"][0]["id"],
            "items": [{"product_id": product["id"], "quantity": "10", "unit_price": "4.00"}],
        })
        self.post(f"/api/purchases/{purchase['id']}/deliver/", {}, status=200)
        expense = self.post("/api/expenses/", {
            "description": "Transporte de prueba", "category_id": refs["expense_categories"][0]["id"], "amount": "5.00",
        })
        self.authenticate(self.vendor)
        sale = self.post("/api/sales/", {
            "sale_type_id": refs["sale_types"][0]["id"],
            "payment_method_id": refs["payment_methods"][0]["id"],
            "items": [{"product_id": product["id"], "quantity": "2"}],
        })
        other = get_user_model().objects.create_user("other_vendor", password="Integration-pass-458!")
        other.groups.add(Group.objects.get(name="Vendedor"))
        self.authenticate(other)
        self.assertEqual(self.client.get("/api/sales/").data["count"], 0)
        self.authenticate(self.vendor)
        self.assertEqual(self.client.get("/api/sales/").data["count"], 1)
        self.assertNotIn("cost_of_goods_sold", self.client.get("/api/sales/").data["results"][0])
        self.assertEqual(self.client.get(f"/api/products/{product['id']}/").data["stock"], 8)
        with connection.cursor() as cursor:
            for table, record, account in [("compras", purchase, self.admin), ("gastos", expense, self.admin), ("ventas", sale, self.vendor)]:
                cursor.execute(f"SELECT id_usuario FROM {table} WHERE id=%s", [record["id"]])
                self.assertEqual(cursor.fetchone()[0], account.pk)
                constraints = connection.introspection.get_constraints(cursor, table)
                targets = [item["foreign_key"] for item in constraints.values() if item["columns"] == ["id_usuario"]]
                self.assertEqual(targets, [("auth_user", "id")])
        self.authenticate(self.admin)
        self.assertEqual(self.client.get("/api/dashboard/").status_code, 200)
        self.assertEqual(self.client.get("/api/sales/").data["count"], 1)

    def test_schema_contains_only_business_and_django_tables(self):
        expected = {
            "categorias_gasto", "compras", "detalle_compras", "detalle_venta_lotes", "detalle_ventas",
            "estados_compra", "gastos", "lotes", "metodos_pago", "productos", "proveedores",
            "tipos_venta", "unidades_medida", "ventas",
        }
        actual = {table for table in connection.introspection.table_names() if not table.startswith(("auth_", "django_", "token_blacklist_"))}
        self.assertEqual(actual, expected)
        call_command("seed_initial_data", verbosity=0)
        self.assertEqual(Group.objects.filter(name__in=["Administrador", "Vendedor"]).count(), 2)
