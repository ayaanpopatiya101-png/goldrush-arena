# GoldRush Arena — App Store Launch Checklist

Everything you need to do, in order, to ship GoldRush Arena to the iOS App Store.

---

## Phase 1 — Accounts & Setup

- [ ] **Apple Developer Program** enrolled ($99/yr) — [developer.apple.com](https://developer.apple.com/programs/enroll/)
- [ ] **App Store Connect** access confirmed
- [ ] Create the app record in App Store Connect with bundle ID `com.goldrush.arena`
- [ ] Set up **EAS Build** (Expo Application Services): `npm i -g eas-cli && eas build:configure`
- [ ] Add an `eas.json` with a `production` profile

## Phase 2 — App Configuration (`app.json`)

- [ ] `version` is `1.0.0`, `buildNumber` is `"1"` ✅ (already set)
- [ ] Bundle ID `com.goldrush.arena` ✅ (already set)
- [ ] `ITSAppUsesNonExemptEncryption: false` ✅ (already set — skips export compliance questions)
- [ ] App icon is **1024×1024, no alpha, no rounded corners** (Apple rejects icons with transparency)
- [ ] Splash screen background matches app background (`#080812`) ✅
- [ ] **Decision needed:** photo-library / camera avatar feature.
  - If you KEEP it: usage strings are already in `app.json`, but the in-app Privacy Policy (legal.tsx §5) currently says the app requests *no* sensitive permissions — **this contradiction is a rejection risk; fix the policy text**.
  - If you CUT it: remove `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, and the `expo-image-picker` dependency.

## Phase 3 — Legal & Compliance (critical)

- [ ] **Privacy Policy hosted at a public URL** — Apple requires a URL, not just in-app text. Free options: GitHub Pages, Notion public page. (Use `02-privacy-policy.md`.)
- [ ] **Terms of Service** hosted or in-app ✅ (already in-app; also in `03-terms-of-service.md`)
- [ ] **App Privacy questionnaire** in App Store Connect: if truly offline-only, answer "Data Not Collected" for everything — this gives you the coveted "No Data Collected" privacy label.
- [ ] **⚠️ Stripe code exists in the repo** (`artifacts/api-server`, `scripts/seed-products.ts`). Apple **prohibits Stripe/external payments for digital content** (App Review Guideline 3.1.1) — digital coins/skins MUST use Apple In-App Purchase. Since v1.0 has no purchases, make sure **no Stripe code ships in the app binary** and no purchase UI is reachable. Add real IAP later via `expo-iap` / RevenueCat.
- [ ] **⚠️ Party/matchmaking API** — if party codes hit your Replit server, the app is NOT "100% offline" and the privacy policy's "no data transmitted" claim is false. Either (a) ship v1.0 with party feature disabled, or (b) update the privacy policy to disclose it.
- [ ] Age rating questionnaire: expect **4+** (no violence beyond cartoon paddles, no gambling — Lucky Blocks are earned, not purchased, so they don't trigger the loot-box disclosure rule... but if you EVER sell them for real money, you must disclose odds).
- [ ] COPPA: if you keep "safe for children under 13" positioning, do NOT add third-party ads/analytics without a Kids Category review.

## Phase 4 — Assets for the Listing

- [ ] **Screenshots (required):** 6.9" (iPhone 16 Pro Max, 1320×2868) and 6.5" (1284×2778 or 1242×2688). 3–10 per size. Capture: home screen, mid-match gameplay, victory screen, Trophy Road, shop/skins, ranked badge.
- [ ] Optional but high-converting: **App Preview video** (15–30s of gameplay, portrait)
- [ ] App name (30 chars), subtitle (30 chars), description (4000 chars), keywords (100 chars), promo text (170 chars) — all drafted in `04-app-store-listing.md`
- [ ] Support URL (can be a GitHub Pages site or even the repo README)
- [ ] Marketing URL (optional)

## Phase 5 — Pre-Submission QA

- [ ] `pnpm --filter @workspace/mobile run typecheck` passes
- [ ] Test on a REAL iPhone via TestFlight (not just Expo Go — production builds behave differently)
- [ ] Test on the smallest supported screen (iPhone SE) — check for text truncation
- [ ] Kill the app mid-match → relaunch → verify no crash and progress intact
- [ ] Airplane mode end-to-end test (proves offline claim; party features should fail gracefully)
- [ ] No placeholder text, lorem ipsum, or debug UI anywhere
- [ ] All achievements/Trophy Road milestones claimable without errors
- [ ] Haptics respect the in-app settings toggle
- [ ] Verify `expo-store-review` prompt does not fire on first launch (Apple dislikes early rating prompts)

## Phase 6 — Build & Submit

- [ ] `eas build --platform ios --profile production`
- [ ] `eas submit --platform ios`
- [ ] In App Store Connect: attach build, fill App Review notes (see `05-app-review-notes.md`)
- [ ] Set pricing (Free), availability (all territories or your pick)
- [ ] Choose **Manual release** for v1.0 (so you control launch timing)
- [ ] Submit for review — typical turnaround is 24–48 hours

## Phase 7 — Post-Launch

- [ ] Respond to App Review rejections within days (each resubmission restarts the queue)
- [ ] Prompt for ratings AFTER a victory using `expo-store-review` (already installed) — happiest moment = best reviews
- [ ] Plan v1.1 within 2–4 weeks (season content update) — algorithm rewards update cadence
- [ ] Watch crash reports in App Store Connect → TestFlight/Xcode Organizer
