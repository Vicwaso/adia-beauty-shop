"""
Business logic for orders, kept out of views so it isn't duplicated between
the API and the admin. Two hard rules enforced here:

1. The backend recalculates price/total itself — a client-submitted total
   is never trusted (debugging guide §10).
2. Stock is only deducted once, inside a locked, atomic transaction, at the
   moment payment is confirmed — not at checkout start (see the decision
   record at the bottom of this file, matching the outline's Build Order
   step 3/4).
"""

import logging
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError

from apps.products.models import Product
from .models import Order, OrderItem

logger = logging.getLogger(__name__)


class OrderValidationError(Exception):
    pass


def create_order(*, customer_name, customer_phone, delivery_zone, delivery_fee,
                  delivery_address, items):
    """
    `items` is a list of {"product_id": int, "quantity": int} from the client.
    Price and product identity are always re-derived from the database.
    Stock is NOT deducted here — only validated as currently available.
    """
    if not items:
        raise OrderValidationError("Cannot create an order with no items.")

    with transaction.atomic():
        order = Order.objects.create(
            customer_name=customer_name,
            customer_phone=customer_phone,
            delivery_zone=delivery_zone,
            delivery_fee=delivery_fee,
            delivery_address=delivery_address,
            subtotal=0,
            total=0,
        )

        subtotal = 0
        # Lock the product rows we're about to check, so a concurrent order
        # can't read stale stock numbers while we're validating this order.
        product_ids = [i["product_id"] for i in items]
        products = {
            p.id: p for p in Product.objects.select_for_update().filter(
                id__in=product_ids, is_active=True
            )
        }

        for item in items:
            product = products.get(item["product_id"])
            quantity = int(item["quantity"])

            if product is None:
                raise OrderValidationError(f"Product {item['product_id']} is unavailable.")
            if quantity < 1:
                raise OrderValidationError(f"Invalid quantity for {product.name}.")
            if product.stock_quantity < quantity:
                raise OrderValidationError(
                    f"Only {product.stock_quantity} of {product.name} left in stock."
                )

            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                unit_price=product.price,   # server price, never client price
                quantity=quantity,
            )
            subtotal += product.price * quantity

        order.subtotal = subtotal
        order.total = subtotal + Decimal(str(delivery_fee or 0))
        order.save(update_fields=["subtotal", "total"])

        logger.info("order.created", extra={"order_id": order.id, "total": str(order.total)})
        return order


def deduct_stock_for_paid_order(order: Order):
    """
    Called exactly once, when a payment is confirmed successful. Guarded so
    a duplicate M-Pesa callback or a race between manual admin verification
    and the automatic callback cannot deduct stock twice (debugging guide §8/9).
    """
    with transaction.atomic():
        # Re-fetch and lock the order row itself to serialize concurrent
        # callers (e.g. callback + admin manual-verify hitting at once).
        locked_order = Order.objects.select_for_update().get(pk=order.pk)

        if locked_order.stock_deducted:
            logger.info("order.stock_already_deducted", extra={"order_id": locked_order.id})
            return  # idempotent: already done, nothing to do

        for item in locked_order.items.select_related("product").all():
            product = Product.objects.select_for_update().get(pk=item.product_id)
            if product.stock_quantity < item.quantity:
                # Should be rare (stock validated at order creation) but if it
                # happens we log loudly rather than silently going negative.
                logger.error(
                    "order.stock_insufficient_at_deduction",
                    extra={"order_id": locked_order.id, "product_id": product.id},
                )
                product.stock_quantity = 0
            else:
                product.stock_quantity -= item.quantity
            product.save(update_fields=["stock_quantity"])

        locked_order.stock_deducted = True
        locked_order.save(update_fields=["stock_deducted"])
        logger.info("order.stock_deducted", extra={"order_id": locked_order.id})


# --- Technical decision record -----------------------------------------
# Problem: How should stock be reserved during checkout?
# Options:
#   1. Deduct stock when added to cart
#   2. Deduct stock when checkout starts
#   3. Deduct stock after successful payment confirmation
# Decision: Option 3.
# Reason: Prevents abandoned carts / never-paid STK prompts from permanently
#   reducing inventory.
# Trade-off: Two customers can both attempt to buy the last unit at once —
#   mitigated with select_for_update() locking + a re-check at deduction time.
