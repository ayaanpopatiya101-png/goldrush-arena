# Scorecard QA

Tested November 4, 2026.

## Passed

- Ten automated regression tests for rank compatibility, input boundaries, pause eligibility, season rewards, UI copy, and design exclusions.
- Workspace TypeScript checks, including the mobile app and API server.
- Release arm64 iPhone simulator build in Xcode 26.6.
- Native launch on iPhone 17 Pro, iOS 26.5, displaying the redesigned entry screen.
- Browser interaction at 390 × 844: local player creation, first-run instructions, legal access before entry, mode selection, real rank screen, paddle input, pause, resume, and restart.
- The practice session left the test player at zero recorded matches, zero XP, and 200 coins.
- New app icon is 1024 × 1024 RGB, with no alpha channel.
- Whitespace and conflict-marker checks.

## Still required

Full physical-device playtesting, VoiceOver and large-text review, all mode win/loss cases, two-device party testing, production service verification, and Apple sandbox purchase/restore tests. Native Simulator UI automation was unavailable; the native check was a build and launch smoke test, not a complete touch-interaction pass.

The screenshots in `qa/` show the actual running app. No marketing claims or invented player results were used as evidence.
