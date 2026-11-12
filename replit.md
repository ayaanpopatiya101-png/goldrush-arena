# GoldRush Arena

A 4-player air-hockey "last-one-standing" mobile game built with Expo SDK 54. Players deflect a ball to eliminate opponents. Completed eligible matches earn local XP and coins, with ranks, relics, skins, super abilities, an XP Trophy Road and a separate games-played reward lane.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — start Expo dev server (port via `$PORT`)
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- Expo SDK 54, React Native 0.81.5, TypeScript 5.9
- Navigation: Expo Router 6 (file-based, tab + stack)
- State: React Context (`PlayerContext`) + `AsyncStorage` (device-local only)
- Fonts: Barlow Condensed headings + Source Sans 3 body (OFL)
- Animations: React Native Animated API + `expo-haptics`
- Audio: Web Audio API (web-only, platform-guarded)
- Build: EAS Build (for App Store submission)

## Where things live

| Path | Purpose |
|---|---|
| `artifacts/mobile/app/(tabs)/` | Five primary tabs: Play, Events, Collection, Shop, Profile; contextual Rankings and Pass routes retained |
| `artifacts/mobile/app/` | Stack screens: Lobby, Game, Postgame, Gauntlet, Settings, Legal, Onboarding |
| `artifacts/mobile/context/PlayerContext.tsx` | Single source of truth: profile, XP, coins, skins, relics, supers, Trophy Road |
| `artifacts/mobile/components/GameArena.tsx` | Full game engine: physics, paddles, balls, power-ups, super abilities |
| `artifacts/mobile/app.json` | Expo config: bundle IDs (`com.goldrush.arena`), splash, permissions |
| `PRD.md` | Product Requirements Document with full App Store checklist |

## Architecture decisions

- **Progress is device-local, not all features.** AsyncStorage key `@goldrush_v3_{username}`. No authenticated player/cloud-save system. Parties, matchmaking, referrals, challenges and web purchases call the API server. Native digital purchases use RevenueCat/app stores; web checkout uses Stripe.
- **Supported online variants are server controlled.** Ranked/Casual use synchronized paddle inputs and ball state; Ranked waits for humans and Casual can fill labeled AI. Legacy unsupported modes and practice remain device-local bots. Private workshop rooms require four human clients and explicit agreement to immutable custom rules; never claim browser/protocol checks prove four physical humans played.
- **PlayerContext is the single store.** All game state (XP, coins, skins, relics, Trophy Road, supers) flows through one context + `save()` fn that persists atomically to AsyncStorage.
- **Expo Router file-based navigation.** Tabs live in `(tabs)/`, full-screen flows (game, postgame, settings, legal) are Stack screens registered in `app/_layout.tsx`.
- **Trophy Road bypasses rank gates.** Relics and skins earned via Trophy Road are added to `trophyUnlockedRelics[]` / `ownedSkins[]`, and `equipRelic` + `upgradeRelic` check both rank AND Trophy Road unlocks.
- **Audio:** Web Audio on web; native WAV playback uses expo-av. Keep platform guards and test global mute on device. expo-av deprecation is a future maintenance concern.

## Product

- **Core loop:** Play match → earn XP + coins → climb Trophy Road → unlock skins + relics → equip for next match
- **Game modes:** Classic, Rumble, Chaos, Six-Player, Gauntlet, Casual
- **Progression:** XP ranks (Iron → Legend), 25 Trophy Road milestones, Competitive Level 1–50, Season Pass, daily streak
- **Cosmetics:** 14 skins, 6 arena themes, 10 relics (each upgradeable to L10)
- **Supers:** 3 super abilities (Iron Wall, Slow Field, Banish) — charges during match, bots also use supers

## Release status

**Not App Store ready.** Current release gates and four-device test protocol are in `docs/arena/release-checklist.md`. Latest engineering evidence is `docs/arena/player-experience-verification.md`; human observations remain pending in `docs/arena/formative-playtest.md`.

Before submitting:
1. Replace placeholder App Store URLs in `app/settings.tsx` with real URLs
2. Add Privacy Policy URL to App Store Connect
3. Capture screenshots from TestFlight on a physical device
4. Validate a native pre-release build through the project's managed publishing flow; this task does not publish.

Key config in `app.json`:
- iOS bundle identifier: `com.goldrush.arena`
- Android package: `com.goldrush.arena`
- Deep link scheme: `goldrush://`

## Gotchas

- **Do NOT run `pnpm dev` at workspace root.** Run via Replit workflows or `pnpm --filter @workspace/mobile run dev`.
- **Results require a persisted award receipt for the active player.** URL numbers cannot manufacture a match. Missing session context shows recovery; the receipt totals also live in History.
- **Native audio warm-up:** On first launch, `useSoundFX` and `BackgroundMusic` write WAV files to `expo-file-system`'s cache directory. There is a brief delay on the very first note/hit — subsequent plays are instant (cached).
- **Rate button (Settings):** Uses `expo-store-review` for native in-app review. Shows a "coming soon" alert on web or before the app is published.
- Browser verification is not native-device evidence. Use the managed phone preview for development; store builds need their own device checks.
- Workshop presets are private to the existing guest credential, not linked by username. Local drafts are labeled separately from server saves. Custom rules run only in isolated practice/private rooms and never grant normal rewards. See `docs/arena/workshop.md`.
- In constrained workspaces, export platforms sequentially with `--max-workers 1`, separately from the browser pass. An interrupted concurrent export is not a passing build.

## User preferences

- The newest supplied Entry/Welcome and Main Lobby screenshot supersedes conflicting older palettes: blue-slate canvas, lighter slate panels, layered edges, restrained rounded raised controls, green primary actions, gold identity/rewards and condensed scoreboard headings.
- Preserve the explicit avoidance list except where that newer screenshot overrides it. Do not introduce decorative gradients, emoji UI, liquid glass, dot grids or invented live-player/season statistics.
- Preserve saved avatar strings, inventory IDs, reward values, prices, progression, lives-bank caps and hidden Relics/Forge migration data.
- Never force-push or rewrite Git history. Task work stays on its branch until merged; no production publishing from a task fork.
