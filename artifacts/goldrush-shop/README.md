# GoldRush Collectible Shop

Standalone browser app at `/goldrush-shop/`. The mobile app and every canvas frame are preserved.

## Storage and progress

- New counter profiles start with **0 coins** and Classic. This is an isolated profile, not the native game's default balance or a reward grant.
- IndexedDB stores wallet, owned skins, equipped selection, and saved theme ownership in a single atomic record. Readwrite transactions serialize across tabs. Duplicate purchases are rejected at commit time.
- An optional existing-save JSON import is a **one-time copy**, only before a counter profile exists. It preserves unknown ownership IDs and the full original payload, including legacy entitlements. It does not read native storage or establish identity.
- Backup exports are shop backups. They may be imported in a browser with no counter profile. They are not native-game save exports and cannot sync purchases back to the game.
- No automatic overwrite, reset, free-coin grant, code redemption or native-save writes. Clearing site data can erase the counter. Export a backup first.
- Local saves are editable by their owner. They are never proof of payment, cloud identity or a verified entitlement.

## Catalog boundary

`@workspace/goldrush-catalog` contains framework-independent catalog data and skin purchase guards extracted from the current native shop and PlayerContext. The native source remains unchanged. A parity regression test prevents drift in skin IDs, prices, colors and pass exclusivity.

Normal coin skins can be purchased and are automatically equipped, matching the game rule. Owned pass skins can be equipped, but cannot be purchased. Themes, trails and power-up bundles remain unavailable, even from the detail and confirmation controls. Imported theme ownership is preserved.

## Payment decision

The existing API uses Stripe hosted Checkout, verifies paid sessions and issues one-time redeem codes. It does **not** attribute checkout to a verified game player. The native RevenueCat integration remains in the mobile artifact, with store-provided pricing and transaction fulfillment.

This new browser profile has no authenticated linking or safe reward delivery. Therefore all real-money actions and redemption are explicitly unavailable. The shop makes no checkout, redemption, RevenueCat, or price-list requests and does not show fallback dollar amounts. This avoids consuming a code into a separate browser copy or implying delivery to a native save. Legacy Season Pass remains disabled, regardless of provider configuration.

Enabling payments would require a separately approved authenticated player-linking and entitlement-delivery design. Merely connecting a provider or entering a local player name is not sufficient.

## Verification commands

```sh
pnpm run typecheck:libs
pnpm --filter @workspace/goldrush-shop typecheck
pnpm --filter @workspace/goldrush-shop test
PORT=24874 BASE_PATH=/goldrush-shop/ pnpm --filter @workspace/goldrush-shop build
```

Start through the managed `artifacts/goldrush-shop: web` workflow.
