# Real multiplayer verification

## What is online

Ranked and Casual use the authoritative server for Classic, Duos, Blitz, Chaos,
Survival, Sudden Death, Turbo and Pinball. All clients see one canonical court:
South, North, West and East. Your highlighted edge is the paddle you control.
The server runs physics at 60 steps/second and broadcasts 20 snapshots/second.
Eliminated walls reflect balls; this online ruleset keeps its four-sided court.
Duos pairs South/East against North/West.

Online matches use equal starting lives and paddle sizes. Bank lives, locally
owned relic bonuses and map physics modifiers are not applied or consumed.
Practice, challenges, Gauntlet and the unsupported six-seat/elite variants remain
local. Local bot outcomes do not change competitive level.

Ranked requires four humans. Casual waits 12 seconds before adding labeled AI;
party queues allow 35 seconds. Invited members have reserved places while solo
players can fill the remaining places. Bots obey the same movement limits and
have delayed, imperfect reactions.

The current service has one region, labeled `primary`. Solo queues consider
server-side skill and reported round-trip latency; friends are kept together
even if their latency differs. This is not a deployed multi-region service.

## Four people on four devices

1. Run the API and mobile app against the same test backend and database.
   Use four separate devices, or four browser profiles/private contexts.
   Four tabs sharing one local profile are **one identity**, not four players.
2. Each tester chooses a separate disposable local profile. Do not use a
   purchaser's production save. Creating an online identity does not upload
   the device's coin balance or replace its purchase entitlements.
3. One tester creates a party on Home and shares the six-character code.
   The other three join. Confirm all four names in the party list.
4. The leader selects Ranked, then Play. Confirm four human seats, no AI
   badges, the same match ID in websocket snapshots, and a single 3-2-1.
5. Each person moves their highlighted paddle in turn. Everyone must see
   that same paddle move. Test both ends of each edge and simultaneous movement.
6. Deliberately miss a ball. All four screens should report the same lost life
   and puck position. Continue until eliminations and the final winner agree.
7. Briefly disable networking on one device for less than 20 seconds. It should
   reconnect to the same seat and live state, not restart a local game.
   Repeat beyond 20 seconds: the absent seat is eliminated; it is not secretly
   replaced by a human-looking bot. Online gameplay cannot pause.
8. Try Cancel during the queue/countdown. It should withdraw that player and
   return the other seats to waiting, without a delayed local launch.
   Forfeit an active match, return Home and queue again immediately. The new
   room must have a different ID while the old match continues. Its eventual
   receipt remains available; the app recovers completed forfeited receipts
   when saving later match results, without blocking the new queue.
9. Complete a match. Results must wait for verified saving. Reconnect or retry
   the result request: coins/XP must not be granted twice. Play Again must have
   a new server match ID. Existing skins and bank lives must remain unchanged.
10. With fewer testers, choose Casual and confirm the wait and visible AI labels.
    In Ranked, wait instead: no bots should appear; Switch to Casual is explicit.

Record device/OS, network type, approximate latency, missed/duplicated inputs,
disconnect durations, countdown differences and participant feedback. Browser
automation is not evidence that four humans enjoyed the game or that native
performance, battery use and store readiness passed.

## Engineering checks

Run from the repository root:

```sh
node --test scripts/multiplayer.test.cjs
node scripts/multiplayer-live-check.cjs
pnpm --filter @workspace/mobile run test:reliability
pnpm run typecheck
```

The live probe uses the development domain by default. `ARENA_TEST_BASE` can
point it at an explicitly chosen test environment. It creates temporary guest
identities and party membership, never prints bearer tokens, and leaves its
test rooms afterward. Its persisted results are test data, not customer sales.

## Interruption and recovery

Session secrets are random, server-issued bearer tokens. Only hashes are stored
in PostgreSQL; native devices use SecureStore, browsers use local origin storage.
These are guest device identities, not verified email accounts or cross-device
account recovery.

Final results and earned online totals are written atomically to PostgreSQL,
with a unique player/match receipt. Local display rewards have a separate
deduplication check. An unreadable save never gets replaced by a blank one.
A pending match marker lets a restarted client retrieve a verified receipt;
if the server never completed the match, it reports interruption instead.

Rooms and parties are memory-resident. Restarting the server interrupts active
matches without inventing outcomes. Finished receipts and identities survive.
To test this deliberately, use only the test server: restart it during a match,
check that reconnect shows an interrupted match, and confirm no reward appears.
Then start another match and verify the same guest identity still works.

## Release boundary

### Verification recorded on 8 November 2026

- Six focused simulation/result-route regressions passed.
- Existing mobile reliability checks: 43 passed; arena contracts: 10 passed.
- Full workspace TypeScript checks passed.
- Four independent websocket clients passed shared same-tick snapshot comparison,
  the 3-2-1 sequence, owned paddle input, reconnection, authorized forfeits and
  repeat-safe completed receipts.
- A separate probe confirmed Ranked stays human-only and Casual adds three
  explicitly marked AI seats after waiting.
- The forfeit regression passed: the player immediately joined a different room,
  and could still retrieve the old match's verified receipt after it finished.
- Deliberate test-server restart: active room disappeared without a fabricated
  receipt, while the guest identity and earlier completed receipt survived.
- Four isolated browser profiles reached the same human-only room and distinct
  seats. The match ended before automated UI movement/reconnect checks completed.
  The browser discovered a results-page URL-parameter guard error; it was fixed
  and covered by the receipt-route regression, not claimed as a second browser pass.
- No four-human physical-device or signed native playtest is claimed.

Use a **single authoritative server instance** for this implementation.
Multiple independent workers or autoscaled replicas require shared room
ownership/routing before release; PostgreSQL receipts alone do not share live
physics. Capacity/load testing and signed iOS/Android device testing are separate
from functional browser checks.

Apply the additive `arena_players` and `arena_results` schema to the intended
release database before enabling multiplayer there. Do not copy development
tokens or balances to production. The online earned-total ledger intentionally
does not import unverified local coins or replace payment-provider fulfillment.
