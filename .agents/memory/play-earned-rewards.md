---
name: Play-earned reward eligibility
description: Why the games-played Trophy Road lane starts from zero rather than inheriting legacy match totals.
---

The additive games-played reward lane starts at zero for existing profiles. Do not backfill it from lifetime games, XP or truncated history. Existing XP milestones, claim IDs and pass entitlements remain intact.

**Why:** Historical totals cannot prove that all matches met the current completed-match eligibility rules. Reinterpreting them would grant unverifiable rewards or change previously saved progression.

**How to apply:** Advance this lane only in the persisted, deduplicated completed-match award transaction. Share the transaction queue with reward claims. Clearly explain the fresh starting point in the player-facing lane. Local rewards must not be described as authoritative online balances.
