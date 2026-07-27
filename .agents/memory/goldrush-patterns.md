---
name: GoldRush Arena patterns
description: Storage keys, GameArena props, PlayerContext API, and implementation sharp edges for the GoldRush Arena mobile game.
---

## Storage keys
- Current user session: `@goldrush_current`
- All accounts list: `@goldrush_accounts`
- Per-user profile: `@goldrush_v3_${username}`
- Settings: `@goldrush_settings_v1`

## GameArena props added
New optional props (all have defaults so existing callers don't break):
- `sensitivity: number` (0.6 | 1.0 | 1.5) — scales paddle input around arena center
- `onActiveBallsChange: (count: number) => void` — fires when live ball count changes
- `botDifficulty: 'easy' | 'normal'` — easy = 0.62× speed + 2.2× inaccuracy
- `onGameStart: () => void` — fires once when the countdown finishes and play begins
- `paused: boolean` — freezes RAF loop (skips simulation); game.tsx sets this via AppState listener on app-background

## Native audio (expo-av + expo-file-system v57)
- expo-file-system v57 uses class-based API: `new File(Paths.cache, 'name.wav')`, `file.write(Uint8Array)`, `file.exists` (boolean property), `file.uri` (string). No `FileSystem.cacheDirectory` or `writeAsStringAsync`.
- `useSoundFX.ts` generates mono 16-bit 22050 Hz WAV bytes on-device and caches to `Paths.cache`. Synchronous write, async playback via `Audio.Sound.createAsync`.
- `BackgroundMusic.tsx` does the same for melody notes. Both are Platform-guarded (native path only).
- `prewarmNativeAudio()` exported from `useSoundFX.ts` — call at game screen mount to pre-write all WAV files before the first hit sound fires.

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

## Champion's Gauntlet mode
- `gauntletSession.ts` — module-level store (same pattern as gameSession.ts). `startGauntlet()` shuffles 7 variants + 3 bots, returns first variant. `recordRoundResult(won, xp, coins)` increments wins/roundNumber, returns `{gauntletWon, gauntletOver}`. Call `getGauntletState()` AFTER `recordRoundResult` to get updated roundNumber.
- MatchType `'gauntlet'` added to `gameSession.ts`. `getDifficultyMultiplier` returns 3.0× for gauntlet.
- `handleGameOver` in `game.tsx` has a gauntlet branch: calls `recordRoundResult`, awards +1500 XP/+300 coins champion bonus if gauntletWon, routes to `/gauntlet` screen with params.
- `/gauntlet` hub screen shows: round result banner, scoreboard (player + 3 bots with win dots), next variant card or champion/defeat end state.
- Diamond+ lock: `playerRankIdx < 5` (Diamond = index 5) on home screen card; locked card shows lock UI.
- Lobby badge handles 'gauntlet' matchType: shows "⚔️ GAUNTLET · Round N" in gold.

## Rank system (20 ranks, MAX_RANK_INDEX = 19)
- Bronze 1-3 (0-2) → Silver 1-3 (3-5) → Gold 1-3 (6-8) → Diamond 1-3 (9-11) → Master 1-3 (12-14) → Champion 1-5 (15-19)
- Champion = top-100 leaderboard tier. XP: Bronze1=0 → Champion5=370k.
- RELICS spread: ironhide=0, longarm=2, quicksilver=3, secondwind=5, prospector=6, aftershock=9, timewarp=11, bulwark=12, phoenix=14, midas=15.
- EVENT_MIN_RANK_INDEX = 12 (Master 1). Gauntlet gate = 9 (Diamond 1).
- RankBadge now shows tier emoji (🥉/🥈/🥇/💎/⚡/👑/🏆) + pip with level number.
- Elite gates: storm_surge=12 (Master 1), ghost_protocol=15 (Champion 1), warlord=17 (Champion 3).
- trophy_road_bg.png copied to assets/images/ and used as background in trophyroad.tsx.

## Elite rank-gated modes (Storm Surge / Ghost Protocol / Warlord)
- Three new premium variants added to `VARIANT_PROPS` in game.tsx + `GameVariant` type in gameSession.ts.
- `maxSkillBots: boolean` — game.tsx-only flag; extracted before mergedCfg spread so TypeScript doesn't reject it on the GameArena JSX. Forces `effectiveBotSkill = 1.0`.
- `phantomBalls: boolean` — GameArena prop; drives a `ballsVisible` state toggled by a 1500 ms interval; ball opacity becomes 0 during invisible phase.
- `playerBonusLives: number` — GameArena prop; added to `gs.players[BOTTOM].lives` at init after the bot-skill loop and before `setLivesState`.
- Multipliers in `getDifficultyMultiplier`: storm_surge=2.0, ghost_protocol=3.0, warlord=5.0.
- Rank gates: storm_surge `playerRankIdx < 5` (Master 1+), ghost_protocol `< 8` (Legend 1+), warlord `< 17` (General 1+).
- Home screen: `handlePlayEliteMode` uses `matchType: 'ranked'` (affects rank/XP). Cards rendered as a stacked IIFE section between Gauntlet and Extra Modes.

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
- `upgradeRelic(relicId)` in PlayerContext deducts coins + increments `relicLevels[id]`. Returns `false` if insufficient coins or already maxed. Checks `trophyUnlockedRelics` — trophy-road unlocks bypass rank gates for both equip AND upgrade.
- `game.tsx` passes `getScaledRelicEffect(relic.id, getRelicLevel(profile, relic.id))` to GameArena — level-scaling is applied at the game entry point, not inside GameArena.
- Character SVG art lives in `components/RelicCharacter.tsx`. Each character drawn in a 100×120 viewBox with `react-native-svg`. Inventory shows 2-column grid with portrait (130px tall), level badge, 10-segment power bar, and UPGRADE button.

## Relics / Maps / bot-scaling (rank-gated game modifiers)
- `RelicEffect` is applied to a `PlayerRef` at mount via `applyRelicToPlayer`; bots get a rank-appropriate relic via `relicForRank(rank, botId)` (pool indexed by `botId % pool.length`, so it's an unlock bound, not escalating power).
- **Defense-in-depth:** `game.tsx` re-validates `unlockRankIndex <= playerRankIdx` for both relic and map before passing into `GameArena` — UI gates aren't trusted alone. Any new rank-gated modifier should do the same final check.
- Caps that exist for balance: paddle length 1.25×, `deflectBoost` 1.3×, `botAccuracy` 0.97, bot speed `0.7+0.4*skill`. Don't remove these silently.
- Duel-mode rendering must reference `duelBottomPlayer`/`duelTopPlayer` (not `gs.players[BOTTOM/TOP]`) for paddle width/transform/shield, or a spectated bot-vs-bot duel shows the wrong paddle length/shield.

## Battle Pass system
- Points-based: BPP earned by claiming quest rewards (daily 50, weekly 200, seasonal 500)
- 50 tiers × 100 BPP each; free + premium track side-by-side in horizontal scroll
- New profile fields: battlePassPoints, battlePassClaimed[], battlePassPremiumClaimed[], battlePassPremiumOwned, battlePassSeason, dailyQuestProgress/weeklyQuestProgress/seasonalQuestProgress, dailyQuestClaimed/weeklyQuestClaimed/seasonalQuestClaimed, lastDailyReset/lastWeeklyReset
- Quest progress auto-tracked in addMatchResult (games/wins/deflections/ranked_wins/win_streak/relics_owned)
- Daily quests reset on load if new day; weekly reset if new week
- 2 exclusive seasonal skins: season_aurora (slot 25 premium), season_phantom (slot 45 premium)
- Tier 50 free: 1 Ultra Drop (legendary lucky block); premium: 5 Ultra Drops
- Premium pass activates via redeemCode with rewardType='battle_pass' (Stripe product seeded)
- Screen at artifacts/mobile/app/(tabs)/trophyroad.tsx — tab icon changed from "map" to "gift"

## Stripe payments architecture
- Products seeded in Stripe via code_execution (listConnections key is `settings.secret`, not `settings.secret_key`)
- `stripe-replit-sync` runMigrations has no `schema` param; stripe.* DB tables not created — do NOT use StripeSync for the store
- Products/prices are fetched live from Stripe API (`GET /api/store/products`) — more reliable than DB sync
- Purchase flow: Buy → Stripe checkout → webhook creates `GR-XXXXXX-XXXX` code in `purchase_codes` table → success page shows code → user REDEEMs in-game
- `purchase_codes` table in public schema (not stripe schema): code PK, reward_json, used bool, created_at
- `redeemCode` in PlayerContext handles GR- prefix codes via API call to `/api/store/verify-code`
- Webhook (`/api/stripe/webhook`) must be registered BEFORE `express.json()` in app.ts
- `STRIPE_WEBHOOK_SECRET` env var needed for webhook signature verification in production

## Premium UI design system (Brawl Stars polish level)
- **Background pattern** (all tab screens): `LinearGradient ['#0B0D14', '#07090F']` base + `LinearGradient ['#C8820A10'/'#C8820A14', 'transparent']` gold top glow at height 260-280.
- **Font rule**: ALL bold text uses `fontFamily: 'Inter_700Bold'` or `'Inter_600SemiBold'`. Zero `fontWeight: '600'/'700'/'800'/'900'` remain.
- **Section header pattern** (all screens): `View {width:3, height:16, backgroundColor:COLOR, borderRadius:2}` + `Text {Inter_700Bold, fontSize:12, letterSpacing:2, color:COLOR}` + `View {flex:1, height:1, backgroundColor:'#FFFFFF0E'}` flanking line.
- **Stat card top accent strip**: `position:'absolute', top:0, left:0, right:0, height:3, backgroundColor:color` + `overflow:'hidden'` on parent + value at `fontSize:28 (home) / 24 (profile)` + label `fontFamily:Inter_700Bold, fontSize:8, letterSpacing:1.5, color:color+'AA'`.
- **Coin badge standard**: `backgroundColor:'#C8820A1A', borderRadius:12, borderWidth:1, borderColor:'#C8820A44', paddingHorizontal:10, paddingVertical:6` + text `color:'#FFB830', fontFamily:Inter_700Bold, fontSize:14-15`. Used in home header, shop header, inventory header.
- **Header title standard**: `fontFamily:Inter_700Bold, fontSize:24, letterSpacing:2` (shop, inventory). Home uses 16px player name; leaderboard/profile/trophyroad use larger display sizes.
- **All Pressables**: scale `0.95` on press via `transform:[{scale: pressed ? 0.95 : 1}]`. Applied to extra mode cards, shop mode tabs, map cards.
- **Postame stat values**: `fontSize:28` + `letterSpacing:1.5` label, Inter_700Bold.
- **Play Again button** (postgame): `borderRadius:16, paddingVertical:18, fontSize:17, shadowOpacity:0.5, shadowRadius:14` — strong gold shadow.
- **Leaderboard rows**: `paddingVertical:12, paddingHorizontal:12, borderRadius:12` + avatar `width:36, height:36, borderRadius:18, borderWidth:2` + name `Inter_700Bold, fontSize:14`.
- **Podium**: avatar 46px, pos number 24px, block borderRadius:10.
- **YOUR RANK mini-stats**: `fontSize:22, letterSpacing:1.5` (Inter_700Bold labels).
- **XP bar standard**: `height:8, borderRadius:4` + shine overlay `height:'50%', backgroundColor:'#FFFFFF28'`.
