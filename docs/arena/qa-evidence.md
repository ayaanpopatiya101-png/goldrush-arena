# Upgrade QA evidence

Date: 6 November 2026. This is development evidence, not store certification.

## Audit and changes
| Area | Original issue | Change / boundary |
|---|---|---|
| Startup | Unhandled account/storage rejection could spin forever; invalid JSON could be overwritten with defaults | Bounded reads, usable font fallback, explicit retry and no reset of unreadable saves |
| Countdown | Lobby and arena both counted down; readiness closure and delayed navigation could outlive lobby focus | Lobby owns 3/2/1; focused-lifetime timer cleanup, readiness/navigation guards; arena skips a completed lobby countdown |
| Match entry/result | Start and completion callbacks had no entry-point idempotency guard | Guard both; bank lives consume at actual start only |
| Missing result | Missing query data silently returned Home and conditionally skipped later hooks | Separate missing-result wrapper with a visible explanation and Home action |
| Home | Decorative mini-arena, many competing actions, glow-heavy panels | Actual practice GameArena, four labeled seats, selected mode and one Play control; compact phone preview |
| Presentation | Gradients, neon/multicolor panels, emoji UI, glass, Inter, soft panels, decorative loops | Flat graphite/off-white/ochre, Barlow/Source Sans, vector glyph mapping, square surfaces; existing saved IDs/avatars retained |
| Shop | Theme and bundle placeholders spent coins without granting usable items; zero-price exclusive skins could be bought | Unimplemented items explicitly unavailable with no deduction; pass-exclusive ownership gate; actual skin purchase saves equip atomically |
| Catalog | Hardcoded web prices and delayed tab-switch retry | Fetched Stripe amount/currency, localized native offerings, skeleton/error/retry states; existing 11 paid products retained |
| Sharing | Unsupported match-highlight sharing could continue into rewards | Explicit availability guard and early exit; returned share sheet is not proof of publication |
| Native dependencies | SDK-57-era file/sharing/review modules mixed with Expo 54; duplicate native file module | Expo-compatible versions; legacy GIF IO imports separated from class-based WAV IO |
| Policies | Claimed no networking, purchases or third-party processing | In-app pre-release Terms/Privacy describe actual services, local bot arena, local storage and missing owner details |
| Workspace checks | Existing mockup CSS property and cross-version React ref-type errors surfaced | Removed redundant RN-only CSS property; type-safe ref cleanup adapter and spinner props, no mockup redesign |

## Automated/static evidence
- `pnpm --filter @workspace/mobile run typecheck`: passed after final app fixes.
- `pnpm --filter @workspace/mobile run test:reliability`: 6 passed. Two tests execute startup timeout behavior; four are source-contract checks, not simulated matches.
- `CI=1 pnpm exec expo install --check` from `artifacts/mobile`: passed after alignment.
- `pnpm dlx expo-doctor@latest` from `artifacts/mobile`: 18/18 passed.
- Store GET returned HTTP 200 and 11 products. No paid checkout was completed.
- Full-workspace checking exposed old mockup errors; they were repaired. The final `pnpm run typecheck` completed successfully for libraries, mobile, API, scripts and the mockup sandbox. The earlier interrupted run is not counted as a pass.

## Browser evidence: first pass
390 × 844, one fresh local profile, normal in-app navigation.

Passed observations:
- Profile creation, tutorial dismissal, streak claim, actual home preview and Casual selection.
- Profile name and 250-coin balance survived reload.
- Skin catalog, equipped Classic and PASS LOCKED Aurora/Phantom.
- Theme action returned Unavailable and balance did not change.
- Four catalog skeletons resolved to live prices. No checkout, redeem or real-money payment.
- Settings Support clearly disclosed missing contact configuration.
- Privacy and Terms were reachable and described current behavior.

Incomplete / failed observations:
- The tester observed a game start followed by Home without a result and did not capture 3/2/1. This is not counted as a passed match.
- Code hot refresh overlapped the first browser session, and all workflows later stopped; the next browser request returned 502. These interruptions prevent attributing every navigation observation to the app.
- Phone match cancellation/results and wide/reduced-motion checks require the focused continuation below. No complete second end-to-end pass was requested.

Screenshot references from that session: home `u7ztvo`, Casual home `gi8m66`, lobby `waqt0s`, game `h4l76q`, shop `3m1shs`, themes `jxqlm7`, store `bpeaa7`, privacy `3kki3n`, terms `vkru6z`. These are session evidence references, not claims of native-device verification.

## Before / after evidence retention
The task supplied the original source snapshot showing the old mini-arena, gradients, Inter and emoji UI. An early-audit screenshot is retained at `generated-artifacts/arena-before.jpg`; it was captured while shared styling work had begun, so it is not labeled an untouched full baseline. Startup capture is `generated-artifacts/arena-onboarding-after.jpg`. Generated screenshots are excluded from Git/deployment; signed-in browser captures above are the useful player-journey evidence.

## Focused browser continuation: passed
The same tester continued only the failed match flow and unfinished viewport/motion checks, after workflow recovery and with code edits paused.

- In-page observation recorded `3 → 2 → 1 → 0`. On a separate attempt, Leave lobby was clicked during the visible 3. The app stayed Home after 6.5 seconds; no match was recorded.
- An isolated fresh profile completed Blitz, reached a single postgame result and returned to a one-game history. Reload preserved that profile, 266 coins and exactly one played game.
- Result evidence: runner-up, one goal against, +32 XP and +16 coins. “Casual Mode −20%” is consistent with the existing economy: casual's 0.8 multiplier takes precedence over variant bonuses. This upgrade did not change that rule.
- 1280 × 900 Home had a visible Play control and no obvious horizontal overflow in the captured mode-selection section.
- 390 × 844 with reduced-motion media enabled paused the demo and displayed an explicit Run Preview action.
- Screenshot references: cancellation `k1j5mg`, stayed Home `3wbkj5`, result `2rsox1`, wide Home `6yufdt`, reduced motion `4y1kg3`.
- After screenshot inspection, inactive tab labels/icons were made legible and the web tab bar safe-area height corrected. This presentation-only fix was checked statically, not with another browser pass.

## Not executed / not established
Physical iOS/Android devices, TestFlight, native receipts/restoration, native audio/haptics and capture performance; four-human synchronized PvP; cloud-save recovery; legal compliance and provider production setup. Follow the release checklist rather than treating any of these as passed.
