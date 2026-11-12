# Court, hit and rules workshop

Open **Paddle Studio → Court, hits, rules**. Existing paddle plates and paid
equipment are untouched. Court and hit overrides equip independently; unequipping
or deleting an override restores the previous paid/default selection.

## Private storage

Drafts are per-device and per-player. Save explicitly to synchronize presets to
the arena server under the existing guest credential. A username alone never
links devices. Up to 20 presets contain a name, court appearance, hit appearance
and rules. Duplicate creates a separate identity; deleting an equipped preset
clears only its overrides. No marketplace or automatic publication exists.

## Engine controls

The actual fixed-60Hz shared simulation runs in preview/practice and on the
private match server. Courts remain square; flat/grain/beveled are rendering
finishes, not physical 3D geometry. Cosmetic choices never enter collision or
reward calculations.

Rules: paddle length 80/100/120%, initial speed 75/100/125%, hit acceleration
0/1.5/3% (gentle/standard/lively), speed capped at 760 simulation units/sec;
1–12 lives, 1–4 starting balls, 1–8 maximum balls with starting <= maximum.
Other physics, scripts and geometry cannot be supplied. Standard spawning remains
7 seconds then every 10 seconds; custom ball caps can stop further spawns.
Changing a practice rule explicitly restarts that practice round. Practice is
against three labeled AI paddles, never represented as PvP.

Hit marks are localized, bounded in size/duration/count, at most twice per second,
and suppressed by OS reduced motion or the game's reduced-effects preference.

## Private multiplayer

Create from a draft or join an eight-character code. Creation locks and hashes a
validated configuration, and explicitly shares it with code-holding participants.
Every participant, including host, presses **Agree to these rules** for this
exact hash. Four connected human clients are required; no bot fill or public
queue mixing. A departed participant must agree again after rejoining.

Custom matches never enter the normal receipt/progression path: no ranked rating,
coins, XP, Trophy Road, quests or play-earned rewards. Standard queue requests
reject extra custom configuration. Each player has only one active room.

Live simulation is one-process authoritative, as in existing multiplayer.
Each participant retains a database-backed copy of the immutable configuration.
After a process restart, an interrupted match is explicitly void, not resumed
from a guessed score. **Check room**, **Load its preset as draft**, and **Close
and start anew** recover the configuration without fabricating results.

## AI

Optional help processes only the entered prompt, current preset and at most six
600-character history messages. No private photos/reminder records are attached;
phone-like strings, email addresses and links are rejected before forwarding.
Do not enter personal information. The existing OpenAI server integration is
reused; credentials never enter clients. Both studios share persisted limits of
10 attempts/player/day and 100 global/day, including failed calls. Requests have
a 60-second provider timeout, no retries, and bounded output.

The response is a data-only proposal validated against strict nested schemas,
integer bounds, enum choices, matching design identity, and compatible ball
limits. Proposals have explanations and follow-up questions; Preview, Apply,
Undo and Save are distinct actions. No tools, eval, purchases or entitlements.

## Engineering checks

- `pnpm --filter @workspace/api-server run test:workshop`: schemas, prompt abuse,
  output rejection, physics choices, cosmetic invariance, standard variant/timing.
- `pnpm --filter @workspace/api-server run test:workshop-api`: running development
  API, persistence, owner denial, preserved purchases, four real socket clients,
  consent barrier, queue isolation and reward-ledger invariance.
- `pnpm run typecheck`: entire workspace.

Browser evidence is distinct from physical-device and four-human network testing.

### Verification recorded 2026-11-12

- Entire workspace typecheck passed.
- Three schema/shared-engine tests and two running-API integration tests passed,
  including denied cross-owner save/delete/equip and shared AI-budget denial.
- Four actual authenticated WebSocket clients observed the same private room and
  bounded authoritative paddle movement (112 units at the lower custom limit).
  Injected life/winner fields did nothing. Three forfeits ended the round with no
  receipts, XP, coins or competitive-ledger changes.
- A real API process restart preserved the saved/equipped preset and exact room
  config/hash. The interrupted round recovered explicitly void, without a result.
- One scoped browser pass covered create/save/reload/edit/duplicate/delete/equip,
  pointer-controlled practice, a **real** AI response, explicit Apply and exact
  Undo. Four isolated browser contexts agreed to and completed two short private
  matches with consistent results. They finished too quickly to observe private
  paddle motion in that browser pass; the four-client protocol test above covers
  that authority check, not a claim of physical-device play.
- The browser revealed a key-order-only “unsaved” label after PostgreSQL reload;
  equality now normalizes key order before comparison. The narrow studio header
  was also adjusted so tabs do not overlap the balance.
- All 58 existing mobile reliability checks passed. Sequential iOS and Android
  JavaScript/Hermes exports passed on the existing Expo 54 toolchain. These are
  export checks, not installed/signed app tests or physical-phone evidence.
