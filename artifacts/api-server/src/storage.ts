import { db, purchaseCodes } from '@workspace/db';
import { and, eq } from 'drizzle-orm';

export class Storage {
  async verifyAndClaimCode(code: string): Promise<{ reward: any } | null> {
    const rows = await db
      .update(purchaseCodes)
      .set({ used: true })
      .where(and(eq(purchaseCodes.code, code), eq(purchaseCodes.used, false)))
      .returning({ rewardJson: purchaseCodes.rewardJson });

    const row = rows[0];
    if (!row) return null;

    return { reward: JSON.parse(row.rewardJson) };
  }
}

export const storage = new Storage();
