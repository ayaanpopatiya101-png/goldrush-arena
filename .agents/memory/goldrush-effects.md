---
name: GoldRush Arena effects library
description: Purpose-built visual effects library at components/effects/ — what's in it, how to use it, and sharp edges
---

## Effects Library Location
`artifacts/mobile/components/effects/` — barrel export at `index.ts`

## Available Components

| Component | Props | Use case |
|---|---|---|
| `GlowText` | color, glowColor, intensity, pulse, glitch, ...TextProps | Neon text — web uses textShadow, native uses shadowColor on wrapping View |
| `FloatingOrbs` | orbs?, opacity? | Full-screen ambient background blobs — use ORBS_GOLD or ORBS_ARCANE presets |
| `PulseRing` | color, size, rings, duration, opacity, children, style | Expanding rings for active states, milestones, champion badges |
| `ShimmerCard` | shimmerColor, duration, pauseBetween, active, borderRadius, ...ViewProps | Sliding shimmer on any card surface |
| `HolographicShimmer` | borderRadius, active, children, style | Rainbow dual-pass shimmer for premium items |
| `ScreenShake` | ref: .shake(intensity?) | Trauma-squared shake system — wrap arena/game screen |
| `GlowBorder` | color, borderRadius, spread, pulse, borderWidth, ...ViewProps | Pulsing glow border around any container |
| `CounterText` | value, format?, duration?, prefix?, suffix?, ...TextProps | RAF-driven animated number counter |
| `ParticleField` | count, mode='stars'\|'embers' | 60-particle animated starfield — NOT same as AmbientParticles |
| `HolographicCard` | borderRadius, disabled, maxTilt, rainbow, ...ViewProps | 3D perspective tilt on mouse/touch |
| `SparkBurst` | ref: .burst(x, y, color) | Imperative particle explosion from a point |
| `ScanlineOverlay` | spacing, lineOpacity, color | CRT scanlines — web uses CSS gradient, native uses thin Views |

## Presets
- `ORBS_GOLD` — warm gold/amber orbs (Shop, Home screens)
- `ORBS_ARCANE` — purple/cyan orbs (Battle Pass, Inventory screens)

## Web-specific warnings (expected, non-breaking)
- `shadow*` style props → deprecated in favor of `boxShadow` (web)
- `textShadow*` style props → deprecated warning but works fine

## Key patterns
- All effects use `pointerEvents="none"` to not block touches
- FloatingOrbs goes as FIRST child of root View (absolute fill)
- ParticleField replaces or supplements AmbientParticles
- GlowText wraps `<Text>` — on native it adds a View wrapper, so it CHANGES layout (use `alignSelf:'flex-start'` or `style` prop to control)
- CounterText replaced useAnimatedProps approach (had TypeScript errors) — uses requestAnimationFrame + setState

## Applied to
- Tab bar (_layout.tsx): spring-bounce icon + glow halo + animated pip
- Home (index.tsx): FloatingOrbs GOLD + ShimmerCard on TierCard
- PostGame (postgame.tsx): FloatingOrbs + GlowText on result/XP/coins
- Leaderboard: FloatingOrbs + GlowText on top-3 + GlowBorder on own row
- Profile: FloatingOrbs + GlowText on name/rank + ShimmerCard on achievements
- Shop: FloatingOrbs GOLD + HolographicShimmer on BPP + ShimmerCard on season pass
- Battle Pass: FloatingOrbs ARCANE + ParticleField + ShimmerCard on tiers
- RankBadge: GlowBorder (elite tiers) + PulseRing (Champion)
- PlayerCard: ShimmerCard (when isReady)
- Inventory: FloatingOrbs ARCANE + HolographicShimmer on equipped
- Events: FloatingOrbs + GlowBorder on live events + GlowText

**Why:** All effects use only existing installed packages (Reanimated 4.1.1, expo-linear-gradient, expo-blur) — no new native deps, so no rebuild needed for Expo Go.
