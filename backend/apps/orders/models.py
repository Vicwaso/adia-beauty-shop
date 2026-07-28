from django.db import models
from django.core.exceptions import ValidationError
from apps.products.models import Product


class Order(models.Model):
    """
    Order status is an explicit state machine (see plan doc §9 / debugging
    guide §7). Transitions are validated in `transition_to`, not by letting
    any code assign `.status` directly.
    """
    PENDING_PAYMENT = "PENDING_PAYMENT"
    PAYMENT_PROCESSING = "PAYMENT_PROCESSING"
    PAID = "PAID"
    PROCESSING = "PROCESSING"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"

    STATUS_CHOICES = [
        (PENDING_PAYMENT, "Pending payment"),
        (PAYMENT_PROCESSING, "Payment processing"),
        (PAID, "Paid"),
        (PROCESSING, "Processing"),
        (SHIPPED, "Shipped"),
        (DELIVERED, "Delivered"),
        (CANCELLED, "Cancelled"),
    ]

    # Only these transitions are allowed. Anything not listed is rejected.
    VALID_TRANSITIONS = {
        PENDING_PAYMENT: {PAYMENT_PROCESSING, CANCELLED},
        PAYMENT_PROCESSING: {PAID, PENDING_PAYMENT, CANCELLED},  # back to PENDING on failed/cancelled STK push
        PAID: {PROCESSING, CANCELLED},
        PROCESSING: {SHIPPED, CANCELLED},
        SHIPPED: {DELIVERED},
        DELIVERED: set(),   # terminal — only an explicit admin action outside this method can touch it
        CANCELLED: set(),   # terminal
    }

    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=20)
    delivery_zone = models.CharField(max_length=100)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    delivery_address = models.TextField(blank=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=PENDING_PAYMENT)

    # Always computed server-side from OrderItems at creation time — never
    # accepted as-is from the frontend (see services.create_order).
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    stock_deducted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} ({self.status})"

    def transition_to(self, new_status):
        allowed = self.VALID_TRANSITIONS.get(self.status, set())
        if new_status not in allowed:
            raise ValidationError(
                f"Invalid order transition: {self.status} -> {new_status}"
            )
        self.status = new_status
        self.save(update_fields=["status", "updated_at"])


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)

    # Snapshot the name/price at time of order — product.price can change later
    # and the order record must reflect what the customer actually paid.
    product_name = models.CharField(max_length=200)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    @property
    def line_total(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"
