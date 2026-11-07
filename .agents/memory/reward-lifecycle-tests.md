---
name: Reward lifecycle verification
description: Verify deduplication together with repeated successful gameplay, not in isolation.
---

Reward deduplication tests must include two genuinely completed games through the actual Play Again transition, as well as retries of each game.

**Why:** Isolated duplicate-callback and reload tests can all pass while a reused gameplay identity causes every rematch to return the previous receipt without awarding. A browser pass that enters, then abandons, a rematch cannot detect that failure.

**How to apply:** Exercise the production transition/award boundary; compare distinct receipt identities, both history entries, cumulative balances and competitive-level continuity. Retries must preserve the original identity while a new gameplay attempt must not.
