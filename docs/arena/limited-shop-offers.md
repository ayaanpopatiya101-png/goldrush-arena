# Limited shop offers — implementation and release gates

## Current status

No paid campaign is approved or active. No products, prices, offerings, charges,
discounts, new currency or production releases were created by this work.
The normal catalog remains separate from limited offers.

Read-only provider audit on 2026-11-12:

- Stripe is not connected in this workspace. Live product availability and prices
  could not be verified. Seed-script amounts are **not** current prices.
- RevenueCat has a current `default` offering with iOS and Android products.
  Its returned product data did not supply a supported localized launch price.
  iOS products are classified as non-renewing subscriptions; Android products,
  including skin bundles, are marked consumable. Those classifications do not
  provide a suitable non-consumable promotional skin bundle with reliable restore.
- No RevenueCat Test Store was returned by the audit. Tests used isolated
  provider-response fixtures, not actual App Store/Play sandbox transactions.
  Native store setup and real-device purchase evidence remain release gates.

## Owner proposal — NOT an activated campaign

Proposed contents: **2 existing paddle skins, Chrome and Cosmic**. No coins are
renamed, no gems are introduced, and no extra lives or gameplay advantages are
included. If the owner wants a currency promotion instead, use existing **coins**
and obtain a separate quantity and price approval; do not infer 10,000 coins or
a $5 price from the example.

Proposed UTC window: **2026-11-19T00:00:00Z through
2026-11-26T00:00:00Z**, start inclusive, end exclusive.
This is an approval proposal only, not a public countdown or scarcity claim.
If approval/configuration arrives after this window, propose fresh dates.

Supported price: **not yet verifiable**. Reconnect Stripe and obtain the actual
dedicated Price ID and localized store product prices before asking the owner to
approve the complete paid proposal. In particular, the historical Elite Bundle
seed amount is not evidence of a current $4.99 price or a discount.
No compare-at, “best deal,” “2 for 1,” or percentage-saving claim is authorized.

Owner must approve the final exact reward contents, dedicated provider mappings,
provider prices, UTC dates and one-purchase-per-guest limit before activation.
Approval of code is not approval to charge, activate or publish.

## Configuration checklist

1. Connect Stripe through the workspace integration. Use an active **one-time**
   Stripe Price with a positive fixed amount on an active product. Product metadata
   must include `store_campaign=<campaign id>`, `reward_type=skins`,
   `reward_skins=chrome,cosmic`, and an accurate `reward_label`.
   Campaign products are excluded from the standard products endpoint, and cannot
   use the generic checkout route.
2. Create dedicated, store-approved **non-consumable** native SKUs, not a standard
   catalog SKU with a temporary label. Map the exact native app, product, package
   and offering IDs. The current RevenueCat offering must have metadata
   `campaign_id`, `starts_at` and `ends_at` matching the approved UTC campaign
   exactly. Both the server and native SDK must see the mapped product.
3. Configure the RevenueCat project and native public SDK keys using the workspace
   configuration flow. The connected server-side RevenueCat integration must have
   customer-purchase and product/offerings read access. Receipt-verification
   availability is checked before the native purchase sheet opens.
4. Add only the owner-approved campaign to `storeCampaigns`. Keep unapproved
   drafts out of the advertised catalog. No admin approval endpoint trusts
   display names, client prices, claimed balances or client-supplied dates.
5. Apply the additive database schema using the existing post-merge setup.
   Configure Stripe webhook signing. Unsigned webhooks are rejected even in
   development; the payment-status route is a verified recovery path.
6. Run actual non-charging Stripe test and App/Play sandbox transactions after
   those provider environments exist. Do not substitute fixture success for
   sandbox, installed native or human approval evidence.

## Purchase authority and limits

- Server time controls eligibility at checkout, including a recheck after provider
  calls and database lock acquisition. Countdown text never authorizes a sale.
- One campaign reservation per server-issued guest identity covers both providers.
  Repeated web taps resume one open Checkout session. A provider-confirmed expired
  session can be replaced, but client cancellation alone cannot release a limit.
- Hosted Checkout closes no later than the approved end. Web sales stop starting
  new sessions 31 minutes before the end to satisfy Stripe's minimum session lifetime.
- Web fulfillment retrieves the real Checkout session again and checks paid,
  completed status. Campaign line items must match the reserved Price and
  quantity; the succeeded payment's charge must be paid and within the UTC window.
- Native fulfillment queries RevenueCat for the server-derived guest customer,
  matches the real store transaction and exact product, checks owned status,
  reservation ownership, quantity and purchase timestamp. Production rejects
  sandbox/Test Store receipts. Campaign native products must be non-consumable.
- The global provider receipt ledger and campaign reservation are committed
  atomically with one owner-bound reward code. Retrying a receipt returns its code,
  not another reward. A receipt cannot transfer to another guest or reservation.
- Failed, cancelled, pending, refunded and out-of-window transactions grant
  nothing. A paid transaction outside the accepted window requires manual
  support/refund investigation; the app does not silently substitute a reward.
- Provider outages are explicit errors. A saved native receipt can be retried
  without another purchase. A cancelled native sheet can resume the same reserved
  non-consumable product after checking saved receipts and store restore first.

## Delivery and guest boundaries

The game does not have verified cloud accounts. A display name is not payment
ownership. A server-issued guest credential is associated with each local profile;
RevenueCat uses a separate opaque server-derived purchase identity.

New owner-bound codes can only be claimed by their guest. A code retry by the
same guest returns the same reward, allowing recovery after a lost response or a
failed device save. The local profile commits reward and code marker in the same
storage write. Native receipts are saved before verification and removed only
after delivery, with a manual retry/restore path.

These are **device-local rewards**. Purchased coins never change the verified
online wallet. Purchased skins and pass ownership are not rewritten, and old local
native delivery markers are honored without awarding them again. Historical used
bearer codes without an owner remain consumed.

Do not delete the guest credential or local save when troubleshooting a purchase.
Uninstalling, deleting a guest profile or moving to another device is not a cloud
account restore. Native non-consumable restore depends on the store returning an
authentic owned receipt and the server ledger recognizing the same guest; a receipt
already assigned to a different guest is rejected rather than duplicated.
Store restore cannot recreate already-consumed coin/extra-life receipts.
Pending receipts previously saved on this device can still be retried.

The standalone collectible shop remains isolated and cannot charge or consume
game purchase codes.

## Verification

- `pnpm --filter @workspace/api-server run test:store`: isolated provider-response
  fixtures, actual API handlers and actual development database transactions.
  Fixtures cannot call a provider or activate a running campaign.
- `pnpm --filter @workspace/mobile run test:store`: executes actual player
  callbacks with memory storage; covers concurrent receipt retries, reload,
  pending verification, failed profile save and interruption after reward commit.
- API/mobile TypeScript checks and browser export.
- iOS and Android JavaScript/Hermes exports passed with one Metro worker per
  platform. These are compilation checks, not signed builds or device purchases.
- Browser walkthrough at 400×850 confirmed empty/unavailable catalog states,
  disabled expired/upcoming/claimed fixture cards, both skin previews, a single
  price-free POST on rapid taps, explicit 409 rejection and unchanged device coins.
  It identified a generic connection-error message for disconnected Stripe;
  the catalog now preserves the explicit provider-unavailable response instead.
- No real charge, actual store sandbox receipt, native installation or launch
  activation is claimed by these checks.
