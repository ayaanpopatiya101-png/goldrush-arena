# Release gates: not store ready

## Blocking capabilities and owner details
- Real four-human PvP is NOT implemented. Either build an authenticated authoritative game service in separately approved work or market the current experience truthfully as local bot matches. A party lobby is not proof of PvP.
- Publisher legal identity, verified support/privacy contact, jurisdiction and a public Privacy URL need owner confirmation and legal review. In-app product disclosures are not legal certification.
- Validate production RevenueCat/app-store offerings, receipts, cancellations, entitlements and restores on physical devices. Missing configuration must remain unavailable, not a fake purchase.
- Validate Stripe checkout fulfillment/redeem, cancellation, retry and code reuse without spending live funds during automated checks.
- Local profiles have no general cloud-save recovery. Referral and party identities are not authenticated; service state can reset. Do not expose these as secure account ownership.
- No per-player YouTube upload authorization exists. Never use the publisher's connected channel for player uploads.
- Browser checks do not prove native performance, mute, haptics, capture, permissions, app background/resume or store behavior.

## Candidate-build checklist
1. Run mobile and workspace TypeScript checks; Expo compatibility check and doctor must pass.
2. Read the QA evidence, distinguish new failures from existing limitations, and retest changed blockers.
3. Create a fresh local profile without altering existing profiles; reopen it and verify cosmetics, rewards, settings and saved clips.
4. Verify a single 3/2/1 countdown, no ball physics before start, exactly one result/reward and no transition after leaving during countdown.
5. Verify bank caps and one consumption; demo preview must not consume lives or grant rewards.
6. Inspect phone widths 375/390 and wide web; large text, safe areas, Terms/Privacy/Support and OS reduced motion.
7. Test each real purchasable item, owned/locked/unavailable states, actual localized price and no repeated fulfillment. Restore durable purchases; explain consumable limits.
8. Native capture/share: success, unavailable, cancelled, storage full and encoding failure. Opening a share sheet cannot verify external publication.
9. Confirm bundle IDs unchanged, fonts/licenses included, provider configuration correct and no secrets or generated files tracked.
10. Obtain explicit publication approval outside this task fork. No readiness claim based solely on this document.

## Four-real-device TestFlight protocol
Record build identifier, device/OS, network, local profile names, UTC timestamps and screen recordings for four separate physical iPhones. Use test accounts and sandbox transactions, not live money. Have a coordinator record all four screens side-by-side.

### Current build: detect the limitation
1. On A create a party; B/C/D enter its code. Confirm membership and leader-only mode control on all four phones.
2. Leader selects a mode and launches. Record lobby seats, countdown timing and route changes.
3. On A move its paddle to an extreme while B/C/D keep fingers off-screen. Compare what each device sees. Then repeat from B.
4. Compare ball position, goal events, eliminated players, timers and winner. The present build is expected to diverge because each device runs local bots. **Mark synchronized PvP FAIL / NOT IMPLEMENTED**, even if names, party codes or countdowns match.
5. Disconnect B, background C and restart the API in an isolated test environment. Record party recovery and match behavior without assuming restart persistence.
6. Test lobby Back/cancel during each digit on A/B/C/D. None may enter gameplay afterward.

### Future PvP acceptance (only after a separate engine project)
Require all four independently controlled paddles visible on all four devices, consistent authoritative scores/winner, shared seed/state, bounded latency, reconnection and explicit disconnect handling. Test Wi-Fi, separate cellular networks and impaired connectivity. Do not pass on four simulators, four tabs or AI-filled seats.

### Native regression checks on all four
Bank lives 0/cap, one start deduction, pause/resume, full match/results, saved-state reopen, mute, OS reduced motion, highlight sharing, sandbox cancellation and restore. Record failures and do not mark unexecuted items passed.
