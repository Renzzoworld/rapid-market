from django.db import connection
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings


# ===== JWT CON USUARIOS DE RAPID MARKET: INICIO =====
# Busca cuentas en la tabla usuarios existente de la base PostgreSQL.
def lookup_database_user(username):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT username, nombre_completo, password_hash, activo "
            "FROM usuarios WHERE username = %s",
            [username],
        )
        return cursor.fetchone()


class DatabaseUser:
    def __init__(self, username, full_name):
        self.username = username
        self.full_name = full_name
        self.is_active = True

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False


class RapidMarketJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        username = validated_token.get("username") or validated_token.get(
            api_settings.USER_ID_CLAIM
        )
        if not isinstance(username, str) or not username:
            raise AuthenticationFailed(
                "Token sin usuario válido.", code="user_not_found"
            )

        user_row = lookup_database_user(username)
        if user_row is None or not user_row[3]:
            raise AuthenticationFailed(
                "Usuario no encontrado o inactivo.", code="user_not_found"
            )

        return DatabaseUser(user_row[0], user_row[1])


    # ===== JWT CON USUARIOS DE RAPID MARKET: FIN =====