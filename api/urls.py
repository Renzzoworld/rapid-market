from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    DashboardView, ExpensesView, LoginView, LogoutView, ProductDetailView, ProductListView,
    PurchaseActionView, PurchasesView, ProvidersView, ReferenceDataView, ReportsView, SalesView,
)

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
    path('reports/', ReportsView.as_view(), name='reports'),
]
