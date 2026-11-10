# Events, skill and mode audit

## Research, 8 November 2026
- Supercell's official [Intro to Ranked](https://support.supercell.com/brawl-stars/en/articles/intro-to-ranked.html) documents Events entry, explicit eligibility, rotating selections, monthly ranked seasons and visible ranks.
- [Halopedia's Halo 3 ranks](https://www.halopedia.org/Rank_(Halo_3)) documents separate skill (1–50) and EXP/service records. It is a community reference, not an implementation specification.
- Hypothesis: clear eligibility and persistent service accomplishments make experimentation less intimidating. This needs player feedback, not claims of proven engagement.
- GoldRush uses its own pairwise Elo-style formula, not Halo's proprietary algorithm. No borrowed art or branding.

## Competitive record
Only server-completed four-human Ranked matches affect skill. Casual and bots never count. Five monthly placements use K=64; later games K=24. Actual score is (4-place)/3 (team wins 1, losses 0), compared with mean logistic expected score against opponents. Rating is bounded 100–3000. Match receipts and rating updates commit atomically; retries do not award again.

Seasons are UTC calendar months. New seasons begin at 1000 with five placements. Previous seasonal records remain. The season belongs to the room creation time so a match spanning midnight stays in its original season. XP, legacy levels, cosmetics, purchases and achievements are not reset or imported as trusted skill. Legacy local competitive levels remain historical records.

## Mode audit
| Mode | Decision and reasoning |
|---|---|
| Classic | Primary Ranked/Casual. Clear survival objective and shared rules. |
| Practice/warm-up | Primary solo, no competitive rewards; safe input learning. |
| Duos | More Modes, genuine team objective. Equal online equipment. |
| Blitz | More Modes, short one-life/two-ball match; demanding but quick. |
| Chaos | More Modes, three lives/five balls; visually demanding. |
| Survival | More Modes, twelve lives; longer sessions, no separate ranked promotion. |
| Sudden Death | More Modes, one life/three balls; high difficulty. |
| Turbo | More Modes, 1.8x speed, reaction-heavy. |
| Pinball | More Modes, faster ball spawning; attention-heavy. |
| Six-player | Local only; not compatible with four-player server. No online party launch. |
| Storm Surge | Local elite challenge; overlaps Sudden Death but preserves unlocks. |
| Ghost Protocol | Local elite, disappearing balls; clearly high difficulty. |
| Warlord | Local asymmetric 1v5 challenge; never paid competitive advantage. |
| Gauntlet | Local multi-round progression, preserved. |
| Survival Run | Solo arcade, score endurance. |
| Daily Challenge | Seeded solo run, separate score submission rules. |
| Featured modifiers | Rotating local playlists, explicit speed/XP/coin modifiers; never routed to unmodified online Classic. |
| Rally Race | New Casual timed score objective, not another elimination-speed variant. 60s, +1 hit, -2 miss, goals do not eliminate; highest score wins. Tied first voids rewards. Forfeit/disconnect still eliminates. |

Ranked, Casual and Practice remain primary. More Modes and Events contain alternatives rather than adding primary queue buttons. Existing unlocks and historical challenge progress remain. Pro tournaments have no invented schedule, prizes or players. Follow preferences and in-app reminders are device-local, not push notifications.

## Verification boundary
Simulation tests cover Rally Race scoring, goal survival, timed finish and ties. Skill tests cover placements, opponent strength and UTC year rollover. Four-client protocol checks cover synchronized play and receipts. Physical-device playability and longer-term balance still require human sessions before store-release claims.

Completed checks: nine focused tests and both mobile/API TypeScript checks passed. Locked monthly and annual schedule tests cover every month and December rollover. A live 60-second Rally Race resolved, with Casual leaving placement counts unchanged. Four clients verified shared state and immutable receipts; repeated reads left the competitive games count at one.

The 390×844 browser journey passed: follow/reminder settings survived reload, monthly challenge dates and eligibility matched, the new profile showed unplaced 0/5 with unchanged service XP, and Rally Race displayed its timer/scores and returned Home after confirmed forfeit. No physical-device or balance study is claimed.

After that browser pass, the playing view was made scrollable and leave/confirmation controls moved above the court to keep them reachable at shorter phone heights. This layout adjustment was checked by source inspection and TypeScript, not a second browser pass.
