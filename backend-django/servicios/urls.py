from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import APIIndexView
from .modulos.autenticacion.vistas import LoginView, LogoutView
from .modulos.compras.vistas import PurchaseActionView, PurchasesView
from .modulos.gastos.vistas import ExpensesView
from .modulos.inventario.vistas import ProductDetailView, ProductListView
from .modulos.proveedores.vistas import CanalProveedorDetailView,CanalesProveedorView,ContactoProveedorDetailView,ContactosProveedorView,ProviderDetailView,ProvidersManagementView
from .modulos.referencias.vistas import ReferenceDataView
from .modulos.resumen.vistas import DashboardView
from .modulos.ventas.vistas import SalesView

urlpatterns = [
    path('', APIIndexView.as_view(), name='api_root'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('references/', ReferenceDataView.as_view(), name='references'),
    path('providers/manage/', ProvidersManagementView.as_view(), name='providers_manage'),
    path('providers/manage/<int:provider_id>/',ProviderDetailView.as_view(),name='provider_detail',),
    path('providers/manage/<int:provider_id>/contacts/',ContactosProveedorView.as_view(), name='provider_contacts',),
    path('providers/manage/<int:provider_id>/contacts/<int:contact_id>/',ContactoProveedorDetailView.as_view(),name='provider_contact_detail'),
    path('providers/manage/<int:provider_id>/channels/',CanalesProveedorView.as_view(),name='provider_channels'),
    path('providers/manage/<int:provider_id>/channels/<int:channel_id>/',CanalProveedorDetailView.as_view(),name='provider_channel_detail'),
    path('products/', ProductListView.as_view(), name='products'),
    path('products/<int:product_id>/', ProductDetailView.as_view(), name='product_detail'),
    path('sales/', SalesView.as_view(), name='sales'),
    path('purchases/', PurchasesView.as_view(), name='purchases'),
    path('purchases/<int:purchase_id>/<str:action>/', PurchaseActionView.as_view(), name='purchase_action'),
    path('expenses/', ExpensesView.as_view(), name='expenses'),
]
