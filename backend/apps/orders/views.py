from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics

from .serializers import CreateOrderSerializer, OrderSerializer
from .services import create_order, OrderValidationError


class CreateOrderView(APIView):
    """
    Step 1 of checkout: create the order in PENDING_PAYMENT.
    No M-Pesa call happens here — that's a separate explicit step
    (see apps.payments.views.InitiateSTKPushView), matching Build Order step 2/3.
    """

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            order = create_order(
                customer_name=data["customer_name"],
                customer_phone=data["customer_phone"],
                delivery_zone=data["delivery_zone"],
                delivery_fee=data["delivery_fee"],
                delivery_address=data.get("delivery_address", ""),
                items=data["items"],
            )
        except OrderValidationError as exc:
            # Customer-facing message stays generic/actionable; the specific
            # reason is still returned here because it IS safe/useful for
            # stock/quantity issues (not an internal error).
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    """Used by the frontend to poll order status after STK Push is triggered."""
    queryset = None
    serializer_class = OrderSerializer

    def get_queryset(self):
        from .models import Order
        return Order.objects.all()
