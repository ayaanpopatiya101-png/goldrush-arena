# GoldRush ranked leaderboard

## Reference and adaptation

Riot's official [Immortal and Radiant guide](https://support-valorant.riotgames.com/hc/en-us/articles/4405964120339-Rank-Rating-RR-for-Immortal-and-Radiant-Ranks)
describes regional, rank-filterable ladders with position, rating, wins, player identity,
optional anonymity and a competitive game every seven days. Its Radiant rank also
requires a regional rating threshold and a top-500 position.

GoldRush adapts the leaderboard features, not Riot assets or its proprietary rating.
This app is a four-player paddle game with an existing pairwise Elo-style rating.
Copying shooter rank thresholds would not establish a meaningful GoldRush skill level.

## Shipped behavior

- Ranks contains a global Top 500, season selector, division filter, submitted
  nickname search, 25 rows per page, refresh and 30-second polling.
- Overall personal position is calculated before search, division and Top-500 filtering.
- Five verified four-human ranked games qualify a player. Bot, casual and private
  custom games cannot qualify or refresh activity.
- The current season requires a verified ranked result within seven days.
  Inactivity hides position without deleting or decaying saved rating.
- Past UTC-calendar-month seasons use their recorded rating and do not apply
  current activity requirements.
- Order: rating descending, wins descending, games ascending; exact ties share
  position. A stable internal tie-breaker bounds the published list to 500 rows.
- Anonymous by default. Public names are independent, explicitly saved nicknames,
  not automatic publication of device-local usernames.
- Names permit 2–24 letters/numbers, spaces, dots, hyphens and underscores.
  Validation prevents markup but is not an abuse/profanity moderation service.
- No private photo, internal player ID, credentials or device-local balance is
  published. A profile preference changes only its own JSON key so concurrent
  purchases and custom presets are preserved.
- Existing service XP, placement logic, season history, legacy achievements and
  gameplay rating calculation remain unchanged.

## Deliberate differences

One global ladder is truthful while matchmaking has no verified regional divisions.
There are no invented regional competitors or fake population counts. Players
outside the Top 500 can still see their full-ladder position.
There is no copied Radiant title, regional threshold, Riot player card or ranked
reward purchase. A ladder position does not grant currency or entitlements.

## Verification

- `pnpm --filter @workspace/api-server test:leaderboard`
- `pnpm --filter @workspace/api-server test:leaderboard-api`
- `pnpm --filter @workspace/mobile typecheck`
- `pnpm --filter @workspace/mobile test:reliability`

API integration fixtures use isolated temporary identities in development and
delete their own records on completion. Never run fixture-writing tests against production.
Browser/native export builds establish build compatibility, not four-human device
playtesting or full interactive browser verification.
