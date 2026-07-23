import { db, purchaseCodes } from '@workspace/db';
import { eq } from 'drizzle-orm';

export class Storage {
  async verifyAndClaimCode(code: string): Promise<{ reward: any } | null> {
    const rows = await db
      .select()
      .from(purchaseCodes)
      .where(eq(purchaseCodes.code, code))
      .limit(1);

    const row = rows[0];
    if (!row || row.used) return null;

    await db
      .update(purchaseCodes)
      .set({ used: true })
      .where(eq(purchaseCodes.code, code));

    return { reward: JSON.parse(row.rewardJson) };
  }
}

export const storage = new Storage();
