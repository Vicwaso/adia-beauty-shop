from django.db import models
from apps.orders.models import Order


class Payment(models.Model):
    """
    Deliberately separate from Order.status. 'STK push was sent' is not the
    same fact as 'payment succeeded' (debugging guide §6) — this model tracks
    the payment lifecycle on its own so that distinction can never be
    collapsed by accident.
    """
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    SUCCESSFUL = "SUCCESSFUL"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    MANUALLY_VERIFIED = "MANUALLY_VERIFIED"

    STATUS_CHOICES = [
        (INITIATED, "Initiated"),
        (PENDING, "Pending"),
        (SUCCESSFUL, "Successful"),
        (FAILED, "Failed"),
        (CANCELLED, "Cancelled"),
        (EXPIRED, "Expired"),
        (MANUALLY_VERIFIED, "Manually verified (Paybill/Till fallback)"),
    ]

    order = models.ForeignKey(Order, related_name="payments", on_delete=models.PROTECT)
    method = models.CharField(
        max_length=20,
        choices=[("STK_PUSH", "M-Pesa STK Push"), ("MANUAL", "Manual Paybill/Till")],
        default="STK_PUSH",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=INITIATED)

    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Daraja identifiers — used to match the callback back to this payment
    # and to make callback processing idempotent.
    merchant_request_id = models.CharField(max_length=100, blank=True)
    checkout_request_id = models.CharField(max_length=100, blank=True, db_index=True, unique=False)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)

    # Raw callback payload kept for audit/debugging — never contains secrets,
    # only what Safaricom sends back (receipt, amount, phone, result code).
    raw_callback = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["checkout_request_id"])]

    def __str__(self):
        return f"Payment #{self.pk} for Order #{self.order_id} ({self.status})"
