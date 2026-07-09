# ⚡ GoldRush Arena

> A fast-paced 4-player air-hockey mobile game. Deflect the ball, eliminate opponents, earn XP, and climb through 23 ranks.

Built with **Expo SDK 54** · Runs on **iOS, Android, and Web** · 100% offline — no account needed.

---

## What is it?

GoldRush Arena is a last-one-standing arcade game. You control a paddle on one wall of the arena. A ball bounces around — let it past your paddle and you're out. The last player standing wins coins and XP.

Every match feeds into a deep progression system: ranks, skins, relics, super abilities, a 25-milestone Trophy Road, and time-limited events.

---

## How to run it locally

**Prerequisites:** Node.js 18+, pnpm, Expo Go app on your phone (optional)

```bash
# 1. Install dependencies
pnpm install

# 2. Start the dev server
pnpm --filter @workspace/mobile run dev
```

Then scan the QR code in Expo Go, or press **W** to open in your browser.

---

## Game modes

| Mode | What makes it different | XP bonus |
|---|---|---|
| Classic | Standard 4-player match | — |
| Rumble | Faster ball speed | +20% |
| Chaos | Multiple balls at once | +50% |
| Six-Player | 6 paddles, 6 walls | +75% |
| Gauntlet | 3-round tournament | +200% |
| Casual | No rank impact | −20% |

---

## Progression overview

### Ranks (23 total)
Iron → Bronze → Silver → Gold → Platinum → Diamond → Master 1–3 → Legend 1–3 → Recruit → Private → Corporal → Sergeant → Lieutenant → Commander → **General 1–3** → Spartan 1–3

Each rank unlocks new skins, arenas, and features. **General 1** (340,000 XP) unlocks competitive Events.

### Trophy Road
25 milestones earned by playing matches. Each milestone gives a free skin, relic, coins, or XP boost.

### Relics
10 relics, each upgradeable to Level 10. Equip one before a match to get a passive bonus (e.g. extra lives, ball speed, shield).

### Supers
3 super abilities that charge during a match:
- **Iron Wall** — temporary invincible barrier
- **Slow Field** — slows the ball for opponents
- **Banish** — temporarily removes an opponent's paddle

### Events (General 1+ only)
| Event | Resets | Plays |
|---|---|---|
| Weekly Challenge | Every Monday | 5/week |
| Monthly Cup | Opens the **28th** of each month | 3/month |
| Annual Grand Prix | Opens **October 28th** each year | 2/year |

Events award bonus XP, coins, and **Credits** (used in the Forge shop).

---

## Project structure

```
artifacts/
└── mobile/
    ├── app/
    │   ├── (tabs)/          ← Tab screens (Home, Shop, Events, Trophy Road…)
    │   ├── game.tsx         ← In-match screen
    │   ├── postgame.tsx     ← Results + rewards screen
    │   ├── lobby.tsx        ← Pre-match setup
    │   └── settings.tsx     ← App settings
    ├── components/
    │   └── GameArena.tsx    ← The entire game engine (physics, AI, supers)
    ├── context/
    │   └── PlayerContext.tsx ← All player state (XP, coins, skins, relics…)
    └── store/
        └── gameSession.ts   ← Temporary match config passed between screens
```

---

## Tech stack

| What | How |
|---|---|
| Framework | Expo SDK 54, React Native 0.81.5 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router 6 (file-based) |
| Storage | AsyncStorage — device-local, no server |
| Fonts | Inter (via `@expo-google-fonts/inter`) |
| Animations | React Native Animated API + `expo-haptics` |
| Audio | Web Audio API (web only; native audio coming in v1.1) |
| Build | EAS Build for App Store / Play Store |

**All data is stored on-device.** No account, no login, no internet required to play.

---

## Building for the App Store

```bash
# Production build (both platforms)
eas build --platform all --profile production
```

**Before submitting, make sure to:**
1. Replace the placeholder Privacy Policy URL in `app/settings.tsx`
2. Add your Privacy Policy link in App Store Connect
3. Capture real screenshots from a physical device via TestFlight
4. Confirm bundle IDs match your Apple/Google developer accounts

| Config | Value |
|---|---|
| iOS Bundle ID | `com.goldrush.arena` |
| Android Package | `com.goldrush.arena` |
| Deep link scheme | `goldrush://` |

---

## Known issues to fix before launch

| Issue | Where | Fix |
|---|---|---|
| Delete account uses old storage key | `PlayerContext.tsx` → `deleteAccount()` | Change key from `@goldrush_player_{user}` to `@goldrush_v3_{user}` |
| Audio silent on iOS/Android | Everywhere | Integrate `expo-av` for native audio |
| App Store URLs are placeholders | `app/settings.tsx` | Replace with real URLs after publishing |

---

## Design rules

- Dark space / arena aesthetic on every screen
- Gold (`#C8820A` / `#FFD700`) as the primary accent
- Inter font family everywhere
- Haptics on all significant actions

---

## Commands reference

```bash
pnpm --filter @workspace/mobile run dev        # Start dev server
pnpm --filter @workspace/mobile run typecheck  # Type-check mobile app
pnpm run typecheck                             # Type-check entire workspace
```

> **Do not** run `pnpm dev` at the workspace root — it has no dev script by design.
