# Profile and progression verification

## Preserved boundaries

- Carbon + Lime theme and original cosmetic identities remain unchanged.
- Legacy avatar identifiers are rendered by the existing vector mapping; saves and private photo ownership are not migrated.
- Reward definitions, IDs, amounts, season data and entitlements are unchanged.
- The progression screen only reads provider prices and links to the existing Shop.
- Native digital purchases remain with RevenueCat; web checkout remains with Stripe.
- No charges, live entitlement grants, deployments or standalone-shop changes were performed.

## Automated checks

- Mobile and shared browser TypeScript checks pass.
- The reliability suite passes, including actual provider pricing, native unavailability, reward gating and original theme contrast.
- Production PlayerProvider callbacks are exercised for simultaneous/mixed claims, duplicate claims, failed writes and retry, reload persistence, Plus cosmetics, bank lives and multi-drop rewards.
- Browser export completed with one Metro worker and the managed browser workflow starts successfully.

## Browser evidence

An isolated local-storage test player was used, not an existing player's save.

- Free tier claims, Plus-owner claims, daily quest claims and Trophy Road claims award once and remain claimed after reload.
- Unowned Plus and locked rewards are inspectable without a claim action.
- Avatar cancellation preserves the saved legacy choice; original achievement artwork is visible.
- Shop availability navigation opens its Store section directly.
- The current development Stripe catalog returns an unavailable-provider error. The UI does not fabricate a price or open checkout.
- Escape removes the reward dialog and scrim and leaves the app interactive.
- Trophy Road's return control works after reloading that route.
- Profile, Pass, cosmetic inspection and Trophy Road were checked at 320×720 and 375×812.
- A 150% browser-zoom approximation confirmed Pass and Road reflow and scrolling. It exposed Profile header/name constraints, subsequently corrected by separating the coin badge and bounding the name to the card width.

## Native evidence boundary

No physical iOS/Android device, installed native build, native OS text-scaling test, restore transaction or real purchase was exercised. Browser zoom is not native Dynamic Type evidence. Existing real-phone verification work remains separate.
