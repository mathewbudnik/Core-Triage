"""Stripe billing integration.

Wraps Stripe Checkout (hosted) for new subscriptions, the Customer Portal for
self-service subscription management, and webhook event handling.

Configuration via env vars:
    STRIPE_SECRET_KEY        e.g. sk_test_...
    STRIPE_WEBHOOK_SECRET    whsec_... (set after creating webhook endpoint in dashboard)
    STRIPE_PRICE_ID_PRO      price_... for $10/mo Pro tier
    STRIPE_PRICE_ID_COACHING price_... for $89/mo Coaching tier

If STRIPE_SECRET_KEY is unset, the module loads but all create-session calls
raise RuntimeError. Useful for local development without Stripe.
"""
from __future__ import annotations

import logging
import os
from typing import Optional, Tuple

import stripe

logger = logging.getLogger(__name__)

# Map our internal product names to env vars holding Stripe price IDs.
# Adding a new tier = add a row here + an env var.
_PRODUCT_PRICE_ENV = {
    "pro":      "STRIPE_PRICE_ID_PRO",
    "coaching": "STRIPE_PRICE_ID_COACHING",
}

# Map a Stripe price ID back to (product_name, tier_to_assign).
# Tier is what we set on the user's record so existing tier-gating code keeps working.
def _price_to_product_tier(price_id: str) -> Tuple[Optional[str], Optional[str]]:
    pro = os.getenv("STRIPE_PRICE_ID_PRO")
    coaching = os.getenv("STRIPE_PRICE_ID_COACHING")
    if pro and price_id == pro:
        return ("pro", "pro")
    if coaching and price_id == coaching:
        return ("coaching", "pro")  # coaching subscribers get full Pro app access too
    return (None, None)


def _configure_stripe() -> None:
    """Set the API key on the global stripe module. Idempotent — safe to call multiple times."""
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        return
    stripe.api_key = key


def is_configured() -> bool:
    return bool(os.getenv("STRIPE_SECRET_KEY"))


def get_or_create_customer(email: str, existing_customer_id: Optional[str] = None) -> str:
    """Return a Stripe customer ID for this email, creating one if needed."""
    _configure_stripe()
    if not is_configured():
        raise RuntimeError("STRIPE_SECRET_KEY is not set")

    if existing_customer_id:
        try:
            customer = stripe.Customer.retrieve(existing_customer_id)
            # Stripe SDK v15+ removed .get() on StripeObject; use getattr instead.
            # Deleted customers have a `deleted` attribute set to True; live
            # customers don't have the attribute at all.
            if not getattr(customer, "deleted", False):
                return existing_customer_id
        except stripe.error.InvalidRequestError:
            # Customer was deleted in Stripe — fall through and create a new one
            pass

    customer = stripe.Customer.create(email=email, metadata={"source": "coretriage"})
    return customer["id"]


def create_checkout_session(
    *,
    customer_id: str,
    product: str,
    success_url: str,
    cancel_url: str,
    user_id: int,
) -> str:
    """Create a Stripe Checkout session and return its URL for the client to redirect to."""
    _configure_stripe()
    if not is_configured():
        raise RuntimeError("STRIPE_SECRET_KEY is not set")

    env_var = _PRODUCT_PRICE_ENV.get(product)
    if not env_var:
        raise ValueError(f"Unknown product: {product!r}")
    price_id = os.getenv(env_var)
    if not price_id:
        raise RuntimeError(f"{env_var} is not set; cannot start checkout for {product}")

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        # Echo back our user_id so the webhook can match incoming events to a user
        # without depending on email lookups.
        metadata={"user_id": str(user_id), "product": product},
        subscription_data={
            "metadata": {"user_id": str(user_id), "product": product},
        },
        allow_promotion_codes=True,
    )
    return session["url"]


def create_portal_session(*, customer_id: str, return_url: str) -> str:
    """Create a Customer Portal session so the user can manage their subscription."""
    _configure_stripe()
    if not is_configured():
        raise RuntimeError("STRIPE_SECRET_KEY is not set")

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return session["url"]


def parse_webhook_event(payload: bytes, signature_header: str) -> Optional[stripe.Event]:
    """Verify the webhook signature and return the parsed Event.

    Returns None and logs if verification fails. Never raises into the caller —
    a tampered or unverifiable webhook should be silently dropped (200 OK still
    returned upstream so Stripe doesn't retry forever, but no DB mutation happens).
    """
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        logger.error("STRIPE_WEBHOOK_SECRET not set; cannot verify webhook")
        return None

    try:
        return stripe.Webhook.construct_event(payload, signature_header, secret)
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        logger.error("Stripe webhook signature verification failed: %s", exc)
        return None


def extract_subscription_state(subscription) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Pull (status, product_name, tier) out of a Stripe Subscription object.

    Accepts either a dict or a Stripe SDK object — normalises internally.
    Returns (None, None, None) if we don't recognize the price ID (subscription
    created outside our flow, e.g. via the Stripe dashboard).
    """
    sub = to_plain_dict(subscription)
    status = sub.get("status")
    items = sub.get("items", {}).get("data", [])
    if not items:
        return (status, None, None)
    price_id = items[0].get("price", {}).get("id")
    product, tier = _price_to_product_tier(price_id) if price_id else (None, None)
    return (status, product, tier)


def is_active_status(status: Optional[str]) -> bool:
    """A subscription that grants paid access. 'past_due' is intentionally OK to
    avoid abruptly cutting off users during a card retry; Stripe sends a separate
    cancellation event when retries are exhausted."""
    return status in {"active", "trialing", "past_due"}


def to_plain_dict(stripe_obj) -> dict:
    """Convert a Stripe SDK object to a plain Python dict.

    Stripe SDK v15+ removed dict-style methods (.get, .items, etc.) from
    StripeObject — calling .get() raises AttributeError. This helper normalises
    Stripe objects into plain dicts so the rest of our code can use .get() safely.
    Pass-through for things that are already dicts."""
    if stripe_obj is None:
        return {}
    if hasattr(stripe_obj, "to_dict_recursive"):
        return stripe_obj.to_dict_recursive()
    if hasattr(stripe_obj, "to_dict"):
        return stripe_obj.to_dict()
    if isinstance(stripe_obj, dict):
        return stripe_obj
    return dict(stripe_obj)


def retrieve_subscription(subscription_id: str) -> dict:
    """Fetch a subscription object from Stripe."""
    _configure_stripe()
    if not is_configured():
        raise RuntimeError("STRIPE_SECRET_KEY is not set")
    return stripe.Subscription.retrieve(subscription_id)
