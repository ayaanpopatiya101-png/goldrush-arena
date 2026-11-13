import test, { after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { db, pool, arenaPlayers, arenaResults } from "@workspace/db";
import { eq } from "drizzle-orm";
import router from "../src/routes/multiplayer.js";
import { issueIdentity } from "../src/lib/arenaIdentity.js";
import { initialSeason, seasonKey } from "../src/lib/competition.js";

const app = express();
app.use(express.json());
app.use(router);
const server = app.listen(0, "127.0.0.1");
const ready = new Promise<void>(resolve => server.once("listening", resolve));
const owners: Awaited<ReturnType<typeof issueIdentity>>[] = [];
async function call(token: string, path = "", body?: object) {
  await ready;
  const { port } = server.address() as { port: number };
  return fetch(`http://127.0.0.1:${port}/multiplayer/leaderboard${path}`, {
    method: body ? "PUT" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
after(async () => {
  for (const o of owners) {
    await db.delete(arenaResults).where(eq(arenaResults.playerId, o.playerId));
    await db.delete(arenaPlayers).where(eq(arenaPlayers.id, o.playerId));
  }
  await new Promise<void>(resolve => server.close(() => resolve()));
  await pool.end();
});
test("authenticated leaderboard API validates filters, persists privacy and excludes unverified activity", async t => {
  const a = await issueIdentity(); owners.push(a);
  const b = await issueIdentity(); owners.push(b);
  const season = seasonKey();
  for (const owner of owners) {
    await db.update(arenaPlayers).set({
      competitive: { [season]: { ...initialSeason(), games: 5, wins: 2, rating: 1250, peak: 1300 } },
      cosmetics: { preservedOwnership: ["existing-item"] },
    }).where(eq(arenaPlayers.id, owner.playerId));
  }
  // Only A has a valid four-human ranked receipt. B's casual receipt cannot satisfy activity.
  for (const [owner, matchType] of [[a, "ranked"], [b, "casual"]] as const) {
    await db.insert(arenaResults).values({ id: `ladder-test:${owner.playerId}`, playerId: owner.playerId,
      matchId: "ladder-test", receipt: { matchType, humanCount: 4 } });
  }
  const [clock] = await db.select({ createdAt: arenaResults.createdAt }).from(arenaResults).where(eq(arenaResults.playerId, a.playerId));
  assert.ok(Math.abs(clock!.createdAt.getTime() - Date.now()) < 60_000, `Receipt clock ${clock!.createdAt.toISOString()}, server clock ${new Date().toISOString()}`);
  await t.test("requires identity and rejects malformed filters or identity injection", async () => {
    assert.equal((await call("invalid")).status, 401);
    for (const path of ["?page=0", "?page=1.5", "?page=21", "?season=2026-13", "?division=Radiant"]) {
      assert.equal((await call(a.token, path)).status, 400, path);
    }
    assert.equal((await call(a.token, "/profile", { anonymous: false, nickname: "Valid", playerId: b.playerId })).status, 400);
    assert.equal((await call(a.token, "/profile", { anonymous: false, nickname: "<script>" })).status, 400);
  });
  await t.test("public nickname is explicit, survives reload and preserves other cosmetics", async () => {
    const response = await call(a.token, "/profile", { anonymous: false, nickname: "Ladder fixture" });
    assert.equal(response.status, 200);
    const result = await (await call(a.token, "?search=Ladder%20fixture")).json() as any;
    assert.equal(result.entries.length, 1, JSON.stringify(result));
    assert.equal(result.entries[0].name, "Ladder fixture");
    assert.equal(result.entries[0].isYou, true);
    assert.equal(result.entries[0].rating, 1250);
    const [stored] = await db.select().from(arenaPlayers).where(eq(arenaPlayers.id, a.playerId));
    assert.deepEqual(stored!.cosmetics.preservedOwnership, ["existing-item"]);
    const other = await (await call(b.token)).json() as any;
    assert.equal(other.eligibility, "inactive");
    assert.equal(other.yourPosition, null);
    assert.ok(!other.entries.some((e: any) => e.isYou));
  });
  await t.test("returning to anonymity removes public name from search and never exposes tokens or IDs", async () => {
    assert.equal((await call(a.token, "/profile", { anonymous: true, nickname: "Ladder fixture" })).status, 200);
    const result = await (await call(a.token, "?search=Ladder%20fixture")).json() as any;
    assert.equal(result.entries.length, 0);
    const all = await (await call(a.token)).json() as any;
    const mine = all.entries.find((e: any) => e.isYou);
    assert.match(mine.name, /^Player-[A-F0-9]{8}$/);
    const serialized = JSON.stringify(all.entries);
    assert.ok(!serialized.includes(a.token));
    assert.ok(!serialized.includes(a.playerId));
  });
});
