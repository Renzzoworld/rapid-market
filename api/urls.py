from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import DashboardSummaryView, InventorySummaryView, LoginView

urlpatterns = [
    # Rutas de inicio de sesion y renovacion de tokens.
    path('login/', LoginView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # ===== DASHBOARD ROUTE: INICIO =====
    path('dashboard/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    # ===== DASHBOARD ROUTE: FIN =====
    # ===== INVENTORY ROUTE: INICIO =====
    # Colección: GET lista y POST crea. Recurso por ID: PATCH actualiza producto.
    path('inventario/', InventorySummaryView.as_view(), name='inventory_summary'),
    path('inventario/<int:product_id>/', InventorySummaryView.as_view(), name='inventory_product_detail'),
    # ===== INVENTORY ROUTE: FIN =====
]