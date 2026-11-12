import { createHmac } from 'node:crypto';
import { db, arenaPlayers, purchaseCodes, storeReceipts, storeReservations } from '@workspace/db';
import { eq } from 'drizzle-orm';
import type { StoreReward } from './storeRewards.js';

export function receiptCode(receiptId: string) {
  if (!process.env.SESSION_SECRET) throw new Error('Purchase delivery is unavailable.');
  const digest = createHmac('sha256', process.env.SESSION_SECRET).update(receiptId).digest('hex').toUpperCase();
  return `GR-${digest.slice(0, 12)}-${digest.slice(12, 24)}`;
}

/** Server authority only: caller must verify the provider transaction before entering here. */
export async function deliverVerifiedPurchase(input: {
  receiptId: string; playerId: string; reward: StoreReward; reservationId?: string;
}) {
  return db.transaction(async tx => {
    // Serialize a player's purchases and the shared cross-provider campaign limit.
    const [player] = await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id, input.playerId)).for('update');
    if (!player) throw new Error('Purchase owner no longer exists. Contact support with your receipt.');
    const [existing] = await tx.select().from(storeReceipts).where(eq(storeReceipts.id, input.receiptId));
    if (existing) {
      if (existing.playerId !== input.playerId || (existing.reservationId ?? undefined) !== input.reservationId)
        throw new Error('This receipt already belongs to another purchase or guest.');
      return existing.code;
    }
    if (input.reservationId) {
      const [reservation] = await tx.select().from(storeReservations).where(eq(storeReservations.id, input.reservationId)).for('update');
      if (!reservation || reservation.playerId !== input.playerId || reservation.status !== 'pending')
        throw new Error('This offer is already claimed or does not belong to this guest.');
      await tx.update(storeReservations).set({ status: 'fulfilled' }).where(eq(storeReservations.id, reservation.id));
    }
    const code = receiptCode(input.receiptId);
    await tx.insert(storeReceipts).values({ id: input.receiptId, playerId: input.playerId, reservationId: input.reservationId, code });
    await tx.insert(purchaseCodes).values({ code, claimedBy: input.playerId, rewardJson: JSON.stringify(input.reward) });
    return code;
  });
}
