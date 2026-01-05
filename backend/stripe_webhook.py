import os
import stripe
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import User

router = APIRouter(prefix="")

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

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
    except Exception as e:
        print("❌ Stripe webhook signature failed:", e)
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        user_id = session["metadata"].get("user_id")
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")

        if not user_id:
            print("❌ Missing user_id in metadata")
            return {"status": "ignored"}

        user = db.query(User).filter(User.id == int(user_id)).first()
        if user:
            user.is_pro = True
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = subscription_id
            db.commit()
            print(f"✅ User {user.id} upgraded to PRO")

    if event["type"] == "customer.subscription.deleted":
        sub = event["data"]["object"]

        user = db.query(User).filter(
            User.stripe_subscription_id == sub["id"]
        ).first()

        if user:
            user.is_pro = False
            db.commit()
            print(f"⚠️ User {user.id} downgraded from PRO")

    return {"status": "ok"}