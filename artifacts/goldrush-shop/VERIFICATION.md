# Verification

## Automated

- Shared-library TypeScript build passed.
- Shop TypeScript check passed.
- Production Vite build passed.
- Ten targeted tests passed covering atomic balance/ownership/equip persistence, duplicate actions, concurrent spending, locked/disabled products, insufficient funds, legacy ownership, non-overwriting imports, invalid saves, storage failures, aborted writes, recovery backups, and native skin catalog parity.
- Mobile and canvas sources have no changes in this task.

## Bounded browser pass

Tested the standalone `/goldrush-shop/` route on desktop and at a 390px phone viewport in isolated browser storage.

- Blank-name validation and explicit save-copy import worked.
- A test save with 200 coins bought Plasma for 150, leaving 50 and equipping Plasma. Reload preserved both.
- Frost purchase was disabled with insufficient funds.
- An already-owned Aurora equipped without a charge and survived reload.
- Themes, power-ups, extras, store and legacy Season Pass remained unavailable.
- No checkout, redemption or transaction-like network calls were made.
- Search empty-state recovery and collection filtering worked.
- Backup preserved unknown skin ownership and saved themes.
- Escape restored focus to Backup; dialog focus trapped correctly; category arrow navigation worked.
- No horizontal document overflow on desktop or phone.
- Separate new profile started with zero coins.
- Unavailable IndexedDB showed an explicit error and retry state.

Desktop, phone, purchase confirmation, disabled pass and focus-return screenshots were captured by the browser tester. The source-design desktop and new onboarding phone screenshots are under ignored `generated-artifacts/`.

After this pass, the saved-theme labels were clarified to “Saved choice” and “Preview only,” rather than implying active arena rendering. No transaction behavior changed.

## Remaining limitations

- Browser evidence is not native-device or App Store validation.
- Real-money checkout is intentionally blocked: no verified browser/native player linking or safe entitlement delivery exists.
- No real charge, code redemption, native save modification or publishing was performed.
- Imported local JSON is user-controlled, not an authenticated entitlement source.
