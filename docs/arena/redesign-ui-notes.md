# Redesign UI notes

Design passes 1 and 2. Only `pnpm --filter @workspace/mobile run typecheck` was run (passes). No browser, device or screenshot verification was performed by the design agent.

## Shared system
- `constants/colors.ts`: brief tokens (bg #14231F, raised #20372F, secondary #294239, text #EEE7D7, secondary text #B8C3B6, gold #D7A83B, on-gold #18221C, error #CE7863, success #9BB77A). Computed contrast: text/bg about 13:1, secondary/bg about 8.9:1, on-gold/gold about 8:1. Seat colors and catalog colors unchanged.
- `components/ui/Primitives.tsx`: `Shell` (1160 wide / 720 prose, 18px gutters), `gridItemWidth(available, minCard, gap)`; sm buttons and icon buttons 44px.
- `components/ui/BrandMark.tsx`: SVG court mark (four edge paddles, brass puck, your seat solid brass).

## Screens changed
- Tabs layout: onboarding auto-route removed; five tabs Play, Events, Collection, Shop, Profile; `leaderboard` and `trophyroad` hidden routes.
- Home: header with Ranks / Season pass / Settings entries. Play panel (mode name, description, rules chip, opponent type, rank effect, locked requirement, Play) placed first on phones and beside the arena preview at >= 900px. Compact initial choices (match + solo modes); variants and elite modes in an expandable "All modes" section. Real `GameArena` practice preview gains a user Pause/Resume control in addition to the existing focus pause and reduced-motion gate. Locked modes no longer fade text. Inside `Shell`.
- Shop: skin cards get explicit width from `gridItemWidth` (no stretched last row); "Tap to equip" header replaced with "Owned skins equip on tap"; unowned cards show price, owned show "Owned · tap to equip" (owned tap really equips), pass-exclusive shows "Locked · Premium pass tier". Content inside `Shell`. Purchase logic untouched.
- Collection (`inventory.tsx`): title "Collection"; collapsed owned-skin card fixed (HolographicShimmer wrapper with no width replaced by an explicit-width outer View, inner card 100%); strike cards explicit widths; Equip button 44px with accessible name. Inside `Shell`.
- Onboarding: rebuilt. Wide: live engine demo left, opaque entry panel right. Phone: brand, panel, demo. Tabs "New player" / "Saved players"; inline name validation; 7 distinct emblems (dragon removed because it renders the same glyph as lion; saved strings untouched) and 5 colours, all with accessible names; preview card; inline delete confirmation (works on web, unlike Alert); device-local storage disclaimer; separate Terms and Privacy links open inline and return with name/emblem/colour preserved.
- Legal: `LegalDocument` shared component, prose `Shell`, paragraph splitting, readable 16px body, tabs, back falls back to Home on direct link. Pre-release footer kept.
- Not-found: branded recovery with Return home.
- Profile, Events, Leaderboard, Settings: content wrapped in `Shell` (centered max width; Settings uses prose width). Their inner styling is not yet rebuilt.

## Not done / limitations
- Profile, Events, Leaderboard, Shop and Collection still use legacy effects imports (GlowText, FloatingOrbs, LinearGradient wrappers) and hardcoded old hex values internally.
- Shop themes/power-ups/extras/store tabs not restyled; theme unavailable state, purchase state messaging unchanged.
- Pass/Trophy Road duplicate headings and season source unification not done.
- Lobby, arcade, challenge, clips routes, settings grouping not done.
- Wide-screen compact header/navigation (tabs still bottom bar on desktop).

## Pass 3 (round 3)

Done, typecheck clean, not visually verified (no browser run):
- arcade.tsx and challenge.tsx rebuilt (completed-match receipt, pause dialog, link validation, loading/error/expired states).
- clip-viewer: explicit loading skeleton and "No clip to show" recovery state for missing/invalid/failed clips (no router.back, no "Fresh clip"); tools and rewards are not rendered in that state. Web shows a "sharing needs the app" note and no share button or reward. Copy no longer claims external upload.
- my-clips rebuilt: visible Delete with inline Keep/Delete confirmation, loading, error with retry, empty state, frames-missing clips disabled.
- match-highlights: events without frames filtered; honest in-memory empty state; safe back.
- lobby: "Match setup", bot-truthful status copy, collapsible rules first, lives bank only when usable, no glow shadows, centred 760 column, safe leave.
- Leaderboard: tabs relabelled as demo, banner "Demo data, not live player rankings", no "Global #" claim.
- One season source: constants/season.ts (Season 1, no fake end date) used by leaderboard, splash and live banner.
- Pass/map: triple-layer 3D titles reduced to one Text (removed duplicate headings read by screen readers).
- Shop themes: "Unavailable in this build", prices hidden. Collection themes: non-interactive Unavailable label, honest empty/hint copy.
- Settings grouped Account, Audio, Accessibility, Controls (incl. haptics and lobby rules), Legal & Support (About merged).
- Desktop (>=900px): tab bar moves to top with icon+label items, centred to 1160.
- Old hex colours mapped to palette values across app/ and components/ (literal per-colour mapping).

Known gaps:
- game.tsx, postgame.tsx, gauntlet.tsx only received the palette mapping; layout not restyled. Logic untouched.
- PLAYER_COLORS in constants/colors.ts and TutorialOverlay/onboarding-flow keep old hex values (out of scope or gameplay identity).
- Emoji glyphs still appear in clip stickers, lives bank and strike tiers.
- Lobby rules collapse defaults open; it does not read the showLobbyRules setting.

## Pass 4 (round 4)

Typecheck clean. Not visually verified by the design agent.
- game.tsx: the court fits both width and height (max 560). The HUD is grouped above the court: pause, mode, timer, pucks, capture and music. A scoreboard highlights YOU. A persistent "YOU · name · South paddle" row shows lives. The power-up legend reads SHD Shield, SPD Speed, SHK Shrink rivals, +1 Life, MLB Multiball (the old legend wrongly said +3L). Physics are unchanged.
  - Web hint: drag to move; Esc or P pauses (input is pointer drag only).
  - Opaque pause modal: Resume is focused on web, and the Exit button explains its effect. Exiting is not recorded and earns no XP or coins; in a gauntlet, bank lives are not refunded.
  - hasGameConfig recovery screen. The out-of-lives note is gauntlet-aware.
- lobby.tsx: hasGameConfig recovery after hooks, with a guard in the matchmaking focus effect. The rules panel's initial state comes from settings.showLobbyRules.
- postgame.tsx: outcome, stats and Play again / Home / Share / Challenge / highlights sit above the fold. The "What this match changed" card separates three things:
  - Account XP and XP rank (casual and ranked).
  - Competitive level (ranked only; casual shows unchanged).
  - Season 1 pass points (the current total). Matches do not add pass points directly; points come from claiming quests.
  - Emoji glyphs replaced by Feather icons. The reaction strip is kept and labelled as local only. Decorative orbs, confetti and shimmer were removed.
- gauntlet.tsx: a lost round reads "Round lost" with "The run continues". "Eliminated" and "Defeated" wording is removed.
  - Next round (variant icon and rules) and Start appear first, then run standings (x/5, leading, YOU highlighted) and run totals.
  - The 3× multiplier and the saved-as-ranked behaviour are stated.
- clip-viewer (loaded): 720 max column, palette, no gradients, Feather tool icons, 44px+ targets. Trim seconds are shown only on native, where capture is confirmed at 3 fps; web shows frames only (it previously used a wrong /4 estimate).
  - Share labels: "Open share sheet". The reward copy says it is granted after the share sheet closes; there is no upload claim.
- Home mode copy: casual earns account XP (which counts toward XP rank) and leaves competitive level unchanged. The gauntlet description now gives the real end rule.
- Shop:
  - Season Pass desc: truthfully states that it records ownership only (seasonPassPurchased gates nothing in the UI).
  - Battle Pass Premium desc: no unverified 2×/5× claims.
  - Both labels use CURRENT_SEASON. Entitlement code is unchanged.
- ShareCard: the trophy emoji is replaced by "(new)".

Remaining notes:
- GameArena GOAL_EMOJIS state is populated but not rendered (dead state, left alone).
- Data emoji (shop products, trophy rewards, rank icons) render through Glyph as line icons; the stored strings are unchanged.
- External/native blockers: native share sheet and capture can only be tested on a device (expo-sharing, view-shot); store purchases need the real store and Stripe environments.
