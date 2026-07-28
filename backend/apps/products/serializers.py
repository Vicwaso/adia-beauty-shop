from rest_framework import serializers
from .models import Category, Product, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "is_primary", "order"]


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for catalog/category listing pages."""
    primary_image = serializers.SerializerMethodField()
    in_stock = serializers.BooleanField(source="is_in_stock", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "price",
            "in_stock", "primary_image",
        ]

    def get_primary_image(self, obj):
        img = next((i for i in obj.images.all() if i.is_primary), None) \
            or (obj.images.all()[0] if obj.images.all() else None)
        return img.image.url if img else None


class ProductDetailSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    in_stock = serializers.BooleanField(source="is_in_stock", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "slug", "category", "description", "price",
            "in_stock", "images",
        ]
