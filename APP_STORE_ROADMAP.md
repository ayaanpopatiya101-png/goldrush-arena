# GoldRush Arena -- App Store Submission Guide

> **Version:** 1.0.0  
> **Last Updated:** July 2026  
> **Target Platforms:** iOS (App Store), Android (Google Play)

---

## Table of Contents

1. [Pre-Submission Checklist](#1-pre-submission-checklist)
2. [iOS App Store](#2-ios-app-store)
3. [Google Play Store](#3-google-play-store)
4. [Store Listing Optimization](#4-store-listing-optimization)
5. [Testing Requirements](#5-testing-requirements)
6. [Post-Launch Plan](#6-post-launch-plan)

---

## 1. Pre-Submission Checklist

### Code & Assets

- [x] TypeScript strict mode, zero type errors
- [x] Error boundary wraps the entire app
- [x] Loading screen during initialization (no null flashes)
- [x] Postgame screen guards against missing URL params
- [x] Privacy Policy & Terms of Service in-app (`app/legal.tsx`)
- [x] Share functionality on postgame screen
- [x] Rate App link in Settings
- [x] App icon at `assets/images/icon.png` (1024x1024)
- [x] Splash screen configured in `app.json`
- [ ] Replace placeholder Privacy Policy URL in `app/settings.tsx` **(REQUIRED)**
- [ ] Add real Privacy Policy link in App Store Connect / Google Play Console
- [ ] Capture screenshots from physical devices
- [ ] Feature graphic for Google Play (1024x500)

### Configuration

| Setting | Value | Status |
|---------|-------|--------|
| iOS Bundle ID | `com.goldrush.arena` | Configured |
| Android Package | `com.goldrush.arena` | Configured |
| Deep Link Scheme | `goldrush://` | Configured |
| iOS Build Number | 1 | Configured |
| Android Version Code | 1 | Configured |
| Orientation | Portrait only | Configured |
| Dark Mode | Forced | Configured |
| New Architecture | Enabled | Configured |

---

## 2. iOS App Store

### Build Configuration (`app.json`)

```json
{
  "ios": {
    "bundleIdentifier": "com.goldrush.arena",
    "supportsTablet": false,
    "buildNumber": "1",
    "infoPlist": {
      "NSPhotoLibraryUsageDescription": "GoldRush Arena uses your photo library to let you set a profile avatar.",
      "NSCameraUsageDescription": "GoldRush Arena can use the camera to set a profile avatar.",
      "ITSAppUsesNonExemptEncryption": false
    }
  }
}
```

### Submission Steps

1. **Register App ID** in Apple Developer Portal
   - Go to Certificates, Identifiers & Profiles
   - Register `com.goldrush.arena`
   - Enable required capabilities (none needed for v1.0)

2. **Create App Store Connect Record**
   - Go to App Store Connect > My Apps
   - Click "+" to add new app
   - Fill in: Name, primary language, bundle ID, SKU
   - Select "Games" category > "Action" subcategory

3. **Configure App Information**
   - **Name:** GoldRush Arena
   - **Subtitle:** 4-Player Air Hockey Battle (30 chars max)
   - **Category:** Games > Action (Primary), Games > Arcade (Secondary)
   - **Content Rights:** Does not contain third-party content
   - **Age Rating:** Complete questionnaire (expected: 4+)

4. **Upload Build**
   ```bash
   eas build --platform ios --profile production
   ```
   - Submit via Transporter or let EAS auto-submit
   - Wait for processing (5-30 minutes)

5. **Add Screenshots** (see [Screenshot Requirements](#screenshot-requirements))

6. **Set Pricing & Availability**
   - Price: Free
   - Availability: All territories (or select markets)

7. **Submit for Review**
   - Select the build
   - Answer export compliance (uses `ITSAppUsesNonExemptEncryption: false`)
   - Submit for review (typical review time: 24-48 hours)

### Screenshot Requirements

| Size | Dimensions | Purpose |
|------|-----------|---------|
| 6.7" | 1290x2796 | iPhone 14 Pro Max |
| 6.5" | 1242x2688 | iPhone 11 Pro Max, XS Max |
| 5.5" | 1242x2208 | iPhone 8 Plus, 7 Plus, 6S Plus |

**Minimum 4 screenshots per size, maximum 10.**

**Recommended Screenshots:**
1. Main gameplay (4-player arena action)
2. Victory screen with rewards
3. Trophy Road progression
4. Shop/skins showcase
5. Events screen

---

## 3. Google Play Store

### Build Configuration (`app.json`)

```json
{
  "android": {
    "package": "com.goldrush.arena",
    "versionCode": 1,
    "adaptiveIcon": {
      "backgroundColor": "#080812"
    },
    "permissions": []
  }
}
```

### Submission Steps

1. **Create Google Play Console Account**
   - One-time $25 developer fee
   - Complete account verification

2. **Create App**
   - Go to Google Play Console > All Apps
   - Click "Create app"
   - Fill in: App name, default language, app or game, free or paid

3. **Configure App Details**
   - **Category:** Game > Action
   - **Tags:** Arcade, Action, Battle Royale, Air Hockey
   - **Content Rating:** Complete questionnaire via Play Console
   - **Target Audience:** 13+ (or 9+ depending on content rating)

4. **Set Up Store Listing**
   - **Short Description:** 80 chars max
     ```
     Fast 4-player air hockey battle royale. Last one standing wins!
     ```
   - **Full Description:** 4000 chars max (see PRD.md Section 9)
   - **Feature Graphic:** 1024x500 PNG (create in Figma/Photoshop)

5. **Upload Build**
   ```bash
   eas build --platform android --profile production
   ```
   - Download AAB from EAS
   - Upload to Google Play Console (Internal Testing first)

6. **Testing Tracks**
   - **Internal Testing:** Immediate, up to 100 testers
   - **Closed Testing:** Requires 20 testers for 14 days (for new apps)
   - **Open Testing:** Public beta
   - **Production:** Full release

7. **Submit for Review**
   - New apps require 20 testers in closed testing for 14 days
   - After meeting requirement, can apply for production
   - Review time: 3-7 days for new apps

### Screenshot Requirements

| Type | Dimensions | Count |
|------|-----------|-------|
| Phone | 16:9 or 9:16 | 2-8 |
| 7" Tablet | 16:9 or 9:16 | Optional |
| 10" Tablet | 16:9 or 9:16 | Optional |

---

## 4. Store Listing Optimization

### App Name & Keywords

**iOS App Name:** `GoldRush Arena`
**iOS Subtitle:** `4-Player Air Hockey Battle`
**iOS Keywords (100 chars):**
```
air hockey,arcade,battle,4 player,arena,multiplayer,action,trophy,coins,last one standing
```

### App Description Template

```
Compete in the arena where only one can survive. GoldRush Arena is a fast-paced, 4-player last-one-standing air-hockey game packed with progression, cosmetics, and strategic depth.

INTENSE GAMEPLAY
Deflect the ball, eliminate your opponents, and be the last one standing. Easy to learn. Hard to master.

6 GAME MODES
- Classic Ranked -- Standard arena battle
- Rumble -- Faster, more chaotic matches
- Chaos Mode -- Multiple balls at once
- Six-Player -- Larger arena, more opponents
- Gauntlet -- 3-round tournament for big rewards
- Casual -- Low-pressure, learn the ropes

DEEP PROGRESSION
- 25 Trophy Road milestones with coins, skins & relics
- 23 Rank tiers from Iron to Spartan
- Competitive Level 1-50 (Halo-style)
- Win streak multipliers up to 2x
- Daily login rewards

SUPER ABILITIES
Charge your super during the match:
- Iron Wall -- Block every shot
- Slow Field -- Freeze the action
- Banish -- Destroy the scoring ball

COSMETICS & RELICS
Unlock 14+ paddle skins, 8 arena themes, and 10 power relics. Upgrade relics to level 10.

100% OFFLINE
No internet required. No accounts. No data collection. All progress saved locally.
```

### Feature Graphic (Google Play)

Create a 1024x500 graphic featuring:
- Game logo centered
- Action screenshot or stylized arena background
- Gold accent colors on dark background
- Tagline: "4-Player Air Hockey Battle Royale"

---

## 5. Testing Requirements

### Pre-Submission Testing Matrix

| Device | OS | Test |
|--------|-----|------|
| iPhone 14 Pro | iOS 17 | Core gameplay, haptics, gestures |
| iPhone SE (3rd gen) | iOS 17 | Performance on smaller screen |
| iPhone 12 | iOS 16 | Older device performance |
| Pixel 7 | Android 14 | Core gameplay, haptics |
| Samsung Galaxy S21 | Android 13 | Samsung-specific testing |
| Budget Android | Android 10 | Low-end performance |

### Test Scenarios

- [ ] Fresh install + onboarding flow
- [ ] Complete match in each game mode
- [ ] Gauntlet mode (all 3 rounds)
- [ ] Purchase and equip skin
- [ ] Upgrade relic
- [ ] Claim daily streak
- [ ] View and participate in events
- [ ] Check Trophy Road progress
- [ ] App background/foreground during match
- [ ] Phone call interruption during match
- [ ] Low battery mode performance
- [ ] Airplane mode (full offline)
- [ ] Delete account and restart
- [ ] Rate app flow
- [ ] Share results

### Performance Targets

| Metric | Target |
|--------|--------|
| Cold start | < 2 seconds |
| Match load | < 1 second |
| Gameplay FPS | 60 FPS sustained |
| Memory usage | < 100 MB |
| Battery drain | < 5% per 15 min session |
| Crash-free sessions | > 99.5% |

---

## 6. Post-Launch Plan

### Week 1

- [ ] Monitor crash reports (Firebase Crashlytics recommended)
- [ ] Respond to all App Store / Play Store reviews
- [ ] Track Day-1 and Day-7 retention
- [ ] Check for critical bugs on real devices

### Month 1

- [ ] Analyze most-played game modes
- [ ] Track player progression drop-off points
- [ ] Collect feature requests from reviews
- [ ] Plan v1.1 content update

### Key Metrics to Track

| Metric | Good | Excellent |
|--------|------|-----------|
| Day-1 Retention | > 35% | > 45% |
| Day-7 Retention | > 15% | > 25% |
| Session Length | > 4 min | > 7 min |
| Sessions/DAU | > 2 | > 3 |
| App Store Rating | > 4.0 | > 4.5 |
| Crash-free Rate | > 98% | > 99.5% |

### v1.1 Update Timeline

| Week | Task |
|------|------|
| 1-2 | Integrate `expo-av` for native audio |
| 3-4 | Add background music per arena theme |
| 5-6 | Enhanced haptic feedback |
| 7-8 | Push notifications for daily challenges |
| 9 | Submit v1.1 for review |

---

*GoldRush Arena -- App Store Guide v1.0*
