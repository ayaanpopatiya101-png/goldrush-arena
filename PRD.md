# GoldRush Arena — Product Requirements Document

**Version:** 1.0.0  
**Last updated:** July 2026  
**Status:** Ready for App Store submission

---

## 1. Product Overview

GoldRush Arena is a fast-paced, 4-player air-hockey "last-one-standing" mobile game built with Expo SDK 54. Players control paddles to deflect a ball and eliminate opponents. The last player standing wins coins and XP, which unlock cosmetics, relics, and progression milestones on the Trophy Road.

The game is designed for **quick sessions (2–5 minutes)**, is fully **offline-first** (no internet required to play), and stores all progress locally on the device.

---

## 2. Target Audience

| Segment | Description |
|---|---|
| **Core** | Mobile gamers aged 13–30 who enjoy Brawl Stars, Clash Royale, and arcade games |
| **Casual** | Anyone who wants a fun 5-minute session with friends watching |
| **Competitive** | Players who chase leaderboards, ranks, and trophy progression |

---

## 3. Core Gameplay Loop

```
Start Match → Deflect Ball → Eliminate Opponents → Win / Place
     ↓               ↓                                   ↓
  Earn XP        Earn Coins                     Post-Game Screen
     ↓               ↓                                   ↓
Trophy Road    Shop / Inventory              Play Again / Go Home
```

### 3.1 Match Rules
- 4 players (1 human + 3 AI bots) occupy the Top, Bottom-Left, and Bottom-Right walls
- A ball spawns in the center and bounces off paddles and walls
- A player is eliminated when the ball enters their goal
- Matches continue until only one player remains
- Each player starts with 3 lives (configurable via relics)

### 3.2 Controls
- **Mobile:** Swipe/drag finger to move paddle along the wall
- **Web:** Mouse click + drag
- Sensitivity adjustable in Settings (Slow / Normal / Fast)

---

## 4. Game Modes

| Mode | Description | XP Multiplier |
|---|---|---|
| **Classic (Ranked)** | Standard 4-player last-one-standing | 1.0× |
| **Rumble** | Faster ball speed, more chaotic | 1.2× |
| **Chaos** | Multiple balls simultaneously | 1.5× |
| **Six-Player** | 6 paddles, 6 walls | 1.75× |
| **Gauntlet** | 3-round tournament, cumulative XP | 3.0× |
| **Casual** | No rank impact, lower rewards | 0.8× |

---

## 5. Progression Systems

### 5.1 XP & Ranks

Players earn XP from every match. XP determines rank:

| Rank | Min XP | Color |
|---|---|---|
| Iron | 0 | Gray |
| Bronze | 500 | Bronze |
| Silver | 1,500 | Silver |
| Gold | 3,000 | Gold |
| Platinum | 6,000 | Cyan |
| Diamond | 12,000 | Blue |
| Master | 25,000 | Purple |
| Legend | 50,000 | Red-Gold |

### 5.2 Trophy Road (25 Milestones)

A Brawl Stars-style linear progression road gated by XP. Milestone rewards:
- **Coins** (200 → 2,000 per milestone)
- **Skins** (Plasma, Frost, Toxic, Void, Inferno, Chrome, Cosmic)
- **Relics** (Ironhide, Longarm, Quicksilver, Second Wind, Aftershock, Time Warp, Bulwark, Phoenix, Midas)

### 5.3 Competitive Level (1–50)
Halo-style competitive ranking independent of XP rank:
- Win 1st place → +2 levels
- Finish 2nd → no change
- Eliminated early → −1 level

### 5.4 Season Pass
8 tiers gated by total games played. Rewards: coins + exclusive skins (Plasma, Frost, Cosmic).

### 5.5 Win Streak Bonuses
Consecutive wins multiply XP and coin rewards:
- 1-win streak: 1.0× | 2: 1.25× | 3: 1.5× | 4: 1.75× | 5+: 2.0×

### 5.6 Daily Login Streak
Log in consecutive days to earn escalating coin bonuses (50 → 500 coins).

---

## 6. Cosmetics System

### 6.1 Skins (Paddle Colors)
14 skins available via shop, trophy road, or season pass. Examples: Default, Gold, Neon, Plasma, Frost, Toxic, Void, Inferno, Chrome, Cosmic.

### 6.2 Arena Themes
Board background themes that change the arena's visual style. Unlocked via coins.

### 6.3 Relics (Battle Artifacts)
10 relics that provide in-match passive buffs. Each relic has 10 upgrade levels (coins required). Unlock methods:
- **By rank** (most relics)
- **Via Trophy Road** (bypasses rank requirement)

| Relic | Effect |
|---|---|
| Ironhide | Start with shield |
| Longarm | +8–28% paddle size |
| Quicksilver | +8–28% paddle speed |
| Second Wind | Extra life |
| Prospector | Magnet — attract nearby coins |
| Aftershock | +10–35% deflection boost |
| Time Warp | Slow-motion start |
| Bulwark | Shield + shrink immunity |
| Phoenix | Auto-revive 1–3 times |
| Midas | Shield + extra life + bigger paddle |

### 6.4 Super Abilities
Each player equips one super ability that charges during the match:
- **Iron Wall (1):** Deploys an impenetrable temporary barrier
- **Slow Field (2):** Creates a zone that slows the ball
- **Banish (3):** Teleports the ball to the opposite side of the arena

---

## 7. Technical Architecture

### 7.1 Stack
| Layer | Technology |
|---|---|
| Runtime | Expo SDK 54, React Native 0.81.5 |
| Navigation | Expo Router 6 (file-based) |
| State | React Context (PlayerContext) |
| Persistence | AsyncStorage (device-local only) |
| Fonts | @expo-google-fonts/inter |
| Animations | React Native Animated API |
| Audio | Web Audio API (web), expo-av (native) |
| Haptics | expo-haptics |
| Build | EAS Build (Expo Application Services) |

### 7.2 Data Storage
All data is stored locally in AsyncStorage with the key `@goldrush_v3_{username}`. No external servers. No account creation. No network calls.

### 7.3 Performance Targets
- Game loop: 60 fps on all target devices
- App launch: < 2 seconds on cold start
- Match load: < 1 second

### 7.4 Platform Support
- **iOS:** iPhone 12+ (iOS 16+), portrait only
- **Android:** Android 8.0+ (API 26+), portrait only
- **Web:** Chrome / Safari (development preview only)

---

## 8. App Store Requirements Checklist

### Apple App Store
- [x] Bundle identifier: `com.goldrush.arena`
- [x] `ITSAppUsesNonExemptEncryption: false` in Info.plist
- [x] Privacy Policy (in-app + must provide URL in App Store Connect)
- [x] Terms of Service (in-app)
- [x] `NSPhotoLibraryUsageDescription` (avatar picker)
- [x] `NSCameraUsageDescription` (avatar picker)
- [x] Portrait-only orientation lock
- [x] Dark mode UI (dark user interface style set)
- [x] Splash screen
- [ ] App icon (1024×1024 PNG, no alpha channel) — **requires design asset**
- [ ] Screenshots (6.7", 6.5", 5.5" iPhones + iPad if supported) — **requires recording**
- [ ] App Store description & keywords — see Section 9
- [ ] Age rating questionnaire (expected: 4+ or 9+)
- [ ] EAS Build production build (`eas build --platform ios`)
- [ ] TestFlight internal testing

### Google Play Store
- [x] Package name: `com.goldrush.arena`
- [x] Version code: 1
- [x] `permissions: []` (no dangerous permissions)
- [x] Privacy Policy URL
- [x] Target API level ≥ 34 (configured via EAS)
- [ ] Feature graphic (1024×500 PNG)
- [ ] Screenshots (phone + 7" tablet)
- [ ] Store listing description
- [ ] Content rating questionnaire
- [ ] EAS Build production build (`eas build --platform android`)

---

## 9. App Store Listing Copy

### App Name
GoldRush Arena

### Subtitle (iOS, 30 chars max)
4-Player Air Hockey Battle

### Description (4000 chars max)
```
🏆 GOLDRUSH ARENA — THE ULTIMATE 4-PLAYER AIR HOCKEY BATTLE

Compete in the arena where only one can survive. GoldRush Arena is a fast-paced, 4-player last-one-standing air-hockey game packed with progression, cosmetics, and strategic depth.

⚔️ INTENSE GAMEPLAY
Deflect the ball, eliminate your opponents, and be the last one standing. Easy to learn. Hard to master.

🎮 6 GAME MODES
• Classic Ranked — Standard arena battle
• Rumble — Faster, more chaotic matches
• Chaos Mode — Multiple balls at once
• Six-Player — Larger arena, more opponents
• Gauntlet — 3-round tournament for big rewards
• Casual — Low-pressure, learn the ropes

🏅 DEEP PROGRESSION
• 25 Trophy Road milestones with coins, skins & relics
• 8 Rank tiers from Iron to Legend
• Competitive Level 1–50 (Halo-style)
• Win streak multipliers up to 2×
• Daily login rewards

⚡ SUPER ABILITIES
Charge your super during the match and unleash it at the perfect moment:
• Iron Wall — Block every shot
• Slow Field — Freeze the action
• Banish — Teleport the ball across the arena

💎 COSMETICS & RELICS
Unlock over 14 paddle skins, arena themes, and 10 power relics that give you real in-match advantages. Upgrade relics up to level 10 for maximum power.

🔒 100% OFFLINE & PRIVATE
No internet required. No accounts. No data collection. All progress saved locally on your device.

Download GoldRush Arena and prove you can rule the arena.
```

### Keywords (iOS, 100 chars)
`air hockey,arcade,battle,4 player,arena,multiplayer,action,trophy,coins,last one standing`

### Categories
- Primary: Games → Action
- Secondary: Games → Arcade

---

## 10. Pre-Launch Checklist

### Code Quality
- [x] TypeScript strict mode, zero type errors
- [x] Error boundary wraps the entire app
- [x] Loading screen during auth init (no null flashes)
- [x] Postgame screen guards against missing URL params
- [x] Privacy Policy & Terms of Service in-app
- [x] Share functionality on postgame screen
- [x] Rate App link in Settings

### Before Submission
- [ ] Replace placeholder App Store URLs in `settings.tsx` with real URLs after submission
- [ ] Add real Privacy Policy URL to App Store Connect
- [ ] Capture screenshots from TestFlight on physical device
- [ ] Run EAS Build: `eas build --platform all --profile production`
- [ ] Submit to TestFlight for internal testing (7 days minimum)
- [ ] Complete App Store Connect app record fully

---

## 11. Known Limitations & Future Roadmap

### Current Limitations
- Audio only works on web (Web Audio API); native audio requires `expo-av` integration
- No real-time multiplayer (all opponents are AI bots)
- No cloud save / cross-device sync

### v1.1 Roadmap
- [ ] Real-time multiplayer via WebSockets
- [ ] Cloud save with anonymous account linking
- [ ] Push notifications for daily challenges
- [ ] Seasonal events and limited-time cosmetics
- [ ] Watch mode / replay system
- [ ] Haptic feedback tuning on iOS

### v2.0 Roadmap
- [ ] Native audio via expo-av (full iOS/Android sound)
- [ ] Custom match lobbies (invite friends via code)
- [ ] Clan system
- [ ] Global leaderboards via API

---

## 12. Success Metrics (KPIs)

| Metric | Target (30 days post-launch) |
|---|---|
| Downloads | 1,000+ |
| Day-1 Retention | > 40% |
| Day-7 Retention | > 20% |
| Session Length | > 5 minutes |
| Sessions per DAU | > 2 |
| App Store Rating | ≥ 4.0 ★ |
| Crash-free sessions | > 99% |

---

*GoldRush Arena — Built with Expo SDK 54 on Replit*
