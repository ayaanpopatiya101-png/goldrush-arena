---
name: GoldRush Arena patterns
description: Storage keys, GameArena props, PlayerContext API, and implementation sharp edges for the GoldRush Arena mobile game.
---

## Storage keys
- Current user session: `@goldrush_current`
- All accounts list: `@goldrush_accounts`
- Per-user profile: `@goldrush_v3_${username}`
- Settings: `@goldrush_settings_v1`

## GameArena props added this session
New optional props (all have defaults so existing callers don't break):
- `sensitivity: number` (0.6 | 1.0 | 1.5) — scales paddle input around arena center
- `onActiveBallsChange: (count: number) => void` — fires when live ball count changes
- `botDifficulty: 'easy' | 'normal'` — easy = 0.62× speed + 2.2× inaccuracy
- `onGameStart: () => void` — fires once when the countdown finishes and play begins

## PlayerProfile fields added
- `competitiveLevel: number` (1–50)
- `highestLevel: number`
- `ownedThemes: string[]`
- `currentArenaTheme: string`

## Sensitivity implementation
`cx + (x - cx) * sensitivityRef.current` — scales finger position around arena center, so sensitivity < 1 narrows range, > 1 widens it. Applied in both `onPanResponderGrant` and `onPanResponderMove`.

## calcLevelDelta
`casual` → 0 delta always. Ranked: position 1 = +2, position 2 = 0, else = −1. Capped 1–50.

## Animated `_value` access
GameArena duel mode needs the current animated value for collision detection. `Animated.Value.__getValue()` doesn't exist in the TS types; use `(anim as unknown as { _value: number })._value` instead.

## COLOR_BOARD_COLORS vs COLOR_BOARD_TINTS
The array was renamed from `COLOR_BOARD_TINTS` (semi-transparent strings) to `COLOR_BOARD_COLORS` (full-opacity hex). Dynamic opacity is applied separately in the overlay using `opacity: cbOpacity`. Any reference to the old name will cause a runtime error.

## useColors.ts cast
The `colors as Record<...>` cast must use `as unknown as Record<...>` due to the `radius` field being a number rather than a color-token object.

## Extra lives (once per match)
`extraLifeUsed` is a `useRef<boolean>` in `game.tsx`. When triggered it calls `grantExtraLifeRef.current?.()` three times (not once). The ref is never reset between mounts because the game screen is replaced on game-over.
