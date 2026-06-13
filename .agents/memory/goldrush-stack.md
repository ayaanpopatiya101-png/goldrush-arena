---
name: GoldRush Arena stack
description: Key architecture decisions for the GoldRush Arena mobile game project
---

## Stack
- Expo SDK 54, expo-router (file-based), React Native 0.81.5
- All data is device-local via AsyncStorage — no DATABASE_URL wired up
- Auth: custom multi-account system (`@goldrush_current`, `@goldrush_accounts`, `@goldrush_v3_<username>`)
- Audio: Web Audio API (BackgroundMusic.tsx + useSoundFX.ts) — works in Expo web preview only; on native, would need expo-av
- Settings: `hooks/useSettings.ts` persists to `@goldrush_settings_v1` in AsyncStorage

## Important patterns
- PlayerProvider takes `{ username, onLogout, children }` props
- `store/gameSession.ts` is a simple singleton (module-level var) for passing config from Home → Lobby → Game
- GameArena renders in a rAF game loop; sounds are triggered inside the component via direct AudioContext calls (not via React state)
- Color-shifting board uses `Animated.timing` with `useNativeDriver: false` interpolating through `COLOR_BOARD_TINTS` array

**Why:** Web Audio API approach avoids needing native audio files and works in the web preview. The platform guard (`Platform.OS !== 'web'`) ensures it silently no-ops on native.
