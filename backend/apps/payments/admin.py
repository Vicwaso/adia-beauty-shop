from django.contrib import admin
from django.db import transaction
from django.utils import timezone

from apps.orders.models import Order
from apps.orders.services import deduct_stock_for_paid_order
from .models import Payment


@admin.action(description="Mark selected payments as manually verified (Paybill/Till fallback)")
def mark_manually_verified(modeladmin, request, queryset):
    """
    Manual reconciliation path from the plan doc §6: if STK Push fails, staff
    confirm the Paybill/Till payment here. Goes through the same guarded
    deduct_stock_for_paid_order() so it can never double-deduct stock even if
    a delayed automatic callback also lands (debugging guide §8).
    """
    for payment in queryset.select_related("order"):
        if payment.status == Payment.SUCCESSFUL:
            continue  # already confirmed, e.g. by the automatic callback
        with transaction.atomic():
            payment.status = Payment.MANUALLY_VERIFIED
            payment.save(update_fields=["status"])
            order = payment.order
            if order.status == Order.PENDING_PAYMENT:
                order.transition_to(Order.PAYMENT_PROCESSING)
            if order.status == Order.PAYMENT_PROCESSING:
                order.transition_to(Order.PAID)
            deduct_stock_for_paid_order(order)
            if order.status == Order.PAID:
                order.transition_to(Order.PROCESSING)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "method", "status", "amount", "phone_number", "created_at")
    list_filter = ("method", "status")
    search_fields = ("phone_number", "mpesa_receipt_number", "checkout_request_id")
    readonly_fields = (
        "merchant_request_id", "checkout_request_id", "mpesa_receipt_number", "raw_callback",
    )
    actions = [mark_manually_verified]
