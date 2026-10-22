from rest_framework import status
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
