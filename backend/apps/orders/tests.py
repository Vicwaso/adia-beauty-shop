from decimal import Decimal
from django.test import TestCase

from apps.products.models import Category, Product
from .models import Order
from .services import create_order, deduct_stock_for_paid_order, OrderValidationError


class OrderCreationTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Skincare")
        self.product = Product.objects.create(
            name="Vitamin C Serum", category=self.category,
            price=Decimal("1200.00"), stock_quantity=3,
        )

    def test_total_is_computed_server_side(self):
        """The client only sends product_id/quantity — price always comes from the DB."""
        order = create_order(
            customer_name="Amina", customer_phone="0712345678",
            delivery_zone="Nairobi CBD", delivery_fee=Decimal("150.00"),
            delivery_address="Test address",
            items=[{"product_id": self.product.id, "quantity": 2}],
        )
        self.assertEqual(order.subtotal, Decimal("2400.00"))
        self.assertEqual(order.total, Decimal("2550.00"))
        self.assertEqual(order.status, Order.PENDING_PAYMENT)

    def test_ordering_more_than_stock_is_rejected(self):
        with self.assertRaises(OrderValidationError):
            create_order(
                customer_name="Beatrice", customer_phone="0798765432",
                delivery_zone="Nairobi CBD", delivery_fee=Decimal("150.00"),
                delivery_address="Test",
                items=[{"product_id": self.product.id, "quantity": 99}],
            )
        # Nothing should have been created or deducted.
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 3)

    def test_stock_deducted_exactly_once_despite_duplicate_call(self):
        """Simulates Safaricom sending the same callback twice."""
        order = create_order(
            customer_name="Amina", customer_phone="0712345678",
            delivery_zone="Nairobi CBD", delivery_fee=Decimal("150.00"),
            delivery_address="Test",
            items=[{"product_id": self.product.id, "quantity": 2}],
        )
        deduct_stock_for_paid_order(order)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 1)

        deduct_stock_for_paid_order(order)  # duplicate callback
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock_quantity, 1)  # unchanged

    def test_invalid_order_status_transition_is_rejected(self):
        order = create_order(
            customer_name="Amina", customer_phone="0712345678",
            delivery_zone="Nairobi CBD", delivery_fee=Decimal("0"),
            delivery_address="Test",
            items=[{"product_id": self.product.id, "quantity": 1}],
        )
        with self.assertRaises(Exception):
            order.transition_to(Order.DELIVERED)  # not a valid jump from PENDING_PAYMENT
