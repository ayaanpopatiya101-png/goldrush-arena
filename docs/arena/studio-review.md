# Role-based review

This is an AI-assisted source review and development verification record, not
human consumer research, a native-device playtest, or App Store approval.

## Repository research

[Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios)
provides development roles, prompts, templates and evidence gates. It is not a
gameplay engine or an automatic guarantee of quality. Its game-designer,
QA-lead and live-ops-designer role definitions were read for this review.
Attribution and the MIT notice are in `third-party-notices.md`.

[Game Studio AI](https://github.com/miharbi/game-studio-ai) was also reviewed.
It adds a separate Python orchestrator, provider setup and engine-oriented
pipelines. It was not installed: the existing Expo game needs targeted reviews
and fixes, not another runtime or duplicate orchestration system.

No external repository hooks were installed or executed. No engine migration,
new provider credentials or changes to published store products were made.

## Perspectives and findings

| Perspective | Question | Finding and response |
| --- | --- | --- |
| Player / consumer | Does the UI honestly explain what a tap does? | The pause menu advertised a paid life purchase, but both life controls granted lives without checkout or inventory use. Removed those controls and their grant callback from the match screen. Actual paid products remain in Shop; selected bank lives remain a pre-match choice. |
| Game designer | Can players distinguish their seat, opponents and feedback? | Bot badges were suppressed in the lobby. Opponent seats now explicitly show BOT and queue copy describes local bot seats. Shared seat colors now drive both the home preview labels and arena paddles. |
| App operator / QA | Can a failed service leave a player stuck? | Polling ignored missing rooms and repeated failures. A missing room or three failed polls now triggers a disclosed local-bot fallback. A 15-second queue deadline also covers hanging requests. Leaving aborts pending requests and cancels delayed starts. |

The review is bounded. Findings discovered later must be assessed rather than
assuming these three fixes eliminated every possible defect.

## Verification

- Mobile TypeScript check passed.
- Fourteen reliability/contrast checks passed. These include a controlled-clock
  execution of the production lobby focus body for a missing room, hanging
  join, repeated server failures and cancellation during fallback.
- The controlled-clock tests replace network, timers and React state setters.
  They do not establish physical-device performance or real network behavior.
- Source-contract checks protect bot labeling and the removal of fake-paid
  life controls. These are not purchase receipt tests.
- Theme tests check primary and muted text against the three main surfaces
  and dark text on the primary action. They are not an exhaustive screen-level
  accessibility certification.

### Browser observations

One bounded browser pass created an isolated local profile and inspected Home
at 390 and 375 pixels, Shop, a mocked missing-room recovery and a short Blitz
match. No paid purchase was made.

- Home showed the new green/gold surfaces and gold/red/ivory/lime preview seats.
- A mocked successful join followed by a room GET returning 404 displayed the
  explicit local fallback message, BOT badges and a countdown digit before
  navigating into the match. The full countdown sequence was not captured by
  the browser pass; the controlled-clock test recorded 3, 2, 1, 0.
- The short match ended before Pause could be clicked. The removal of both
  fake life controls is source-verified, not a passed browser Pause test.
- Browser evidence exposed cramped preview seats, crowded Shop category
  labels, merchandise caught at tiny entrance-animation scales and translucent
  navigation overlapping scrolled text. Follow-up fixes use compact two-row
  seat labels, spaced horizontally scrollable categories, full-size cards
  without entrance transforms and an opaque tab backdrop.
- Those final presentation fixes passed TypeScript/static inspection and the
  reliability suite. They were not given another full browser pass.

Browser screenshot references: Home `s5beg2`, narrow Home `gvd1qr`, Shop
`blh05r`, missing-room fallback `rs7o5p`, short match `flgwp3`. They precede
the final readability fixes and must not be described as final screenshots.

## Repeatable review procedure

1. Review from the player's perspective: discoverability, truthful labels,
   loading/error recovery, readable controls and clear consequences.
2. Review as a game designer: input feedback, rules, seat identity, fairness,
   match start/exit and progression. Do not silently alter the economy.
3. Review as an operator: service failure, purchase authority, persisted data,
   support/privacy disclosures and release blockers.
4. Rank reproducible findings by impact. Fix in-scope defects, retain regression
   checks and inspect the running changed screens.
5. Record what was actually verified and stop the review at that boundary.
   Do not claim zero bugs or treat simulated players as four human testers.

## Release boundary

The blockers in `release-checklist.md` remain: real synchronized four-human PvP,
physical-device and store-transaction validation, verified publisher/support
details, legal review and secure account ownership are not supplied by a color
refresh or by installing agent prompts.
