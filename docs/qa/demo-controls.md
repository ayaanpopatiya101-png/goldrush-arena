# Demo, matchmaking, pacing and browser controls

## Engineering checks

- `node --test scripts/demo-controls.test.cjs scripts/multiplayer.test.cjs scripts/arena-contract.test.cjs scripts/browser-release.test.cjs`: 29 passing checks.
- `pnpm --filter @workspace/mobile run test:reliability`: 50 passing checks.
- Mobile and API TypeScript checks passed.
- `node scripts/multiplayer-live-check.cjs` passed against the development API:
  synchronized authenticated clients, owned bounded input, reconnect, forfeit,
  repeat-safe receipts, human-only Ranked and disclosed Casual AI fallback.
- Browser production export and managed API build/start succeeded.
- Sequential iOS and Android exports succeeded with one Metro worker each.
  These are JavaScript/Hermes bundle checks, **not installed native app tests**.

The deterministic tests execute the production local loop at 30, 60 and 120 Hz.
They check one starting ball, subsequent additions at approximately 7, 17 and
27 seconds of active play, no catch-up after suspension, and preserved explicit
special-mode intervals. Authority tests check exact spawn ticks 420, 1020 and
1620. Other checks cover four automated demo paddles, bounded movement, zero
awards, demo completion, playable tutorial input, queue reservations, fallback,
in-flight cancellation and pointer cleanup.

## Browser evidence

One focused pass and a targeted follow-up for court visibility used isolated
development guests at 390 × 844 and 390 × 650 with Chromium/CDP touch emulation.

Observed:

- Tutorial Move did not advance without input; touch advanced Move → Block →
  Miss. The tutorial was then skipped.
- All four disclosed demo bots moved without input. Pause froze transforms,
  Resume restored movement, and the reduced-motion context started paused.
  Demo observation did not change local wallet/progression.
- A completely offscreen court froze, then resumed on return to view.
- Warm-up touch dragging moved the south paddle without scrolling. A new drag
  worked after touch cancellation. Outside-court swiping scrolled the page;
  viewport configuration did not disable zoom.
- Returning to portrait allowed dragging after resize. Leaving and re-entering
  warm-up created a fresh round; input worked after countdown/pause-resume.
- Concurrent explicit Casual joins, 18 ms apart, shared a two-human room and
  two disclosed AI seats. Both clients returned the same authoritative room,
  tick and ball count. Confirmed cancellation returned both to Home with no
  subsequent queue POST. Visiting Home/selecting a mode alone did not queue.

Limits:

- The browser could not produce a true hidden-tab visibility transition.
  Background release is covered by deterministic event tests; genuine
  background/foreground behavior still needs device observation.
- A landscape touch attempt was outside the visible court and is not valid
  landscape-play evidence. Portrait recovery worked.
- Browser inspection reached the shared room after tick 1020, so the exact
  initial/420/1020 timeline is established by automated simulation checks,
  not an observed browser timing trace.
- Automatic repetition is covered by the production-loop completion test and
  Home restart wiring, not a timed complete-round browser recording.
- No physical iPhone or Android handset was used.
- A temporary test guest legitimately completed an initial singleton Casual
  match and received its normal reward. A tester attempted to reset only that
  guest's development earned fields, but its browser-local saved receipt still
  displayed the reward. This does not establish failed demo isolation and no
  existing user's save or production data was changed.

Gesture diagnosis identified uncontained browser drag responders in the original
courts. The pre-change gesture was modeled in the event harness; a complete
before/after phone-browser reproduction was not obtained. Post-change actual
browser touch behavior is described above.
