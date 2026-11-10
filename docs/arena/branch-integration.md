# Integrated branch review

This workspace reconciles the arena-experience, tournament-scorecard and iOS-release branches with the newer main-branch fixes.

## Retained changes

- The latest seven-colour palette, onboarding, player-save format, Codespaces launcher and patched dependency baseline.
- A reachable full-screen warm-up using the production engine, with pause, restart and no progression or inventory mutations.
- Finite paddle bounds, pause/input guards, duel-timer pausing and game-over timer cleanup.
- Safe legacy-rank aliases and milestone-gated season rewards, including actual skin delivery and serialized claims.
- The native iOS project, release schemes, icon resources, release worksheets and quality workflow.
- SDK-aligned `expo-audio` playback without adding a microphone permission.

## Reconciliation decisions

Older colour and dependency declarations were not allowed to replace the newer palette, purchased-cosmetic definitions, SDK-compatible Worklets/TypeScript versions or security overrides. Overlapping Home implementations were reconciled rather than nested together. Current privacy, Terms and launch checklist drafts remain authoritative over older contradictory claims.

Imported scorecard screenshots and Xcode reports describe the source branch at the time they were produced. They are **not** verification of this integrated build.

## Native release verification still required

The imported iOS tree and Pod lock targeted Expo 57 while the active app uses Expo 54. The native tree was regenerated with the installed Expo 54 tooling and current static app configuration; the incompatible Pod lock was removed. This synchronizes generated splash/icon resources, optional avatar permission messages and disabled microphone permission. The standalone Release scheme is retained.

This Linux workspace cannot run Xcode, CocoaPods, an iPhone or App Store purchase restoration. A new native dependency resolution and native build remain necessary; successful source generation is not a signed-build or device test.

Validate the resulting build on actual devices, including background/foreground pause, audio mute, optional avatar permissions, purchasing and restoring purchases. Publisher identity, privacy disclosures, data-retention choices and live policy/support URLs require owner review. No store submission or public-policy hosting was performed as part of this integration.
