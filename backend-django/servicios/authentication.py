"""JWT authentication backed by Django's configured user model."""
from rest_framework_simplejwt.authentication import JWTAuthentication


class RapidMarketJWTAuthentication(JWTAuthentication):
    """Resolve active Django accounts on every authenticated request."""
