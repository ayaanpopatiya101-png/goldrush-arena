# GoldRush Arena — App Review Notes (paste into App Store Connect)

These are the notes the Apple reviewer sees. Good notes prevent the most common "we couldn't figure out your app" rejections.

---

## Notes for the Reviewer (paste this)

```
GoldRush Arena is a 100% offline, single-player arcade game (the player competes against 3 AI bots in air-hockey style matches).

KEY FACTS FOR REVIEW:
• No account or login is required. The "username" on first launch is a local-only display name saved on the device — it is not an account and no data leaves the device.
• The app works fully in Airplane Mode.
• There are NO in-app purchases, NO ads, and NO third-party analytics.
• All cosmetics (skins, relics) are earned through gameplay only.
• "Lucky Blocks" are reward boxes earned by playing — they cannot be purchased with real money.
• Photo library / camera permission is OPTIONAL and used only to set a local profile avatar (Profile tab → avatar). The app is fully usable without it.

HOW TO TEST THE CORE LOOP (2 minutes):
1. Launch → enter any username → tap the gold RANKED button.
2. Drag your finger along the bottom wall to move your paddle. Deflect the ball; if it passes you 3 times you're eliminated. Last paddle standing wins.
3. After the match you'll see XP/coin rewards → tap "Trophy Road" tab to see progression.
```

## Demo Account

Not applicable — no login exists. State this explicitly in the "Sign-in required" section by leaving it unchecked.

## Common Rejection Traps & How This App Avoids Them

| Guideline | Risk | Status |
|---|---|---|
| 3.1.1 In-App Purchase | Stripe code exists in the monorepo (server side) | MUST NOT ship in binary; no purchase UI reachable in v1.0 ✅ |
| 5.1.1 Data Collection | Permission strings vs. privacy policy mismatch | Fix legal.tsx §5 before submitting (see 02-privacy-policy.md) ⚠️ |
| 4.2 Minimum Functionality | "Just a web wrapper" rejections | Native Expo app with real gameplay — not applicable ✅ |
| 2.1 App Completeness | Crashes / placeholder content | Run the Phase 5 QA list in 01-launch-checklist.md ⚠️ |
| 2.3.7 Accurate Metadata | Screenshots must show real gameplay | Use actual device captures, not mockups-only ✅ |
| 1.3 Kids Category | Only if you opt INTO the Kids Category | Recommend NOT opting in (keeps flexibility); 4+ rating is fine without it ✅ |

## Version-1 Feature Flags (decide before building)

- **Party / matchmaking (online):** if the Replit-hosted API isn't production-ready with uptime guarantees, hide the Party section for v1.0. A reviewer WILL tap "Create Party" — if it errors, that's a 2.1 rejection.
- **Redeem codes:** make sure at least one valid code exists or the flow fails gracefully with a friendly message.
- **"SEASON 7 ACTIVE" splash badge:** fine, but make sure season content actually exists in-app (2.3.7 accurate metadata).
