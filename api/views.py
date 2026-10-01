from secrets import compare_digest

from django.contrib.auth.hashers import check_password, make_password
from django.db import connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.status import HTTP_401_UNAUTHORIZED
from rest_framework.views import APIView
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from .authentication import lookup_database_user


# ===== LOGIN API: INICIO =====
# Actualiza a hash Django una contrasena legacy en texto plano tras validarla.
def update_user_password(username, encoded_password):
	with connection.cursor() as cursor:
		cursor.execute(
			"UPDATE usuarios SET password_hash = %s WHERE username = %s",
			[encoded_password, username],
		)


class LoginView(APIView):
	"""Autentica contra api.usuarios y emite tokens JWT para la cuenta."""
	authentication_classes = []
	permission_classes = [AllowAny]

	def post(self, request):
		username = request.data.get("username")
		password = request.data.get("password")

		if not isinstance(username, str) or not isinstance(password, str):
			return Response(
				{"detail": "Usuario o contraseña incorrectos."},
				status=HTTP_401_UNAUTHORIZED,
			)

		user_row = lookup_database_user(username)
		if user_row is None or not user_row[3]:
			return Response(
				{"detail": "Usuario o contraseña incorrectos."},
				status=HTTP_401_UNAUTHORIZED,
			)

		stored_password = user_row[2]
		if not check_password(password, stored_password):
			if not isinstance(stored_password, str) or not compare_digest(
				password, stored_password
			):
				return Response(
					{"detail": "Usuario o contraseña incorrectos."},
					status=HTTP_401_UNAUTHORIZED,
				)

			update_user_password(username, make_password(password))

		refresh = RefreshToken()
		refresh[api_settings.USER_ID_CLAIM] = username
		refresh["username"] = username

		return Response(
			{"refresh": str(refresh), "access": str(refresh.access_token)}
		)


# ===== LOGIN API: FIN =====
