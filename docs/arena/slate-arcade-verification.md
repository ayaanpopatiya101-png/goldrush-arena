# Slate Arcade verification

## Implemented scope

- Shared Expo screens remain the source for the browser game. No replacement website or duplicate profile/progression system was introduced.
- Blue-slate canvas, lighter slate panels, rounded layered edges, green actions, gold reward details and existing condensed typography apply through entry/tutorial, primary tabs and supporting routes.
- Shared buttons have short press transitions; reduced-motion settings disable animated transitions. Home's existing focus/visibility-aware bot demonstration is retained.
- Home exposes the actual account XP rank and direct Trophy Road navigation. Seasonal competitive skill remains separately labelled.
- Photo editing retains existing authenticated avatar endpoints, private defaults, explicit publication, bounded uploads and server sanitization. Added local decode validation, clear HEIC limitations, responsive crop controls, repeat-action guards and recovery messages.
- Android uses its system image picker without requesting the broad media permissions that the app deliberately does not declare. iOS retains denied/limited-access handling and Settings recovery.
- Games-played rewards use separate stable IDs and a fresh counter advanced in the persisted deduplicated match-award transaction. Legacy totals are not backfilled. Original XP-road IDs, pass rewards and saved ownership remain unchanged.
- Match awards, game-road claims, XP-road claims and existing pass claims share a transaction queue to prevent their saves overwriting one another.

## Engineering checks

On 2026-11-12:

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed; restored already-declared dependencies missing in the fork |
| `pnpm --filter @workspace/api-spec run codegen` | Passed; refreshed stale generated declarations, no contract changes |
| `pnpm run typecheck` | Passed across all workspace packages |
| `pnpm --filter @workspace/mobile run test:reliability` | 58 passed |
| `pnpm --filter @workspace/mobile run test:photos` | 4 passed |
| `pnpm --filter @workspace/mobile run test:clips` | 9 passed |
| Browser production export | Passed via the existing web workflow |
| iOS JS/Hermes export, one worker | Passed |
| Android JS/Hermes export, one worker | Passed |
| API, browser and Expo development workflows | Running |

The production-provider tests cover old-save migration, failed-write retry, duplicate/stale callback protection, simultaneous claim types, and two distinct completed-match receipts through the actual Play Again/automatic-rematch handlers. Those are deterministic callback/engine tests, not two browser-played games.

## One scoped browser journey

Used a new isolated local test profile with seeded progress, at 390×844 and 1280×900:

- Home rank opened Ranks, with account XP and seasonal skill shown separately.
- Home Trophy Road opened the new lane and retained the existing XP lane.
- Double-tapping the first claim awarded exactly 100 coins once; the second milestone awarded 150 once. Both stayed claimed after reload, and future milestones remained locked.
- A real generated landscape JPEG passed through the browser file chooser, crop/zoom/move controls and private save. Photo appearance and private state survived reload.
- Explicit publish, make-private and confirmed removal all succeeded against the actual avatar API. Reload after removal restored the emblem.
- At 150% text stress, photo controls remained within the phone viewport without horizontal overflow.
- Desktop Home, Trophy Road, Profile and Shop remained usable. Existing equipped, locked, insufficient-online-balance and unavailable states rendered explicitly.
- The public welcome screen was also captured at phone size.

## Limits and release gaps

- The existing Stripe catalog returned HTTP 500 in this environment. Shop displayed an error and Retry, with no invented prices or checkout controls. No purchase was attempted or charged. Existing entitlement logic was preserved; this is not evidence of a successful real-money transaction.
- iOS/Android exports are JavaScript/Hermes bundle evidence only, not installed builds, physical-device photo permission checks, photo-library exports, RevenueCat purchases or store-review readiness.
- Browser image selection cannot prove iPhone HEIC conversion or Android limited-library behavior. Unsupported HEIC is explained rather than promised.
- Clip regression tests passed, but no physical Photos export was performed.
- No production publishing or multiplayer rewrite was performed. Standard ball timing and saved cosmetics were not changed.
