---
name: Expo accessibility across native and web
description: Preserve native accessibility state and verify explicit ARIA state in the browser build.
---

Use native `accessibilityState` together with explicit `aria-checked`, `aria-expanded`, `aria-selected`, `aria-disabled` or `aria-busy` as appropriate for controls shared with the browser preview.

**Why:** The installed React Native Web build did not translate the `accessibilityState` object into DOM state attributes. Radio roles and disclosure labels appeared correctly, but browser inspection found no checked or expanded state. Its DOM adapter does support the explicit ARIA props.

**How to apply:** Check state attributes before and after interaction rather than trusting visual selection or role alone. Radios need checked state, tabs need selected state, and disclosure buttons need expanded state. Keep native state props; browser evidence does not certify VoiceOver or Dynamic Type on an iPhone.
