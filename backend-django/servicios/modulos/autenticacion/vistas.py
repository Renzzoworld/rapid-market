from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import cerrar_sesion, iniciar_sesion
from ...compartido.serializers import CierreSesionSerializer, InicioSesionSerializer


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request):
        serializador = InicioSesionSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        result = iniciar_sesion(serializador.validated_data)
        if result is None:
            return Response({"detail": "Usuario o contraseña incorrectos."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(result)


class LogoutView(APIView):
    def post(self, request):
        serializador = CierreSesionSerializer(data=request.data)
        serializador.is_valid(raise_exception=True)
        cerrar_sesion(serializador.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SolicitarRecuperacionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=254)


class ConfirmarRecuperacionSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=128)
    token = serializers.CharField(max_length=256)
    new_password = serializers.CharField(min_length=12, max_length=256, write_only=True)


class PasswordResetRequestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = SolicitarRecuperacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip()
        username = serializer.validated_data["username"].strip()
        User = get_user_model()
        user = User.objects.filter(username__iexact=username, email__iexact=email, is_active=True).first()
        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            query = urlencode({"uid": uid, "token": token})
            reset_url = f"{settings.FRONTEND_URL}/restablecer-contrasena?{query}"
            send_mail(
                "Recupera tu contraseña de Rapid Market",
                f"Hola {user.get_full_name() or user.username},\n\nAbre este enlace para crear una nueva contraseña (válido por tiempo limitado):\n{reset_url}\n\nSi no solicitaste el cambio, ignora este mensaje.",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        return Response({"detail": "Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña."})


class PasswordResetConfirmView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request):
        serializer = ConfirmarRecuperacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        User = get_user_model()
        try:
            user_id = force_str(urlsafe_base64_decode(data["uid"]))
            user = User.objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, UnicodeDecodeError, User.DoesNotExist):
            return Response({"detail": "El enlace venció o no es válido. Solicita uno nuevo."}, status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, data["token"]):
            return Response({"detail": "El enlace venció o no es válido. Solicita uno nuevo."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(data["new_password"], user=user)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"new_password": error.messages})
        user.set_password(data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Contraseña actualizada. Ya puedes iniciar sesión."})
