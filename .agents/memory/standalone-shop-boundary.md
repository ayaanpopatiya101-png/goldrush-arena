---
name: Standalone shop progress boundary
description: Why the collectible counter is isolated and cannot safely charge or redeem game rewards.
---

The standalone collectible counter uses an isolated browser profile, starting with zero coins. Existing saves may be explicitly copied, but this is not account linking and changes never sync back to native progress.

**Why:** The game has device-local saves, not authenticated cloud players. A local player name or copied JSON cannot safely identify a payment recipient. Existing Stripe reward codes are consumable, so redeeming one into the counter could strand a native player's purchase.

**How to apply:** Keep browser checkout and code redemption unavailable until an authenticated linking and entitlement-delivery design is explicitly approved. Never treat a provider connection alone as sufficient identity, manufacture starting funds, or write counter purchases into native saves.
