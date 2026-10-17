from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .modulos.autenticacion.vistas import LoginView, LogoutView
from .modulos.compras.vistas import PurchaseActionView, PurchasesView
from .modulos.gastos.vistas import ExpensesView
from .modulos.inventario.vistas import ProductDetailView, ProductListView
from .modulos.referencias.vistas import ProvidersView, ReferenceDataView
from .modulos.resumen.vistas import DashboardView
from .modulos.ventas.vistas import SalesView

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('references/', ReferenceDataView.as_view(), name='references'),
    path('providers/', ProvidersView.as_view(), name='providers'),
    path('products/', ProductListView.as_view(), name='products'),
    path('products/<int:product_id>/', ProductDetailView.as_view(), name='product_detail'),
    path('sales/', SalesView.as_view(), name='sales'),
    path('purchases/', PurchasesView.as_view(), name='purchases'),
    path('purchases/<int:purchase_id>/<str:action>/', PurchaseActionView.as_view(), name='purchase_action'),
    path('expenses/', ExpensesView.as_view(), name='expenses'),
]
