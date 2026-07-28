from django.contrib import admin
from django.utils.html import format_html

from .models import Category, Product, ProductImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "parent")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name", "category", "price", "stock_display", "is_active", "updated_at",
    )
    list_filter = ("category", "is_active")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [ProductImageInline]

    def stock_display(self, obj):
        if obj.stock_quantity == 0:
            color, label = "#c0392b", "Out of stock"
        elif obj.is_low_stock:
            color, label = "#d68910", f"Low stock ({obj.stock_quantity})"
        else:
            color, label = "#1e8449", str(obj.stock_quantity)
        return format_html(
            '<span style="color:{}; font-weight:600;">{}</span>', color, label
        )
    stock_display.short_description = "Stock"
