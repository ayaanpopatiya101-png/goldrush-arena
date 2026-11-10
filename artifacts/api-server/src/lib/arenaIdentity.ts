import { randomBytes, randomUUID, createHash } from "node:crypto";
import { db, arenaPlayers } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export type ArenaIdentity = typeof arenaPlayers.$inferSelect;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function issueIdentity() {
  const token = randomBytes(32).toString("hex");
  const playerId = randomUUID();
  await db.insert(arenaPlayers).values({ id: playerId, tokenHash: hash(token) });
  return { playerId, token };
}
export async function resolveIdentity(token: unknown): Promise<ArenaIdentity | null> {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;
  const [player] = await db.select().from(arenaPlayers).where(eq(arenaPlayers.tokenHash, hash(token)));
  return player ?? null;
}
export async function requireArenaIdentity(req: Request, res: Response, next: NextFunction) {
  const player = await resolveIdentity(req.headers.authorization?.replace(/^Bearer /, ""));
  if (!player) { res.status(401).json({ error: "Player session required. Your local save is unchanged." }); return; }
  res.locals.arenaPlayer = player;
  next();
}
// Bounded, expiring IP buckets. Never store raw tokens or forwarded client IDs.
const buckets = new Map<string, { count: number; until: number }>();
export function limited(key: string, limit: number, window = 60_000) {
  const now = Date.now();
  if (buckets.size > 10000) for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  let bucket = buckets.get(key);
  if (!bucket || bucket.until < now) {
    if (buckets.size >= 20000) return true;
    bucket = { count: 0, until: now + window }; buckets.set(key, bucket);
  }
  return ++bucket.count > limit;
}
