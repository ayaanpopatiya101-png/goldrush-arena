# Reference style audit (Slate Arcade)

Reference: attached_assets/image_1794539179239.png. No design-system artifact exists; tokens live in constants/colors.ts.

## Shared changes (all consumers)
- typography.ts: display/displayMedium now SourceSans3_700Bold (bold friendly sans like reference); scale reduced to fit 375px.
- Primitives: SectionLabel decorative rule removed; button/stat/title sizes and tracking retuned for wide sans; ScreenTitle auto-fits.
- Tab bar: selected plate edge uses primary/primaryEdge tokens (removed stray #4E9A2A).

## Route/component sweep (source-searched, styles edited where found)
- Hardcoded BarlowCondensed strings replaced with fonts.display in: inventory, trophyroad, shop, profile, settings, lobby, game, gauntlet, postgame, clip-viewer, match-highlights, trophyroad-map, progression (AchievementGrid, BattlePassTrack, QuestList, RewardInspector, TrophyRoadPath), LimitedOffers, CinematicSplash, RankCeremonyOverlay, ShareCard.
- All display text >=30px scaled ~0.85 and wide tracking capped (events, challenge, gauntlet, postgame, onboarding kit/Steps, LiveMatchView, CompetitionPanels, ShopCatalog wallet, CustomRoomPanel, splash).
- Square framed plates rounded: SmsReminderPanel (gate, number row, input, confirm, event, options, badge, checkbox), CompetitionPanels division plate, BackgroundMusic button.
- Decorative divider rules removed: ShopCatalog, LimitedOffers.
- Hex sweep: no superseded surface hexes remain outside the exceptions below.

## Remaining exceptions (intentional)
- inventory.tsx arena preview swatches, paddle-studio PRESETS, RelicCharacter art, PLAYER_COLORS: user cosmetics.
- game.tsx BOT_COLORS / MODE_COLORS / power-up colors, lobby friend colors: gameplay/seat semantics.
- ui/Flat.tsx: legacy hex -> token remapper.
- Court/effects/GameArena small radii (dots, paddles): gameplay geometry.
- Multi-line style objects were reviewed by search only, not every one line-by-line.
