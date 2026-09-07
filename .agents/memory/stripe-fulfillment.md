---
name: Stripe fulfillment
description: Durable constraints for reliable GoldRush Arena purchase fulfillment.
---

Treat a Stripe Checkout session with `payment_status=paid` as the authority for generating a reward code. Fulfillment must be idempotent and available from both webhook handling and the post-checkout status path.

**Why:** The connected Stripe account may not have a webhook endpoint yet, and stripe-replit-sync 1.0.0 can report a successful migration while still failing because its runtime expects a missing `stripe.accounts` relation. Webhook-only fulfillment can therefore strand legitimate buyers.

**How to apply:** Keep one deterministic code per Checkout session, claim codes atomically, never select a generic recent code for a buyer, and preserve success-page polling as a recovery path even if managed webhooks are added later.