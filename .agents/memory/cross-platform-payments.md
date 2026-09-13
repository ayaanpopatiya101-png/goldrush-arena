---
name: Cross-platform payments
description: Provider boundary for GoldRush Arena real-money purchases.
---

Use Stripe hosted Checkout for the web build and RevenueCat in-app purchases for native iOS and Android builds. Keep the same player-facing catalog and reward outcomes across both providers.

**Why:** Native digital goods must follow Apple and Google in-app billing requirements, while the existing Stripe flow is already the authoritative and verified web fulfillment path.

**How to apply:** Route by platform. Web purchases continue through Stripe and purchase-code redemption; native purchases use RevenueCat offerings, store-provided prices, transaction-based fulfillment, and restoration for durable unlocks.