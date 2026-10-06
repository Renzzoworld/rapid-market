from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.hashers import make_password
from django.test import SimpleTestCase
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate

from api.authentication import RapidMarketJWTAuthentication
from api.permissions import IsAdministrator
from api.views import DashboardView, LoginView, PurchasesView, ReportsView, SalesView


class LoginViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_login_accepts_hashed_database_password_and_returns_role(self):
        row = (7, "admin", "Administrador", make_password("correct-password"), True, 1, "Administrador")
        with patch("api.views.lookup_database_user", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "correct-password"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["id"], 7)
        self.assertEqual(response.data["user"]["role"], "Administrador")

    def test_login_rejects_wrong_password(self):
        row = (7, "admin", "Administrador", make_password("correct-password"), True, 1, "Administrador")
        with patch("api.views.lookup_database_user", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "wrong"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_legacy_plaintext_password(self):
        row = (7, "admin", "Administrador", "legacy-password", True, 1, "Administrador")
        with patch("api.views.lookup_database_user", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "legacy-password"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 401)

    def test_login_rejects_inactive_user(self):
        row = (7, "admin", "Administrador", make_password("correct-password"), False, 1, "Administrador")
        with patch("api.views.lookup_database_user", return_value=row):
            request = self.factory.post("/api/login/", {"username": "admin", "password": "correct-password"}, format="json")
            response = LoginView.as_view()(request)
        self.assertEqual(response.status_code, 401)

    def test_jwt_resolves_database_user_by_numeric_id(self):
        with patch("api.authentication.lookup_database_user_by_id", return_value=(7, "admin", "Administrador", True, 1, "Administrador")):
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

    def test_vendor_cannot_read_purchases_or_reports(self):
        purchases = PurchasesView.as_view()(self.vendor_request("/api/purchases/"))
        reports = ReportsView.as_view()(self.vendor_request("/api/reports/"))
        self.assertEqual(purchases.status_code, 403)
        self.assertEqual(reports.status_code, 403)

    def test_vendor_dashboard_does_not_include_admin_financial_data(self):
        safe_references = Response({"units": [], "providers": [], "payment_methods": [], "sale_types": [], "expense_categories": []})
        with patch("api.views.list_products", return_value=[]), \
             patch("api.views.list_sales", return_value=[]) as list_sales, \
             patch("api.views.list_purchases") as list_purchases, \
             patch("api.views.self_expenses") as self_expenses, \
             patch("api.views.ReferenceDataView.get", return_value=safe_references):
            response = DashboardView.as_view()(self.vendor_request("/api/dashboard/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["purchases"], [])
        self.assertEqual(response.data["expenses"], [])
        list_sales.assert_called_once_with(19, include_costs=False)
        list_purchases.assert_not_called()
        self_expenses.assert_not_called()

    def test_vendor_sales_history_is_limited_to_own_sales(self):
        with patch("api.views.list_sales", return_value=[]) as list_sales:
            response = SalesView.as_view()(self.vendor_request("/api/sales/"))
        self.assertEqual(response.status_code, 200)
        list_sales.assert_called_once_with(19, include_costs=False)
