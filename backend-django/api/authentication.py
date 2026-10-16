from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .modulos.autenticacion.repositorio import usuario_por_id, usuario_por_nombre


def lookup_database_user(username):
    return usuario_por_nombre(username)


def lookup_database_user_by_id(user_id):
    return usuario_por_id(user_id)


class DatabaseUser:
    def __init__(self, user_id, username, full_name, role_id, role_name):
        self.id = user_id
        self.pk = user_id
        self.username = username
        self.full_name = full_name
        self.role_id = role_id
        self.role_name = role_name
        self.is_active = True

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False


class RapidMarketJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get("user_id")
        if not isinstance(user_id, int):
            raise AuthenticationFailed("Token sin usuario válido.", code="user_not_found")
        row = lookup_database_user_by_id(user_id)
        if row is None or not row[3]:
            raise AuthenticationFailed("Usuario no encontrado o inactivo.", code="user_not_found")
        return DatabaseUser(row[0], row[1], row[2], row[4], row[5])
