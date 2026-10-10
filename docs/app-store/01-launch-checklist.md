# GoldRush Arena iOS Release Checklist

This checklist separates work already completed in the repository from work that requires the owner's Apple, Expo, RevenueCat, hosting, or business accounts.

## Completed in the project

- [x] iOS bundle identifier set to `com.goldrush.arena`
- [x] App version `1.0.0`, build `1`
- [x] Portrait iPhone target with tablet support disabled
- [x] 1024×1024 RGB app icon with no alpha channel
- [x] Export-compliance flag set for no non-exempt encryption
- [x] Unused camera, photo-library, microphone, and location permissions removed
- [x] Expo SDK dependencies aligned and health checks passed
- [x] TypeScript release check passed
- [x] Native Xcode workspace generated at `artifacts/mobile/ios/GoldRushArena.xcworkspace`
- [x] Apple-silicon release simulator build tested
- [x] EAS production and submission profiles added
- [x] iOS purchase flow uses Apple In-App Purchase through RevenueCat
- [x] Redeem-code and Stripe controls hidden from native builds
- [x] Restore Purchases control present
- [x] In-app privacy and terms copy updated
- [x] Store listing, review notes, privacy answers, and IAP setup worksheet drafted

## Apple Developer and App Store Connect

- [ ] Confirm the Apple Developer Program membership for Team `K592NV82VP` is active and allowed to distribute apps
- [ ] Confirm `com.goldrush.arena` is available, then register the App ID
- [ ] Create the App Store Connect app record
- [ ] Accept any pending Paid Apps Agreement, tax forms, and banking setup
- [ ] Create the in-app purchase products listed in `07-in-app-purchases.md`
- [ ] Add English display names, descriptions, prices, and review screenshots for every IAP
- [ ] Submit the IAPs with app version 1.0
- [ ] Complete age-rating questions based on the final binary; do not select the Kids Category without a separate child-directed compliance review
- [ ] Enter the privacy answers from `06-app-privacy-answers.md`, adjusting if production data practices differ

## RevenueCat and production services

- [ ] Add the iOS app and App Store Connect API key in RevenueCat
- [ ] Import products and create the `current` offering with the exact package identifiers in `07-in-app-purchases.md`
- [ ] Add `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` to the release environment
- [ ] Set `EXPO_PUBLIC_API_BASE` to a stable HTTPS production API URL
- [ ] Verify party, matchmaking, challenges, leaderboards, referrals, and code verification against production—not a Replit development hostname
- [ ] Decide and document server retention/deletion periods before publishing the privacy policy

## Public pages and store assets

- [ ] Enable GitHub Pages from the repository's `/docs` folder; this publishes the prepared privacy, terms, and support pages
- [ ] Publish a support page containing the support email, current app version, troubleshooting steps, and privacy-policy link
- [ ] Add `https://ayaanpopatiya101-png.github.io/goldrush-arena/privacy.html` as the Privacy Policy URL and `https://ayaanpopatiya101-png.github.io/goldrush-arena/support.html` as the Support URL in App Store Connect
- [ ] Capture real-device or release-simulator screenshots after final visual QA
- [ ] Upload screenshots for every required iPhone display size shown in App Store Connect
- [ ] Paste the final copy from `04-app-store-listing.md` and proofread it in context

## Release QA

- [ ] Complete onboarding, a win, and a loss on the smallest supported iPhone simulator
- [ ] Repeat on the largest supported iPhone simulator
- [ ] Test Dynamic Type, VoiceOver labels, reduced motion, and increased contrast
- [ ] Test airplane-mode bot play and graceful failure for every online control
- [ ] Test party creation, joining, leaving, and leader launch on two physical devices
- [ ] Test every IAP with Apple sandbox accounts, including cancellation, interrupted purchase, duplicate delivery, refund, and restore
- [ ] Confirm consumables cannot be delivered twice after relaunch
- [ ] Confirm non-consumables restore after reinstall
- [ ] Verify all external text, prices, season labels, rankings, and rewards match the live configuration
- [ ] Run a TestFlight build on a physical iPhone for at least one full progression session

## Build and upload

- [ ] Add the App Store Connect numeric Apple ID to `submit.production.ios.ascAppId` in `eas.json`
- [ ] Create a signed archive in Xcode or run `eas build --platform ios --profile production`
- [ ] Upload the archive to App Store Connect or run `eas submit --platform ios --profile production`
- [ ] Wait for processing, resolve any privacy-manifest or export-compliance warnings, and distribute to internal TestFlight testers
- [ ] Attach the tested build to version 1.0
- [ ] Paste `05-app-review-notes.md`, add review contact details, and submit the app and IAPs together
- [ ] Use manual release for version 1.0 so approval does not immediately publish the app
