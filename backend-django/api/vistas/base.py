import logging
from datetime import date
from decimal import Decimal, InvalidOperation
from collections.abc import Mapping

from django.contrib.auth.hashers import check_password
from django.db import connection, transaction, DatabaseError
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from ..authentication import lookup_database_user
from ..permissions import IsAdministrator, is_administrator

class AdminWriteMixin:
    admin_methods = set()

    def get_permissions(self):
        if self.request.method in self.admin_methods:
            return [IsAuthenticated(), IsAdministrator()]
        return [IsAuthenticated()]
