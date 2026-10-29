from rest_framework.response import Response
from rest_framework.views import APIView

from .servicios import obtener_referencias


class ReferenceDataView(APIView):
    def get(self, request):
        return Response(obtener_referencias(request.user))


