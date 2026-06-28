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

## Expo web preview: no direct URL deep-linking
Screenshotting/navigating to a route like `/lobby` or `/game` directly in the Expo web preview falls back to the home screen — expo-router routes here are only reachable via in-app navigation (on-screen buttons + bottom tab bar). When e2e-testing or screenshotting, drive the real UI flow (tap play → lobby → start); don't rely on deep links.

## Bot difficulty curve (training → rank-based)
- `NEW_PLAYER_GAMES = 5`, `RAMP_GAMES = 10` constants in `game.tsx`.
- Games 0–4: `botSkill = 0`, `botDifficulty = 'easy'` always (training window).
- Games 5–14: `botSkill = rankSkill * ramp` where `ramp = (totalGames - 5) / 10`. Smooth climb, not a cliff.
- Games 15+: `botSkill = playerRankIdx / MAX_RANK_INDEX` (full rank-based); `botDifficulty` = casual→easy, ranked→normal.
- Lobby shows green "🎓 TRAINING · N left" badge when `totalGames < 5`.

## Relic character leveling system (Brawl-Stars style)
- `RELIC_MAX_LEVEL = 10`. Upgrade costs: [50, 100, 200, 400, 800, 1500, 2500, 4000, 6000] (L1→L2 through L9→L10).
- `getRelicLevel(profile, relicId)` reads `profile.relicLevels?.[relicId] ?? 1` — optional field, migration-safe.
- `getScaledRelicEffect(relicId, level)` returns leveled-up `RelicEffect` via `lerpR(a, b, level)`. Binary bonuses unlock at L5/L10.
- `upgradeRelic(relicId)` in PlayerContext deducts coins + increments `relicLevels[id]`. Returns `false` if insufficient coins or already maxed.
- `game.tsx` passes `getScaledRelicEffect(relic.id, getRelicLevel(profile, relic.id))` to GameArena — level-scaling is applied at the game entry point, not inside GameArena.
- Character SVG art lives in `components/RelicCharacter.tsx`. Each character drawn in a 100×120 viewBox with `react-native-svg`. Inventory shows 2-column grid with portrait (130px tall), level badge, 10-segment power bar, and UPGRADE button.

## Relics / Maps / bot-scaling (rank-gated game modifiers)
- `RelicEffect` is applied to a `PlayerRef` at mount via `applyRelicToPlayer`; bots get a rank-appropriate relic via `relicForRank(rank, botId)` (pool indexed by `botId % pool.length`, so it's an unlock bound, not escalating power).
- **Defense-in-depth:** `game.tsx` re-validates `unlockRankIndex <= playerRankIdx` for both relic and map before passing into `GameArena` — UI gates aren't trusted alone. Any new rank-gated modifier should do the same final check.
- Caps that exist for balance: paddle length 1.25×, `deflectBoost` 1.3×, `botAccuracy` 0.97, bot speed `0.7+0.4*skill`. Don't remove these silently.
- Duel-mode rendering must reference `duelBottomPlayer`/`duelTopPlayer` (not `gs.players[BOTTOM/TOP]`) for paddle width/transform/shield, or a spectated bot-vs-bot duel shows the wrong paddle length/shield.
