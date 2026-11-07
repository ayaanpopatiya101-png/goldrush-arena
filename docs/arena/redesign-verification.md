# Redesign verification record

## Passed

| Check | Outcome |
| --- | --- |
| `pnpm run typecheck` | All workspace libraries and artifacts passed |
| `pnpm --filter @workspace/mobile test:reliability` | 18 tests passed |
| `CI=1 pnpm exec expo install --check` in the mobile directory | Dependencies match the Expo SDK |
| `pnpm dlx expo-doctor@latest` in the mobile directory | 18 of 18 health checks passed |
| `CI=1 pnpm exec expo export --platform ios --platform android --output-dir ../../generated-artifacts/redesign/native` | Both native bundles exported successfully |
| `git diff --check` | No whitespace errors |
| Restart managed mobile workflow | Metro serving the preview; web bundle compiled |

The native export produces JavaScript/Hermes bundles. It is **not** a signed app, an installed device test, or App Store approval. Generated bundles are under the ignored `generated-artifacts/` directory and are not application source.

## Regression coverage

Existing tests cover startup timeout/failure, lobby disappearance/hanging join/repeated polling failures, cancellation of delayed starts, one game start/result guard, unpurchased-lives protection, explicit bot labels, premium-only cosmetics and unavailable native stores.

Added tests cover immutable completed-match receipts, XP totals not being added twice, canonical promotion thresholds, missing Gauntlet round recovery, one first-run/replay tutorial source, and removal of the automatic cinematic layer.

Source-contract checks are not a replacement for behavioral browser or device tests.

## Browser verification: incomplete

A browser walkthrough was started but did not return a completed evidence report within the bounded run and was stopped. No complete screen-by-screen or viewport-matrix pass is claimed.

The development API recorded ordinary lobby join and leave requests during the run. This is insufficient to verify gameplay, the countdown sequence, result/profile agreement or visual accessibility.

The standalone screenshot tool captured the visible startup screen at 390 × 844 in `generated-artifacts/redesign/entry-phone.jpg`; despite that filename, it shows **startup**, not the completed entry screen. It must not be presented as a verified final entry design.

There is no complete before/after screenshot set. The public production landing-page screenshot and older startup captures do not establish a before state for every in-app route.

## Release gate: not complete

Before release, finish the browser journey and visual matrix in `redesign-audit.md`, then exercise actual iOS and Android devices:

- Create and switch local profiles, complete/replay the tutorial, and check legal return preserves form input.
- Observe a single 3–2–1 countdown, exercise pointer/touch mapping, pause/resume/exit, complete a casual and ranked match, and compare receipt totals with Profile and History.
- Check Shop/Collection tabs, locked/unavailable/equipped states, pass quests and reward claims without duplicate rewards.
- Test keyboard-open entry, native safe areas, text scaling, focus containment/restoration and reduced motion.
- Capture, save, delete and share a real native clip; test unavailable permissions, encoding failure and cancellation.
- Test sandbox purchases, cancellation, restore, missing offerings and verified fulfillment with configured store products.
- Supply verified publisher, support and public legal details, then finish store-review requirements.

No real-money purchase, deployment, GitHub push, native installation or production migration was performed in this implementation.
