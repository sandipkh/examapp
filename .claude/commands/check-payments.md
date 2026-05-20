---
name: check-payments
description: Verify the Razorpay integration is correctly implemented
---

Use the backend-engineer agent and razorpay-integration skill to verify:
1. Read `backend/app/api/webhooks.py` — is signature verification present?
2. Read `backend/app/api/payments.py` — is idempotency implemented?
3. Check all 5 subscription webhook events are handled:
   payment.captured, subscription.activated, subscription.charged,
   subscription.payment_failed, subscription.cancelled
4. Verify `RAZORPAY_KEY_SECRET` is never logged or returned in responses
5. Verify subscription tier and expires_at are updated atomically (in a transaction)
6. Report any gaps found
