---
name: Multiplayer trust boundaries
description: Fair online rules, legacy save separation, and live-server deployment constraints.
---

Keep online match authority separate from legacy device-local progress and purchases.

**Why:** Existing local balances and ranks are editable device data, so importing them as trusted server currency or skill would compromise matchmaking and future purchasing. Online play deliberately excludes bank lives and relic/map bonuses without deleting ownership.

**How to apply:** Derive match outcomes and online awards on the server, retain immutable player/match receipts, and never apply local event multipliers to verified online rewards. Preserve local saves and payment entitlements when extending the server ledger.

Live rooms currently require one authoritative process; database-backed identity and receipts do not make simulation state shared across replicas.

**Why:** Independent workers would return missing rooms or different simulations for the same player. Interrupted games must be explicit and must never become fabricated local-bot wins.

**How to apply:** Before multi-instance or multi-region deployment, implement room ownership and connection routing. Distinguish a four-client protocol test from four humans on physical devices.
