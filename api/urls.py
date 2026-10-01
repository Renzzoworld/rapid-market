from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView

urlpatterns = [
    # Rutas de inicio de sesion y renovacion de tokens.
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]