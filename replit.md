# GoldRush Arena

A 4-player air-hockey "last-one-standing" mobile game built with Expo SDK 54. Players deflect a ball to eliminate opponents. The last player wins XP, coins, and climbs a deep progression system featuring ranks, relics, skins, super abilities, and a 25-milestone Trophy Road.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — start Expo dev server (port via `$PORT`)
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- Expo SDK 54, React Native 0.81.5, TypeScript 5.9
- Navigation: Expo Router 6 (file-based, tab + stack)
- State: React Context (`PlayerContext`) + `AsyncStorage` (device-local only)
- Fonts: `@expo-google-fonts/inter` (Inter 400/500/600/700)
- Animations: React Native Animated API + `expo-haptics`
- Audio: Web Audio API (web-only, platform-guarded)
- Build: EAS Build (for App Store submission)

## Where things live

| Path | Purpose |
|---|---|
| `artifacts/mobile/app/(tabs)/` | Tab screens: Home, Leaderboard, Profile, Shop, Inventory, Trophy Road |
| `artifacts/mobile/app/` | Stack screens: Lobby, Game, Postgame, Gauntlet, Settings, Legal, Onboarding |
| `artifacts/mobile/context/PlayerContext.tsx` | Single source of truth: profile, XP, coins, skins, relics, supers, Trophy Road |
| `artifacts/mobile/components/GameArena.tsx` | Full game engine: physics, paddles, balls, power-ups, super abilities |
| `artifacts/mobile/app.json` | Expo config: bundle IDs (`com.goldrush.arena`), splash, permissions |
| `PRD.md` | Product Requirements Document with full App Store checklist |

## Architecture decisions

- **All data is device-local.** AsyncStorage key `@goldrush_v3_{username}`. No servers, no auth, no network. Enables 100% offline play and simplifies privacy compliance.
- **PlayerContext is the single store.** All game state (XP, coins, skins, relics, Trophy Road, supers) flows through one context + `save()` fn that persists atomically to AsyncStorage.
- **Expo Router file-based navigation.** Tabs live in `(tabs)/`, full-screen flows (game, postgame, settings, legal) are Stack screens registered in `app/_layout.tsx`.
- **Trophy Road bypasses rank gates.** Relics and skins earned via Trophy Road are added to `trophyUnlockedRelics[]` / `ownedSkins[]`, and `equipRelic` + `upgradeRelic` check both rank AND Trophy Road unlocks.
- **Web Audio API for sound.** Guarded by `Platform.OS === 'web'` to avoid crashes on native. Native audio is a v1.1 task (requires `expo-av`).

## Product

- **Core loop:** Play match → earn XP + coins → climb Trophy Road → unlock skins + relics → equip for next match
- **Game modes:** Classic, Rumble, Chaos, Six-Player, Gauntlet, Casual
- **Progression:** XP ranks (Iron → Legend), 25 Trophy Road milestones, Competitive Level 1–50, Season Pass, daily streak
- **Cosmetics:** 14 skins, 6 arena themes, 10 relics (each upgradeable to L10)
- **Supers:** 3 super abilities (Iron Wall, Slow Field, Banish) — charges during match, bots also use supers

## App Store Submission (see PRD.md for full checklist)

Before submitting:
1. Replace placeholder App Store URLs in `app/settings.tsx` with real URLs
2. Add Privacy Policy URL to App Store Connect
3. Capture screenshots from TestFlight on a physical device
4. Run `eas build --platform all --profile production`

Key config in `app.json`:
- iOS bundle identifier: `com.goldrush.arena`
- Android package: `com.goldrush.arena`
- Deep link scheme: `goldrush://`

## Gotchas

- **Do NOT run `pnpm dev` at workspace root.** Run via Replit workflows or `pnpm --filter @workspace/mobile run dev`.
- **AsyncStorage delete bug:** `deleteAccount()` uses the old key `@goldrush_player_{username}` instead of `@goldrush_v3_{username}`. Fix before launch.
- **Postgame refresh guard:** if `params.won` is missing on load (hard-refresh on web), the screen redirects to `/` to prevent a blank zero-stats display.
- **Audio on native:** Web Audio API calls are guarded by `Platform.OS === 'web'`. On iOS/Android, music and SFX are silently skipped until `expo-av` is integrated.
- **EAS Build required** for any real device testing or App Store submission. `expo start` only serves the dev bundle.

## User preferences

- Keep the dark space/arena aesthetic throughout all screens
- Gold (#C8820A / #FFD700) as the primary accent color
- Inter font family across all text
- Push code to GitHub after every significant feature: `git push github main --force`
