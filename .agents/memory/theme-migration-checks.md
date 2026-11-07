---
name: Theme migration checks
description: Consumer-level colour verification when switching GoldRush between dark and light surfaces.
---

Audit page-local colours and translucent foregrounds when changing the app theme; passing shared-token contrast tests alone is not sufficient.

**Why:** The stone/navy theme passed semantic contrast checks while several real screens retained pale dark-theme text and green panels through local hex overrides.

**How to apply:** Pair semantic-role tests with one representative signed-in visual pass. Check secondary tabs, reward cards, inactive labels, pressed controls and fixed-navigation scroll clearance. Check inherited and animated opacity when foreground/background pairs are already correct; wait for entry motion to settle before diagnosing static contrast. Preserve stored cosmetic colours as user data, but do not use that exception to retain obsolete UI foregrounds or panel backgrounds.
