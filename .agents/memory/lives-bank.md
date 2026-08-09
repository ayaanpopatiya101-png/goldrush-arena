---
name: Lives Bank system
description: How the bank lives feature works end-to-end — sources, cap rules, lobby selector, consumption, referral.
---

## The rule
`extraLivesInventory` (PlayerProfile) = the bank. Players pick how many to spend in the lobby before queueing; deducted from bank at `handleGameStart` in game.tsx.

## Cap per match
- Champion+ (getRankIndex(rank) >= 15): max 2 lives/match
- Everyone else: max 3 lives/match

## Sources
1. **Lucky Blocks**: Dragon Cache (legendary) = 1 life; Nexus Core (ultra) = 2 lives — awarded by `openLuckyBlock` via `reward.lives`.
2. **Battle Pass**: free track slot 50 = 1 bank_life; premium track slots 20 and 35 = 1 bank_life each. Claimed by `claimBattlePassTier` handling `bank_life` reward type.
3. **Referral**: referrer earns 10K coins OR 1 bank life when friend enters their code. `claimReferralReward('life')` applies it.
4. **Win streak**: ultra tier (≥25 wins) awards a Nexus Core block → 2 lives. Legendary tier (≥20 wins) → 1 life via the block.

## Flow in game.tsx
- `bankLivesUsed = config.bankLivesUsed ?? 0` (set by lobby via `updateGameConfig`)
- `mergedCfg.playerBonusLives = variantBonusLives + bankLivesUsed`
- `handleGameStart`: calls `consumeExtraLives(bankLivesUsed)` — non-refundable

## Referral API (api-server)
- In-memory Maps; resets on server restart (fine for dev; prod would need DB)
- `GET /referral/code/:playerId` — generate/retrieve code
- `POST /referral/redeem` — friend enters referrer's code; referrer gets +1 pendingRewards
- `GET /referral/pending/:playerId` — how many rewards waiting
- `POST /referral/claim/:playerId` — decrement after mobile applies reward
- playerId = profile.name (stable per player within the same device)

**Why:** Using profile.name as stable ID keeps the referral system serverless-friendly (no auth token needed) and avoids adding a UUID field to PlayerProfile.
