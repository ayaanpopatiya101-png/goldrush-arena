# GoldRush Arena -- Bug Fixes & Improvements

> **Version:** 1.0.0  
> **Last Updated:** July 2026  
> **Status:** Analysis complete, fixes ready for implementation

---

## Table of Contents

1. [Confirmed Bugs](#1-confirmed-bugs)
2. [Code Quality Improvements](#2-code-quality-improvements)
3. [Feature Enhancements](#3-feature-enhancements)
4. [Performance Optimizations](#4-performance-optimizations)
5. [Security & Data Integrity](#5-security--data-integrity)
6. [App Store Blockers](#6-app-store-blockers)
7. [Implementation Priority](#7-implementation-priority)

---

## 1. Confirmed Bugs

### Bug 1: Delete Account Uses Wrong Storage Key **(HIGH)**

**File:** `artifacts/mobile/context/PlayerContext.tsx`  
**Function:** `deleteAccount()`  
**Line:** ~1690

**Problem:** The `deleteAccount` function uses the old storage key `@goldrush_player_{username}` instead of the current `@goldrush_v3_{username}`, meaning player data is NOT actually deleted when a user deletes their account.

**Current Code:**
```typescript
const KEY = `@goldrush_player_${username}`;
await AsyncStorage.removeItem(KEY);
```

**Fix:**
```typescript
const KEY = `@goldrush_v3_${username}`;
await AsyncStorage.removeItem(KEY);
```

**Impact:** Users who delete their account and reinstall will find their old data still present. This is a **data privacy concern** for App Store submission.

---

### Bug 2: Audio Silent on iOS/Android **(HIGH)**

**File:** Multiple (GameArena.tsx, lobby.tsx, postgame.tsx)  
**Root Cause:** `playSFX()` in GameArena.tsx only works on web

**Current Code:**
```typescript
function playSFX(type: 'hit' | 'goal' | 'start' | 'elim' | 'powerup') {
    if (!soundEnabled) return;
    if (Platform.OS !== 'web') return; // <-- Early return on native
    // Web Audio API code...
}
```

**Fix:** Integrate `expo-av` for cross-platform audio:

```typescript
import { Audio } from 'expo-av';

// Initialize sound pool on app start
const soundPool: Record<string, Audio.Sound> = {};

async function preloadSounds() {
    const sounds = {
        hit: require('@/assets/sfx/hit.mp3'),
        goal: require('@/assets/sfx/goal.mp3'),
        start: require('@/assets/sfx/start.mp3'),
        elim: require('@/assets/sfx/elim.mp3'),
        powerup: require('@/assets/sfx/powerup.mp3'),
    };
    for (const [key, source] of Object.entries(sounds)) {
        const { sound } = await Audio.Sound.createAsync(source);
        soundPool[key] = sound;
    }
}

async function playSFX(type: 'hit' | 'goal' | 'start' | 'elim' | 'powerup') {
    if (!soundEnabled) return;
    try {
        if (Platform.OS === 'web') {
            // Keep Web Audio API for web
            // ... existing code ...
        } else {
            // Use expo-av for native
            const sound = soundPool[type];
            if (sound) {
                await sound.setPositionAsync(0);
                await sound.playAsync();
            }
        }
    } catch { /* Audio not critical */ }
}
```

**Impact:** No sound effects on iOS/Android makes the game feel lifeless. Apple reviewers may flag this as incomplete.

---

### Bug 3: Placeholder URLs in Settings **(MEDIUM)**

**File:** `artifacts/mobile/app/settings.tsx`  
**Problem:** App Store and Privacy Policy URLs are placeholder strings.

**Current:**
```typescript
const APP_STORE_URL = 'https://apps.apple.com/app/goldrush-arena';
const PRIVACY_URL = 'https://goldrush.example.com/privacy';
```

**Fix:** Create a constants file for URLs:

```typescript
// constants/urls.ts
export const URLS = {
    privacyPolicy: 'https://your-domain.com/privacy',
    termsOfService: 'https://your-domain.com/terms',
    appStore: 'https://apps.apple.com/app/YOUR_APP_ID',
    playStore: 'https://play.google.com/store/apps/details?id=com.goldrush.arena',
    support: 'https://your-domain.com/support',
} as const;
```

**Impact:** Apple/Google will reject if Privacy Policy URL is invalid or placeholder.

---

### Bug 4: Unhandled Promise Rejection in PlayerContext **(MEDIUM)**

**File:** `artifacts/mobile/context/PlayerContext.tsx`  
**Problem:** AsyncStorage operations don't have try/catch wrappers in several places.

**Current:**
```typescript
const save = useCallback(async (updated: PlayerProfile) => {
    setProfile(updated);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
    // ... no error handling
}, [KEY]);
```

**Fix:**
```typescript
const save = useCallback(async (updated: PlayerProfile) => {
    setProfile(updated);
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(updated));
        const accounts = await getSavedAccounts();
        // ... rest of save logic
    } catch (error) {
        console.error('Failed to save profile:', error);
        // Optionally show user a "save failed" toast
    }
}, [KEY, username]);
```

**Impact:** If AsyncStorage fails (rare, but possible on low-storage devices), player progress is lost without warning.

---

### Bug 5: Game Loop Doesn't Handle Background State **(MEDIUM)**

**File:** `artifacts/mobile/components/GameArena.tsx`  
**Problem:** The game loop continues running when the app goes to background, causing:
- Balls to score while user can't see
- Time-warp relic to waste frames
- Duel timer to count down unfairly

**Fix:** Pause the game loop on AppState change:

```typescript
import { AppState } from 'react-native';

useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
            isRunningRef.current = false;
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (duelTimerInterval.current) clearInterval(duelTimerInterval.current);
        } else if (nextAppState === 'active' && gamePhase === 'playing') {
            // Resume (optional -- could show "Tap to Resume" instead)
            isRunningRef.current = true;
            lastTimeRef.current = performance.now();
            rafRef.current = requestAnimationFrame(gameLoop);
        }
    });
    return () => subscription.remove();
}, [gamePhase]);
```

**Impact:** Players lose unfairly when switching apps to answer a text. Major user experience issue.

---

## 2. Code Quality Improvements

### CI-1: Add Input Validation to Settings

**File:** `artifacts/mobile/app/settings.tsx`  
**Problem:** Player name input has no length validation.

**Fix:**
```typescript
const MAX_NAME_LENGTH = 20;
const VALID_NAME_REGEX = /^[a-zA-Z0-9_\- ]+$/;

function validateName(name: string): string | null {
    if (name.length < 2) return 'Name must be at least 2 characters';
    if (name.length > MAX_NAME_LENGTH) return `Name must be under ${MAX_NAME_LENGTH} characters`;
    if (!VALID_NAME_REGEX.test(name)) return 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    return null;
}
```

### CI-2: Consolidate Magic Numbers

**File:** `artifacts/mobile/components/GameArena.tsx`  
**Problem:** Constants like `0.7 + 0.4 * skill` are scattered inline.

**Fix:** Create a `GAME_BALANCE.ts` constants file:
```typescript
export const BOT_SKILL = {
    speedMin: 0.7,
    speedMax: 1.1,  // 0.7 + 0.4
    accuracyMin: 0.85,
    accuracyMax: 1.05,  // 0.85 + 0.2
    accuracyCap: 0.97,
    duelBoost: 0.04,
} as const;

export const DIFFICULTY = {
    easySpeedMult: 0.62,
    easyInaccuracyMult: 2.2,
    easyReactionMult: 0.8,
} as const;
```

### CI-3: Type-Safe Storage Keys

**File:** `artifacts/mobile/context/PlayerContext.tsx`  
**Problem:** Storage key strings are repeated and error-prone.

**Fix:**
```typescript
const StorageKeys = {
    accounts: '@goldrush_accounts' as const,
    current: '@goldrush_current' as const,
    profile: (username: string) => `@goldrush_v3_${username}` as const,
    settings: '@goldrush_settings' as const,
} as const;
```

### CI-4: Extract Game Logic from GameArena

**File:** `artifacts/mobile/components/GameArena.tsx` (879 lines)  
**Problem:** The component is too large, mixing rendering, physics, AI, and game state.

**Suggested Structure:**
```
engine/
  GameLoop.ts        -- requestAnimationFrame + dt calculation
  Physics.ts         -- ball movement, collision detection
  BotAI.ts           -- threat targeting, bot movement
  GameState.ts       -- player state, elimination logic
  PowerUpSystem.ts   -- spawn, collection, effects
  SuperSystem.ts     -- charging, activation, effects
components/
  GameArena.tsx      -- React component (rendering only)
```

### CI-5: Add Comprehensive Error Boundaries

**File:** `artifacts/mobile/components/ErrorBoundary.tsx` exists but could be enhanced.

**Enhancement:**
```typescript
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to crash reporting service
        console.error('Game crash:', error, errorInfo);
        
        // Save current game state for recovery
        this.saveEmergencyState();
    }
    
    saveEmergencyState() {
        // Attempt to preserve player progress
        AsyncStorage.setItem('@goldrush_emergency_save', 
            JSON.stringify({ timestamp: Date.now(), screen: 'unknown' }));
    }
    
    render() {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
        }
        return this.props.children;
    }
}
```

### CI-6: Remove Dead Code

**Files to audit:**
- `artifacts/mobile/server/` -- appears to be unused
- `artifacts/mockup-sandbox/` -- verify if still needed
- `artifacts/api-server/` -- backend not used in v1.0

**Recommendation:** Move unused packages to a separate branch or mark with `.archive/` prefix.

### CI-7: Add Unit Tests

**Priority test targets:**
```typescript
// __tests__/physics.test.ts
describe('Ball Physics', () => {
    test('ball deflects off paddle with correct angle', () => {
        // ... test collision physics
    });
    test('speed cap prevents tunneling', () => {
        // ... test MAX_SPEED enforcement
    });
});

// __tests__/progression.test.ts
describe('Progression', () => {
    test('XP correctly converts to level', () => {
        expect(xpToLevel(0)).toBe(1);
        expect(xpToLevel(80)).toBe(2);
        expect(xpToLevel(100000)).toBeGreaterThan(20);
    });
    test('streak multiplier caps at 2.0x', () => {
        expect(getStreakMultiplier(10, true)).toBe(2.0);
    });
});
```

### CI-8: Add React Query for Data Operations

Consider adding `@tanstack/react-query` for AsyncStorage operations to get caching, error handling, and loading states:

```typescript
const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => loadProfile(username),
    staleTime: Infinity, // Profile doesn't go stale
});

const mutation = useMutation({
    mutationFn: saveProfile,
    onError: (error) => showToast('Save failed: ' + error.message),
});
```

---

## 3. Feature Enhancements

### FE-1: Native Audio System (expo-av)

**Priority:** HIGH  
**Effort:** Medium (1-2 weeks)

- Add sound effects for: hit, goal, match start, elimination, power-up pickup, super activation
- Add background music per arena theme (8 tracks)
- Add volume controls in settings
- Mute on phone call / app background

### FE-2: Pause Menu During Matches

**Priority:** HIGH  
**Effort:** Low (2-3 days)

- Pause button during gameplay
- Resume / Restart / Quit options
- Settings access (sound, haptics, sensitivity)
- Countdown before resuming (3-2-1-GO)

### FE-3: Local Leaderboard

**Priority:** MEDIUM  
**Effort:** Low (3-5 days)

- Track best scores per game mode
- Daily/Weekly/All-time tabs
- Show rank progression over time

### FE-4: Achievement Notifications

**Priority:** MEDIUM  
**Effort:** Low (2-3 days)

- Toast notification when achievement unlocked
- Progress tracking UI (e.g., "Deflect 7/10 balls")
- Confetti animation on rare achievements

### FE-5: Push Notifications

**Priority:** MEDIUM  
**Effort:** Medium (1 week)

- Daily login reminder (configurable time)
- Event opening notifications ("Weekly Challenge is live!")
- Streak about to break warning
- Requires `expo-notifications`

### FE-6: Tutorial Improvements

**Priority:** MEDIUM  
**Effort:** Low (3-4 days)

- Interactive tutorial (play a simplified match)
- Tooltip system for first-time features
- "Practice Mode" with stationary ball

### FE-7: Seasonal Events

**Priority:** LOW  
**Effort:** Medium (2-3 weeks)

- Halloween: dark arena, pumpkin balls
- Winter: snow particle effects, ice arena
- Summer: beach theme, water effects
- Limited-time skins per event

### FE-8: Replay System

**Priority:** LOW  
**Effort:** High (3-4 weeks)

- Record match state every N frames
- Playback with pause, rewind, slow-mo
- Share replay clips

### FE-9: Analytics Integration

**Priority:** HIGH (for growth)  
**Effort:** Low (2-3 days)

Track key events:
- Match start/completion
- Mode selection
- Skin purchases
- Relic upgrades
- Session duration
- Drop-off points

**Recommended:** PostHog (open source) or Mixpanel

### FE-10: Rate App Prompt

**Priority:** MEDIUM  
**Effort:** Low (1 day)

- Show after 5th match win
- Use `expo-store-review` for native prompt
- Respect user decline (don't re-prompt for 30 days)

### FE-11: Cloud Save (Future)

**Priority:** LOW  
**Effort:** High (4-6 weeks)

- Anonymous auth via Firebase or Supabase
- Sync profile across devices
- Restore progress on new device
- Conflict resolution for offline play

### FE-12: Accessibility

**Priority:** MEDIUM  
**Effort:** Medium (1-2 weeks)

- Screen reader labels for all UI elements
- High contrast mode option
- Reduce motion option (disable particles/screen shake)
- Larger touch targets option
- Color-blind friendly palettes

---

## 4. Performance Optimizations

### PO-1: Reduce Re-renders in GameArena

**Problem:** `setLivesState`, `setEliminatedState`, `setBallVisuals` trigger re-renders every frame.

**Solution:** Batch state updates and use refs for high-frequency data:

```typescript
// Use refs for frame-to-frame data that doesn't need React rendering
const livesRef = useRef<number[]>([]);
const eliminatedRef = useRef<boolean[]>([]);

// Only update React state every N frames for UI
if (frame % 6 === 0) {  // Update UI at 10 FPS instead of 60
    setLivesState([...livesRef.current]);
}
```

### PO-2: Optimize SVG Rendering

**Problem:** SVG grid lines and overlays re-render every frame.

**Solution:** Extract static SVG elements to a memoized component:

```typescript
const StaticArenaOverlay = React.memo(({ arenaSize, gameMode }: Props) => {
    return (
        <Svg width={arenaSize} height={arenaSize}>
            {/* Grid lines, triangle overlay, duel divider */}
            {/* These never change during a match */}
        </Svg>
    );
});
```

### PO-3: Lazy Load Tab Screens

**Problem:** All tab screens load at app start.

**Solution:** Use dynamic imports for tab screens:

```typescript
const ShopScreen = lazy(() => import('./(tabs)/shop'));
const EventsScreen = lazy(() => import('./(tabs)/events'));
```

### PO-4: Image Asset Optimization

- Compress all PNG assets
- Use WebP format where supported
- Implement proper asset caching
- Consider `@expo-image` for better performance

---

## 5. Security & Data Integrity

### SI-1: Profile Data Validation

Add runtime validation when loading profile data:

```typescript
function validateProfile(data: unknown): PlayerProfile | null {
    if (!data || typeof data !== 'object') return null;
    const p = data as Partial<PlayerProfile>;
    
    // Validate required fields
    if (typeof p.xp !== 'number' || p.xp < 0) return null;
    if (typeof p.coins !== 'number' || p.coins < 0) return null;
    if (!Array.isArray(p.ownedSkins)) return null;
    
    // Clamp values to prevent corruption
    return {
        ...DEFAULT_PROFILE,
        ...p,
        xp: Math.min(p.xp, 10_000_000),
        coins: Math.min(p.coins, 1_000_000),
        level: Math.min(Math.max(1, p.level ?? 1), 100),
    };
}
```

### SI-2: Prevent Save File Tampering

Add a simple checksum to detect manual edits:

```typescript
import * as Crypto from 'expo-crypto';

async function saveProfile(profile: PlayerProfile) {
    const data = JSON.stringify(profile);
    const checksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data + 'goldrush_salt_v1'
    );
    await AsyncStorage.setItem(KEY, JSON.stringify({ data: profile, checksum }));
}

async function loadProfile(): Promise<PlayerProfile | null> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const { data, checksum } = JSON.parse(raw);
    const verify = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(data) + 'goldrush_salt_v1'
    );
    if (checksum !== verify) {
        console.warn('Profile checksum mismatch, possible tampering');
        return null;
    }
    return data;
}
```

### SI-3: Backup on Critical Operations

Before spending coins or upgrading relics, save a backup:

```typescript
async function spendCoins(amount: number): Promise<boolean> {
    if (profile.coins < amount) return false;
    
    // Create backup before destructive operation
    await AsyncStorage.setItem('@goldrush_backup', JSON.stringify(profile));
    
    const updated = { ...profile, coins: profile.coins - amount };
    await save(updated);
    return true;
}
```

---

## 6. App Store Blockers

These issues **must** be resolved before submission:

| # | Issue | Severity | Fix Time |
|---|-------|----------|----------|
| 1 | Delete account wrong storage key | HIGH | 5 min |
| 2 | Privacy Policy URL is placeholder | HIGH | 30 min |
| 3 | No native audio (Apple may flag) | MEDIUM | 1-2 weeks |
| 4 | Game doesn't pause on background | MEDIUM | 2-3 hours |
| 5 | No app icon (verify 1024x1024) | HIGH | 1-2 hours |
| 6 | Missing EAS build configuration | HIGH | 1 hour |
| 7 | Verify no expo-router deep link crashes | MEDIUM | 2-3 hours |

---

## 7. Implementation Priority

### Sprint 1: Critical Fixes (Week 1)
- Fix delete account storage key (Bug 1)
- Replace placeholder URLs (Bug 3)
- Add AppState background handling (Bug 5)
- Add error handling to AsyncStorage (Bug 4)

### Sprint 2: App Store Prep (Week 2)
- Create app icon (1024x1024)
- Take device screenshots
- Write store descriptions
- Configure EAS build profiles
- TestFlight internal testing

### Sprint 3: Audio & Polish (Week 3-4)
- Integrate expo-av (Bug 2 / FE-1)
- Add sound effects
- Add pause menu (FE-2)
- Add rate app prompt (FE-10)

### Sprint 4: Features (Week 5-6)
- Local leaderboard (FE-3)
- Achievement notifications (FE-4)
- Analytics integration (FE-9)
- Accessibility improvements (FE-12)

### Sprint 5: Performance (Week 7)
- Reduce GameArena re-renders (PO-1)
- Memoize static SVG elements (PO-2)
- Lazy load tab screens (PO-3)
- Add data validation (SI-1)

---

*GoldRush Arena -- Bug Fixes & Improvements v1.0*
