from django.urls import path
from .views import CreateOrderView, OrderDetailView

urlpatterns = [
    path("", CreateOrderView.as_view(), name="order-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
]
