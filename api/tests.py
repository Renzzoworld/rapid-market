from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from api.authentication import RapidMarketJWTAuthentication
from api.views import LoginView


class LoginViewTests(SimpleTestCase):
	def setUp(self):
		self.factory = APIRequestFactory()

	def test_login_uses_database_user_and_upgrades_plaintext_password(self):
		with (
			patch(
				"api.views.lookup_database_user",
				return_value=("admin", "Administrador", "123456", True),
			),
			patch("api.views.update_user_password") as update_password,
		):
			request = self.factory.post(
				"/api/login/",
				{"username": "admin", "password": "123456"},
				format="json",
			)
			response = LoginView.as_view()(request)

		self.assertEqual(response.status_code, 200)
		self.assertIn("access", response.data)
		self.assertIn("refresh", response.data)
		update_password.assert_called_once()
		encoded_password = update_password.call_args.args[1]
		self.assertTrue(check_password("123456", encoded_password))

	def test_login_rejects_wrong_password(self):
		with patch(
			"api.views.lookup_database_user",
			return_value=("admin", "Administrador", make_password("correct"), True),
		):
			request = self.factory.post(
				"/api/login/",
				{"username": "admin", "password": "wrong"},
				format="json",
			)
			response = LoginView.as_view()(request)

		self.assertEqual(response.status_code, 401)

	def test_jwt_resolves_user_from_database_table(self):
		with patch(
			"api.authentication.lookup_database_user",
			return_value=("admin", "Administrador", "unused", True),
		):
			user = RapidMarketJWTAuthentication().get_user({"username": "admin"})

		self.assertEqual(user.username, "admin")
		self.assertTrue(user.is_authenticated)
