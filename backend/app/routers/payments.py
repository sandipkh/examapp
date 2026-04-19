import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.database import get_db
from app.models.models import Subscription, User
from app.schemas.schemas import (
    CreateSubscriptionRequest,
    CreateSubscriptionResponse,
    VerifyPaymentRequest,
)

router = APIRouter()


def _get_razorpay_client():
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@router.post("/create-subscription", response_model=CreateSubscriptionResponse)
async def create_subscription(
    body: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    client = _get_razorpay_client()
    rz_sub = client.subscription.create(
        {"plan_id": body.plan_id, "total_count": 12, "customer_notify": 1}
    )

    subscription = Subscription(
        user_id=current_user.id,
        razorpay_subscription_id=rz_sub["id"],
        plan_id=body.plan_id,
        status="created",
    )
    db.add(subscription)

    return CreateSubscriptionResponse(
        subscription_id=rz_sub["id"],
        key_id=settings.RAZORPAY_KEY_ID,
    )


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    expected_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_payment_id}|{body.razorpay_subscription_id}".encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, body.razorpay_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    result = await db.execute(
        select(Subscription).where(
            Subscription.razorpay_subscription_id == body.razorpay_subscription_id
        )
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(status_code=404, detail="Subscription not found")

    sub.status = "active"
    sub.razorpay_payment_id = body.razorpay_payment_id
    sub.started_at = datetime.now(timezone.utc)

    current_user.plan = "pro"
    current_user.plan_expires_at = datetime.now(timezone.utc) + timedelta(days=30)

    return {"status": "success"}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = await request.json()
    event = payload.get("event", "")
    sub_entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
    rz_sub_id = sub_entity.get("id")

    if not rz_sub_id:
        return {"status": "ok"}

    result = await db.execute(
        select(Subscription).where(Subscription.razorpay_subscription_id == rz_sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        return {"status": "ok"}

    user_result = await db.execute(select(User).where(User.id == sub.user_id))
    user = user_result.scalar_one_or_none()

    if event == "subscription.charged":
        sub.status = "active"
        if user:
            user.plan = "pro"
            user.plan_expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    elif event == "subscription.halted":
        sub.status = "halted"
        if user:
            user.plan = "free"
    elif event == "subscription.cancelled":
        sub.status = "cancelled"

    return {"status": "ok"}


@router.get("/status")
async def payment_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == current_user.id)
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        return None

    return {
        "subscription_id": sub.razorpay_subscription_id,
        "plan_id": sub.plan_id,
        "status": sub.status,
        "started_at": sub.started_at.isoformat() if sub.started_at else None,
        "ends_at": sub.ends_at.isoformat() if sub.ends_at else None,
    }
