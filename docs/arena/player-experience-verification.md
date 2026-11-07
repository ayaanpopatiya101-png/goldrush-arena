# Player experience verification candidate

Date: 2026-11-07. This record supersedes the older implementation's test counts, not its recorded limitations.

## Provenance

- Starting workspace: `5ce33c6dbe1ac909bdc71b4fd0cc081c45ff4408`, clean `main`. No branch replacement, force push or production publication.
- Application candidate submitted to browser verification: `3cdab1496dc8274f1c7dc24c9e89e41887c0eb32`.
- Intermediate application source after the two browser-discovered repairs: `5ad987b4c8901e6515e505865d9ce4998d37421f`. Mobile type checking and 27 regressions passed at this revision.
- Final application source: `26a395642ed18817f0759de14efc47c8f0db4bf1`. Adds a rematch-identity correction and a two-completed-match regression. Mobile type checking and all 28 regressions pass. The full browser journey was not repeated after the localized repairs.
- Expo dependency: `~54.0.38`; React Native `0.81.5`; bundle IDs remain `com.goldrush.arena`.
- Repository search found no `.xcodeproj` or `.xcworkspace`. The brief's Expo 57 native project is **unavailable in this checkout**, not disproven elsewhere. No prebuild, project regeneration, SDK upgrade or native signing was attempted.
- Publishing metadata reports an active public autoscale deployment with a successful build at `https://arena-gold-rush--ayaanpopatiya10.replit.app`. Its root returned HTTP 200.
- Read-only production manifest request with `expo-platform: ios`: ID `ac28e793-57be-476e-8ef4-422131f787a1`, created `2026-06-27T18:49:43.299Z`, runtime `exposdk:54.0.0`, SDK `54.0.0`, app version `1.0.0`. This does **not** identify its source commit or branch.
- Read-only checks of `/privacy` and `/support` returned HTTP 404. No URL or owner identity was invented.

## Implementation decisions

1. Keep the existing physical court, typography, flat surfaces, five primary destinations and truthful local-bot/device-local language. Reuse the existing components rather than another UI library.
2. The first session now requires actual paddle input, a block and a miss in the real engine before offering a forgiving introductory match. Skip and replay use the same awaited profile flag. Progression is explained after play, not as first-minute currency slides.
3. Automatic tutorial, daily reward, rank ceremony, drop opener, share and redeem dialogs use one application-wide FIFO. Closing or unmounting releases the next request. Fatal error and OS permission/confirmation surfaces are not rewards.
4. Practice is an explicit Home choice. Its own court and sensitivity controls never call the award API, spend bank lives or display reward-collection UI. A legacy practice session also cannot enter the normal award path.
5. Sensitivity remains a saved number, but maps to a monotonic curve with reachable walls at every setting. High-speed balls use radius-bounded collision substeps. Direction checks prevent repeat contact when moving away; a simultaneous corner contact belongs to one wall.
6. Bots retain explicit movement-speed, prediction/error and reaction-interval tuning. Rank no longer silently equips ball-affecting relics on bots. Player inventory, relic IDs and ownership remain intact. Visible power-ups and abilities are still gameplay rules, not a hidden difficulty adjustment.
7. Each configured match has a stable award identity. Profile totals, history entry, receipt and consumed-ID ledger are written in the same profile JSON. Same-ID concurrent callbacks coalesce; different match commits serialize; persisted IDs reject a retry even after receipt history expires. A player-directory metadata failure cannot turn a committed award into an apparent failed transaction.
8. History and Results include featured and event XP/coins in the same totals. Event detail is labeled as included. Account XP, competitive level, pass points and cosmetic ownership remain separate.
9. Shop and Collection can compare a selected paddle with the equipped paddle on the real reward-free court. Comparison does not buy or equip. Unsupported themes/trails retain honest unavailable states; purchased appearance IDs are unchanged.
10. Core native gameplay sounds reuse the existing WAV adapter. All haptic call sites pass the same preference gate; screen shake checks its setting centrally; reduced-effects preference combines with OS Reduce Motion. Native sensation, audio timing and performance remain unmeasured.
11. Two pre-existing standalone-shop control typings crossed different React ref type versions after frozen dependency installation. A callback-ref adapter and inferred icon props repair workspace type checking without changing storefront behavior or dependency versions.

## Reproducible checks

| Command | Actual result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Passed; restored missing standalone-shop modules without changing the lockfile |
| `pnpm run typecheck` | Passed across all libraries and artifacts after the ref compatibility repair |
| `pnpm --filter @workspace/mobile test:reliability` | 28 passed, 0 failed after the rematch correction; `final-regressions.log` |
| `cd artifacts/mobile && CI=1 pnpm exec expo install --check` | Dependencies up to date |
| `cd artifacts/mobile && pnpm dlx expo-doctor@latest` | 18/18 checks passed |
| `git diff --check` | Passed |
| `CI=1 pnpm exec expo export --platform ios --max-workers 1 --output-dir ../../generated-artifacts/player-experience/ios` | Passed at rematch-corrected final source; `ios-export-rematch.log` |
| `CI=1 pnpm exec expo export --platform android --max-workers 1 --output-dir ../../generated-artifacts/player-experience/android` | Passed at rematch-corrected final source; `android-export-rematch.log` |
| `CI=1 pnpm exec expo export --platform web --max-workers 1 --output-dir ../../generated-artifacts/player-experience/web` | Passed at rematch-corrected final source; `web-export-rematch.log` |
| Managed mobile/API restart and log inspection | Running; Metro compiled the 1,625-module web app, API health returned 200 |

The new regressions execute the **production** collision loop and award callback with deterministic clocks and memory storage. They cover phone/wide input endpoints, high speed at 60/30/15 fps, eight balls, corner life loss, one contact while moving inward, actual tutorial input/block/miss events, zero practice awards, featured/event receipt arithmetic, simultaneous/stale/reloaded duplicate awards and storage failure followed by retry.

These tests do not measure native frame rate, real input latency or human understanding. The 15 fps test checks collision safety, not real-time pacing; existing frame-time smoothing bounds catch-up.

## Build and browser evidence

The initial concurrent `expo export --platform all` ran close to the workspace memory limit while Metro/browser services were also active; the preview service stopped during that attempt. The export was stopped without a completed build. The interrupted attempt is not a passing export. Use one platform and `--max-workers 1` for subsequent exports.

The first browser attempt was unable to enter the app because the preview returned 502 after that interruption. Metro was restored and the **same** tester/session continued the bounded journey. It completed the core engineering flow at 390×844:

- Fresh test profile, one daily dialog dismissed without claiming.
- Real Move → Block → Miss → Intro Match → Debrief → Finish. Intro was active at four blocks after nine seconds and finished naturally during the following wait. This is automation timing, not a human first-play metric.
- Casual lobby → single countdown → court → first-place result. Two hits, three goals against, **179 XP and 56 coins**. Profile showed 179 XP and one win/game; wallet changed **200 → 256**; History showed the same outcome/stats/XP. The planned intentional loss was not achieved, so loss-specific browser verification is not claimed.
- Play Again reached another lobby; it entered gameplay before cancellation was attempted. Pause/exit returned to Home without a second saved match or balance change. Pre-countdown cancellation is covered by deterministic lobby tests, **not** this browser pass.
- Practice showed no rewards and completed without collection UI. Slow sensitivity visibly reached the left wall. The right-wall browser attempt ended with practice completion and is unverified; deterministic endpoint tests cover both walls.
- Collection and Shop comparisons showed cosmetic-only ownership and no purchase/equip side effect; equipped/selected toggle, Run and Close were exercised in Collection.
- Settings was reached and disclosed that support is not configured. Persistence/reload, replay, support/legal interactions and the wide Home viewport were **not run** in the bounded pass.

The pass observed cross-origin matchmaking preflight failure, with truthful bot fallback. The final repair keeps browser API requests on the same Expo origin. A real `GET /api/healthz` on that Expo origin returned HTTP 200 and `{"status":"ok"}`; a deterministic URL test prevents host rewriting. Native configured API behavior is unchanged.

The pass also found overlapping header icon touch extensions. The final repair removes the 6px hit extensions while preserving the full 44×44 controls and 4px gaps. This is source/type/regression verified, not a repeated browser pass.

Completion checking subsequently exposed a gap the bounded browser pass did not exercise: **finishing** the rematch reused the first award identity. Duplicate detection could therefore return the first receipt instead of awarding the second match. Results now explicitly begins a new configured match when Play Again is pressed, once per mounted Results screen. Lobby changes and callback retries preserve that new ID; original challenge credentials/opponents/countdown/bank-life selection are not recycled.

The added regression executes the actual Results press handler and actual profile award callback: complete a Ranked match, retry its award, press Play Again twice, simulate lobby updates, complete a second match, retry and reload it. It verifies two distinct persisted receipts/history entries, 460 total XP, 260 coins from an initial 200, competitive-level continuity, and no third award. The competitive delta is checked against both receipt boundaries, not a fabricated fixed reward rate.

Actual raw report: `generated-artifacts/player-experience/report.txt`. Representative after screenshots: `02-tutorial-move.png`, `04-tutorial-miss.png`, `06-tutorial-debrief.png`, `07-home.png`, `11-casual-result.png`, `15-profile-history.png`, `18-practice-slow-left.png`, `22-collection-comparison.png`, `26-shop-comparison.png`, `27-settings-not-tested.png`. These are browser evidence, not native or human evidence.

Before evidence: `generated-artifacts/player-experience/before-entry.jpg`, 390×844, captured before editing. It shows the real entry form, not a startup placeholder. This entry was intentionally retained. There is no pre-change screenshot of every signed-in route; do not describe later screenshots as matched before/after comparisons for all routes.

Matched after-entry evidence is the tester's `01-onboarding.png`, also 390×844. The later standalone `after-entry.jpg` capture shows startup, despite its filename, and must not be presented as final entry evidence. The substantial changed-state screenshots come from the completed in-app browser journey listed above.

All three exports completed again with exit code 0 against the rematch-corrected source. They are JavaScript/assets/Hermes build evidence only, not Xcode/Gradle compilation, signing, installation, device performance or store approval. Only documentation/memory changes follow final source revision `26a395642ed18817f0759de14efc47c8f0db4bf1`.

Generated images, exports and logs are ignored by Git and deployment. Browser screenshot IDs are separately retained in the browser report.

## Migration and save safety

- No existing profile/settings keys, item IDs, prices, reward rates, purchased appearances or bundle identifiers changed.
- `rewardedMatchIds`, per-history `receipt` and `reducedEffects` are additive optional data. Older saves remain readable. Existing history is not retroactively re-awarded or rewritten.
- Profile history remains capped at 50 entries; consumed match IDs remain available beyond that cap. Reopening Results itself has no award side effect.
- The receipt is durable in History but the active Results navigation remains session-local. A hard reload or missing configured match offers recovery, not an invented result.
- This is device-local storage, not server-authoritative competitive validation or cloud backup. Concurrent writers in different tabs/devices are not an authenticated shared account.
- No production database or save migration was run. No live-money charge was made.

## Remaining release gates

- Obtain the actual native project/release baseline if it is to be reconciled with this workspace. Source provenance of the serving manifest is unknown.
- Install a signed candidate on real supported iOS and Android devices. Measure older-phone frame time, long-session memory/temperature, input, audio/mute, haptics, safe areas, large text, OS interruptions and capture/share.
- Verify sandbox purchases, cancel/restore, real localized offerings and durable fulfillment with configured store identities. Bundle export is not a store build or purchase test.
- Creator must provide verified publisher/legal/support details; public policies/support pages currently 404. Legal review and real public URLs remain required.
- Run the formative protocol in `formative-playtest.md` with real participants. No human results or retention claim can be inferred from browser automation.
- Capture final store assets from that exact signed candidate. Web evidence is not TestFlight evidence.
- Synchronized human PvP remains out of scope and is not implemented. Parties only coordinate entry.
- No production publication is authorized from this task fork.
