"""
M-Pesa Daraja STK Push integration.

Rules followed here (per the debugging guide):
- Never assume "request sent" == "payment successful" — this module only
  ever reports whether the STK Push *request* was accepted by Safaricom.
  The actual result comes later via the callback (see views.MpesaCallbackView).
- Never log consumer secret, passkey, or access tokens.
- Every external call is wrapped so a timeout/5xx from Safaricom becomes a
  clean, typed exception instead of an unhandled crash.
"""

import base64
import logging
from datetime import datetime

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SANDBOX_BASE = "https://sandbox.safaricom.co.ke"
PRODUCTION_BASE = "https://api.safaricom.co.ke"


class MpesaError(Exception):
    """Raised for any failure talking to Daraja. Message is safe to log."""


def _base_url():
    return PRODUCTION_BASE if settings.MPESA_ENV == "production" else SANDBOX_BASE


def get_access_token() -> str:
    url = f"{_base_url()}/oauth/v1/generate?grant_type=client_credentials"
    try:
        resp = requests.get(
            url,
            auth=(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
            timeout=10,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.error("mpesa.auth_failed", extra={"error": str(exc)})
        raise MpesaError("Could not authenticate with M-Pesa right now.") from exc

    token = resp.json().get("access_token")
    if not token:
        logger.error("mpesa.auth_no_token")
        raise MpesaError("M-Pesa did not return an access token.")
    return token  # never logged


def _password_and_timestamp():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp  # password never logged


def initiate_stk_push(*, phone_number: str, amount, account_reference: str,
                       transaction_desc: str = "Beauty Shop order"):
    """
    Triggers the STK Push prompt on the customer's phone.
    Returns Safaricom's immediate response (merchant_request_id,
    checkout_request_id, response_code) — this is NOT proof of payment.
    """
    token = get_access_token()
    password, timestamp = _password_and_timestamp()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),  # Daraja requires a whole-number amount
        "PartyA": phone_number,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_number,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": account_reference,
        "TransactionDesc": transaction_desc,
    }

    try:
        resp = requests.post(
            f"{_base_url()}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.error(
            "mpesa.stk_push_failed",
            extra={"account_reference": account_reference, "error": str(exc)},
        )
        raise MpesaError("Could not reach M-Pesa. Please try again.") from exc

    data = resp.json()
    logger.info(
        "mpesa.stk_push_sent",
        extra={
            "account_reference": account_reference,
            "checkout_request_id": data.get("CheckoutRequestID"),
        },
    )
    return data
