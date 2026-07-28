from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "product_name", "unit_price", "quantity")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "customer_name", "customer_phone", "status", "total", "created_at")
    list_filter = ("status", "delivery_zone")
    search_fields = ("customer_name", "customer_phone")
    readonly_fields = ("subtotal", "total", "stock_deducted")
    inlines = [OrderItemInline]
