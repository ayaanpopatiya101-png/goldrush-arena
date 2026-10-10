# Xcode setup and test report

## Open and run

Open `artifacts/mobile/ios/GoldRushArena.xcworkspace` in Xcode, not the `.xcodeproj` file. Select **GoldRushArena Release**, select an iPhone simulator, then press Run. This scheme includes the JavaScript in the app and does not need a development server.

The original **GoldRushArena** scheme remains available for development. Start `pnpm exec expo start --dev-client` from `artifacts/mobile` before running that Debug scheme.

On a fresh checkout, install workspace packages with `pnpm install`, then run `pod install` from `artifacts/mobile/ios`. Xcode must point to a working Node.js installation; a machine-specific override belongs in `.xcode.env.local`, which is not committed.

## Verified on October 10, 2026

- Xcode 26.6 opens the generated workspace and recognizes the app scheme and iPhone 17 Pro run destination.
- A Release build for the Apple-silicon iOS simulator succeeds.
- The built app launches on iPhone 17 Pro with iOS 26.5 and displays the animated Enter Arena screen.
- The initial launch animation crash was reproduced, fixed, and retested. Ball glow scale and ball-entry opacity now both use native animations.
- Expo SDK 57 dependencies are aligned. Expo Doctor passes its dependency and schema checks; its remaining notice concerns keeping the checked-in native project synchronized with app configuration.
- TypeScript checks pass.

## Signing blocker

A signed device archive was attempted both with local profiles and with automatic provisioning updates. Xcode reports **No Account for Team K592NV82VP** and no provisioning profile for `com.goldrush.arena`. The owner must sign in under Xcode → Settings → Accounts and choose an active Apple Developer Program team under Signing & Capabilities. A development certificate in Keychain alone is not enough to distribute this app.

## Still unverified

This is a launch smoke test, not a full gameplay certification. Simulator UI automation could not connect to the Simulator window, so onboarding interaction, matches, progression, accessibility, and every screen still need hands-on testing. Apple sandbox purchases, restores, production multiplayer, and physical-device behavior also remain unverified.

Do not submit this build until the remaining checks in `01-launch-checklist.md` are complete. The public policy pages are prepared files, not confirmed live URLs. Their contact details and server data-retention practices must be confirmed by the owner before publication.
