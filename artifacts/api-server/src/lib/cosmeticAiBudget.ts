import { db, cosmeticAiUsage } from "@workspace/db";
import { eq } from "drizzle-orm";
export async function reserveCosmeticAi(playerId: string) {
  const day = new Date().toISOString().slice(0,10);
  return db.transaction(async tx => {
    let remaining = 0;
    for (const [id,cap] of [[`global:${day}`,100],[`player:${playerId}:${day}`,10]] as const) {
      await tx.insert(cosmeticAiUsage).values({id,count:0}).onConflictDoNothing();
      const [r] = await tx.select().from(cosmeticAiUsage).where(eq(cosmeticAiUsage.id,id)).for("update");
      if (r!.count >= cap) throw new Error("Daily AI request limit reached. Manual editing remains available.");
      await tx.update(cosmeticAiUsage).set({count:r!.count+1}).where(eq(cosmeticAiUsage.id,id));
      remaining = cap-r!.count-1;
    }
    return remaining;
  });
}
