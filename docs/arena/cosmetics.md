# Cosmetics, private design studio and verified coin shop

Original motifs (chevrons, circuitry, checks, rays, waves, facets, racing marks
and crosshatching) and bounded etched/grain textures preserve all legacy skin
IDs. Native SVG primitives render the same parameters in preview and play.
Custom designs never include executable code, external URLs or raw SVG.

## Wallet and ownership
New coin purchases use online match earnings less recorded cosmetic spending.
Device coins and old entitlements are preserved, not imported as trusted money.
Existing owned items can still be selected; the server's `legacy` selection
explicitly delegates only the local visual choice to that saved profile.
Cash fulfilment remains Stripe on web and RevenueCat on native; no new cash
product, pay-to-win modifier, or unverified currency import was introduced.

Purchases lock the owning player row, recompute prices and ownership, and record
an idempotency receipt in the same transaction. Repeated request IDs cannot
charge twice or buy a different item. Online reward grants remain protected by
the existing unique match/player receipt transaction.

Cobalt Court is 300 coins and Cobalt Strike is 200 separately. The full set
costs 200. Owned pieces are excluded and the 60% discount is prorated: 80 for
the remaining strike or 120 for the remaining court. Offers appear only after
successful single-item purchases, at most once per 24 hours, with a persistent
dismissal. Fixed catalogue purchases still require confirmation.

## Studio and AI
Twenty private designs per guest; create/revise/save/equip/delete are server
owned. Deleting the active custom design restores Classic. Local profile
retirement clears the server designs and invalidates the username's cache epoch.
Designs affect the owner's rendering; there is no public AI design marketplace.

AI uses Replit AI Integrations for OpenAI with gpt-5-mini, bounded input and
validated parameter-only JSON. Limits: ten attempts per player per UTC day,
100 total attempts per UTC day, persisted in PostgreSQL. Failed provider
attempts count toward the limit. Manual editing remains available. Prompts and
current design parameters go to the provider; there are no avatar uploads here.
Usage is billed to the project's Replit credits.

## Trials and verification
Warm-up trials accept a known catalogue item or an owned saved design. They
never purchase, equip, grant inventory, change score, or award coins. Closing
the trial returns to the saved selection. Effects only change hit/goal visuals.
Reduced motion suppresses transient effects.

API integration checks cover concurrent purchases, insufficient funds, repeat
requests, owned exclusions, real prices, exclusive locks, cross-owner design
equip denial, save/delete, offer frequency/dismissal and a real AI response.
Native gallery permissions and cash store approval are separate release gates.
