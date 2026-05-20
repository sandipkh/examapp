---
name: razorpay-integration
description: >
  Build or debug Razorpay payment and subscription flows. Use when working
  on checkout, subscription mandates, webhook handling, or payment UI.
---

Key architecture decisions already made:
- Gateway: Razorpay (not Cashfree, not PhonePe)
- react-native-razorpay is a native module — REQUIRES EAS dev build, NOT Expo Go
- Build command for payment testing: `eas build --profile development`

Two revenue streams:
1. ONE-TIME: Test series packs — Razorpay Orders API
2. SUBSCRIPTION: Premium monthly/annual — Razorpay Subscriptions API

Backend environment variables required:
```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Webhook handler pattern (backend/app/api/webhooks.py):
1. Read raw request body BEFORE parsing JSON
2. Compute HMAC-SHA256: `hmac.new(secret, raw_body, hashlib.sha256).hexdigest()`
3. Compare with `X-Razorpay-Signature` header — reject if mismatch
4. Check idempotency: look up payment_id in DB before processing
5. Handle events: `payment.captured`, `subscription.activated`,
   `subscription.charged`, `subscription.payment_failed`, `subscription.cancelled`

Subscription lifecycle:
- activated → set user.subscription_tier = "premium", expires_at = now + 30 days
- charged → extend expires_at by 30 days
- payment_failed → set grace_period_ends = now + 3 days, send push notification
- cancelled → set tier = "free" when expires_at passes (don't revoke immediately)

Testing webhooks:
- Use Razorpay Dashboard "Test Webhook" button for handler logic
- Use ngrok for full end-to-end flow (note: free ngrok URL changes every restart)
- Use pytest with mock payloads for CI
