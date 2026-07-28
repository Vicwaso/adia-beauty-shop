import logging

from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.orders.models import Order
from apps.orders.services import deduct_stock_for_paid_order
from .models import Payment
from .mpesa import initiate_stk_push, MpesaError

logger = logging.getLogger(__name__)


class InitiateSTKPushView(APIView):
    """
    Build Order step 3. Triggered from the checkout page once the order
    exists. Creates a Payment record in INITIATED, then PENDING once
    Safaricom accepts the request.
    """

    def post(self, request):
        order_id = request.data.get("order_id")
        phone_number = request.data.get("phone_number")

        order = Order.objects.filter(pk=order_id).first()
        if order is None:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)
        if order.status != Order.PENDING_PAYMENT:
            return Response(
                {"detail": "This order is not awaiting payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = Payment.objects.create(
            order=order, phone_number=phone_number, amount=order.total,
            status=Payment.INITIATED,
        )

        try:
            result = initiate_stk_push(
                phone_number=phone_number,
                amount=order.total,
                account_reference=f"ORDER-{order.id}",
            )
        except MpesaError as exc:
            payment.status = Payment.FAILED
            payment.save(update_fields=["status"])
            # Customer-facing message stays generic; real error only in logs.
            return Response(
                {"detail": "We couldn't start the M-Pesa prompt. Please try again, "
                           "or use Paybill/Till and we'll confirm it manually."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.merchant_request_id = result.get("MerchantRequestID", "")
        payment.checkout_request_id = result.get("CheckoutRequestID", "")
        payment.status = Payment.PENDING
        payment.save(update_fields=["merchant_request_id", "checkout_request_id", "status"])

        order.transition_to(Order.PAYMENT_PROCESSING)

        return Response(
            {"payment_id": payment.id, "checkout_request_id": payment.checkout_request_id,
             "detail": "Check your phone to complete the M-Pesa payment."},
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name="dispatch")
class MpesaCallbackView(APIView):
    """
    Safaricom hits this URL after the customer completes (or cancels/fails)
    the STK Push prompt. Must be idempotent: Safaricom can and does send the
    same callback more than once (debugging guide §6/§11).
    """
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        body = request.data
        stk_callback = (
            body.get("Body", {}).get("stkCallback", {})
        )
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        result_code = stk_callback.get("ResultCode")

        if not checkout_request_id:
            logger.warning("mpesa.callback_missing_checkout_id", extra={"body": body})
            return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

        payment = Payment.objects.filter(checkout_request_id=checkout_request_id).first()
        if payment is None:
            logger.warning(
                "mpesa.callback_unknown_checkout_id",
                extra={"checkout_request_id": checkout_request_id},
            )
            # Still 200 — Safaricom will keep retrying otherwise.
            return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

        with transaction.atomic():
            locked_payment = Payment.objects.select_for_update().get(pk=payment.pk)

            # Idempotency guard: if we've already processed a final state for
            # this payment, do nothing — this is a duplicate callback.
            if locked_payment.status in (Payment.SUCCESSFUL, Payment.FAILED, Payment.CANCELLED):
                logger.info(
                    "mpesa.callback_duplicate_ignored",
                    extra={"payment_id": locked_payment.id, "status": locked_payment.status},
                )
                return Response({"ResultCode": 0, "ResultDesc": "Accepted"})

            locked_payment.raw_callback = body

            if result_code == 0:
                metadata = {
                    item["Name"]: item.get("Value")
                    for item in stk_callback.get("CallbackMetadata", {}).get("Item", [])
                }
                locked_payment.mpesa_receipt_number = metadata.get("MpesaReceiptNumber", "")
                locked_payment.status = Payment.SUCCESSFUL
                locked_payment.save(
                    update_fields=["status", "mpesa_receipt_number", "raw_callback"]
                )

                order = locked_payment.order
                order.transition_to(Order.PAID)
                deduct_stock_for_paid_order(order)
                order.transition_to(Order.PROCESSING)

                logger.info(
                    "mpesa.payment_successful",
                    extra={"payment_id": locked_payment.id, "order_id": order.id},
                )
            else:
                # ResultCode 1032 = cancelled by user; others = failure.
                new_status = Payment.CANCELLED if result_code == 1032 else Payment.FAILED
                locked_payment.status = new_status
                locked_payment.save(update_fields=["status", "raw_callback"])

                order = locked_payment.order
                # Let the customer try again rather than stranding the order.
                order.transition_to(Order.PENDING_PAYMENT)

                logger.info(
                    "mpesa.payment_not_successful",
                    extra={"payment_id": locked_payment.id, "result_code": result_code},
                )

        # Safaricom expects this exact acknowledgement shape regardless of
        # outcome, or it will keep retrying the callback.
        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})
