import { db, purchaseCodes } from '@workspace/db';
import { and, eq, or, isNull } from 'drizzle-orm';

export class Storage {
  async verifyAndClaimCode(code: string, playerId: string): Promise<{ reward: any } | null> {
    const rows = await db
      .update(purchaseCodes)
      .set({ used: true, claimedBy: playerId })
      // Owner-bound retries survive a lost response or a failed device save.
      // Legacy used bearer codes without an owner remain used, never reclaimed.
      .where(and(eq(purchaseCodes.code, code), or(
        eq(purchaseCodes.claimedBy, playerId),
        and(isNull(purchaseCodes.claimedBy), eq(purchaseCodes.used, false)),
      )))
      .returning({ rewardJson: purchaseCodes.rewardJson });

    const row = rows[0];
    if (!row) return null;

    return { reward: JSON.parse(row.rewardJson) };
  }
}

export const storage = new Storage();
