from decimal import Decimal
from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemInputSerializer(serializers.Serializer):
    """Only product_id + quantity ever come from the client — no price."""
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)


class CreateOrderSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=150)
    customer_phone = serializers.RegexField(
        r"^0[17]\d{8}$", max_length=20,
        error_messages={"invalid": "Enter a valid Kenyan phone number, e.g. 07XXXXXXXX"},
    )
    delivery_zone = serializers.CharField(max_length=100)
    delivery_fee = serializers.DecimalField(max_digits=8, decimal_places=2, min_value=Decimal("0"))
    delivery_address = serializers.CharField(allow_blank=True, required=False)
    items = OrderItemInputSerializer(many=True)


class OrderItemOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ["product", "product_name", "unit_price", "quantity"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "customer_name", "customer_phone", "delivery_zone",
            "delivery_fee", "status", "subtotal", "total", "items", "created_at",
        ]
        read_only_fields = fields
