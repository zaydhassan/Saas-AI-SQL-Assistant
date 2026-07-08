"""Stripe webhook receiver (Phase 2 hardened).

- Signature verification (HMAC) — unchanged.
- **Event dedupe**: a ``StripeEvent`` row is written per event id; a replayed
  event (Stripe retry or manual redelivery) is skipped so a subscription isn't
  flipped twice. Race-safe via the unique constraint on event_id.
- **All event types logged** as audit events (not just the two handled ones),
  so the audit trail reflects everything Stripe tells us.
- Replaced the ``print()`` calls with structured logging.
"""
from __future__ import annotations

import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from config import settings
from db import get_db
from models import User, StripeEvent
from services.auth_service import record_audit

logger = logging.getLogger("stripe_webhook")

router = APIRouter(prefix="")

stripe.api_key = settings.STRIPE_SECRET_KEY
endpoint_secret = settings.STRIPE_WEBHOOK_SECRET


def _mark_seen(db: Session, event_id: str, event_type: str | None) -> bool:
    """Insert a StripeEvent row. Returns True if this event is NEW (should be
    processed), False if it was already seen (a replay). Race-safe: the unique
    constraint on event_id makes the second insert fail → treated as seen."""
    try:
        db.add(StripeEvent(event_id=event_id, event_type=event_type, processed=True))
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        return False


@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, endpoint_secret
        )
    except Exception as exc:
        logger.warning("stripe webhook signature failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event.get("id")
    event_type = event.get("type")
    if not event_id:
        # Without an event id we cannot dedupe; log and accept.
        logger.warning("stripe webhook event missing id (type=%s)", event_type)
        return {"status": "ignored"}

    # Dedupe: skip already-processed events.
    if not _mark_seen(db, event_id, event_type):
        logger.info("stripe webhook duplicate event skipped: %s (%s)", event_id, event_type)
        return {"status": "duplicate"}

    # Log every event type to the audit trail (not just the handled ones).
    record_audit(db, None, f"stripe.event.{event_type}", entity="stripe_event", entity_id=event_id)

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if not user_id:
            logger.warning("stripe checkout: missing user_id in metadata (event=%s)", event_id)
            return {"status": "ignored"}

        user = db.query(User).filter(User.id == int(user_id)).first()
        if user:
            user.is_pro = True
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = subscription_id
            db.commit()
            record_audit(db, user.id, "stripe.subscription.upgraded", entity="user", entity_id=user.id)
            logger.info("user %s upgraded to PRO (event=%s)", user.id, event_id)

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        user = db.query(User).filter(User.stripe_subscription_id == sub["id"]).first()
        if user:
            user.is_pro = False
            db.commit()
            record_audit(db, user.id, "stripe.subscription.cancelled", entity="user", entity_id=user.id)
            logger.info("user %s downgraded from PRO (event=%s)", user.id, event_id)

    return {"status": "ok"}