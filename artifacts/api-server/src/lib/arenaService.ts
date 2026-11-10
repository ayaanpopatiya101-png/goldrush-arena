import { randomUUID } from "node:crypto";
import { advanceSeason, initialSeason, seasonKey } from "./competition.js";
import { db, arenaPlayers, arenaResults } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import type { LiveResult, QueueInput } from "@workspace/api-zod";
import { RULES, stepArena, spawnBall, eliminate, finishIfNeeded, type ArenaRoom, type SimPlayer } from "./arenaSimulation.js";
import type { ArenaIdentity } from "./arenaIdentity.js";
import { logger } from "./logger.js";

export const rooms = new Map<string, ArenaRoom>();
export const playerRooms = new Map<string, string>();
export const REGION = "primary";
export function currentRoom(id: string) { return rooms.get(playerRooms.get(id) ?? ""); }
export function publicRoom(room: ArenaRoom) {
  return { id: room.id, mode: room.mode, variant: room.variant, region: room.region,
    phase: room.phase, startAt: room.startAt, serverTime: Date.now(), createdAt: room.createdAt,
    tick: room.tick, reason: room.reason,
    players: room.players.map(({ target, seen, nextThink, seq, ...p }) => p),
    balls: room.balls.map(({ id, x, y }) => ({ id, x, y })) };
}
export function joinRoom(identity: ArenaIdentity, input: QueueInput, reservedIds?: string[]) {
  const previous = currentRoom(identity.id);
  if (previous && !["finished", "void"].includes(previous.phase)) return previous;
  if (rooms.size >= 1000) throw new Error("Match server is busy. Please try again.");
  const now = Date.now();
  let room = [...rooms.values()].find(r => r.phase === "waiting" && r.players.length < 4 &&
    r.mode === input.mode && r.variant === input.variant &&
    (input.partyCode ? r.partyCode === input.partyCode :
      r.players.length + (r.reservedIds?.filter(id => !r.players.some(p => p.id === id)).length ?? 0) < 4) &&
    (input.partyCode || Math.abs(r.latency - input.latency) <= 150) &&
    (input.partyCode || Math.abs(r.createdRating - identity.rating) <= Math.min(600, 150 + (now-r.createdAt)/100)));
  if (!room) {
    room = { id: randomUUID(), phase: "waiting", mode: input.mode, variant: input.variant,
      region: REGION, latency: input.latency, createdRating: identity.rating,
      players: [], balls: [], tick: 0, serverTime: now, startAt: 0, createdAt: now,
      reason: "", nextBall: 0, partyCode: input.partyCode, reservedIds };
    rooms.set(room.id, room);
  }
  const p: SimPlayer = { id: identity.id, name: input.name.trim() || "Player", color: input.color,
    avatarUrl: identity.avatarShared && identity.avatarId ? `/api/avatars/${identity.avatarId}` : null,
    seat: room.players.length, isBot: false, connected: false, paddle: 500,
    lives: RULES[room.variant]!.lives, hits: 0, goals: 0, place: 0,
    rating: identity.rating, target: 500, seen: now, nextThink: 0, seq: -1 };
  room.players.push(p); playerRooms.set(identity.id, room.id);
  return room;
}
export function leaveRoom(id: string) {
  const room = currentRoom(id);
  if (!room) return;
  const p = room.players.find(p => p.id === id);
  if (!p) return;
  if (room.phase === "waiting" || room.phase === "countdown") {
    playerRooms.delete(id);
    room.reservedIds = room.reservedIds?.filter(v => v !== id);
    room.players = room.players.filter(p => p.id !== id && !p.isBot);
    room.players.forEach((p, seat) => { p.seat = seat; });
    room.phase = "waiting"; room.startAt = 0; room.createdAt = Date.now();
  } else if (room.phase === "playing") {
    // Retain the old participant/receipt, but free this identity to enter a new queue.
    playerRooms.delete(id);
    p.connected = false; eliminate(room, p); finishIfNeeded(room);
  } else if (room.phase === "finished" || room.phase === "void") {
    playerRooms.delete(id);
  }
  if (!room.players.some(p => !p.isBot)) rooms.delete(room.id);
}
export async function persistResults(room: ArenaRoom) {
  if (room.saving || room.phase !== "saving") return;
  room.saving = true;
  try {
    await db.transaction(async tx => {
      for (const p of room.players.filter(p => !p.isBot).sort((a, b) => a.id.localeCompare(b.id))) {
        // A forfeited player's next match may finish first. Lock current rating
        // rather than overwriting it with the old room's start-of-match value.
        const [stored] = await tx.select().from(arenaPlayers).where(eq(arenaPlayers.id, p.id)).for("update");
        const season = seasonKey(room.createdAt);
        const state = stored!.competitive[season] ?? initialSeason();
        const ratingBefore = state.rating;
        const humans = room.players.filter(p => !p.isBot).length;
        const ranked = room.mode === "ranked" && humans === 4;
        const next = ranked ? advanceSeason(state, p.place, room.players.filter(v => v.id !== p.id).map(v => v.rating), room.variant === "duos") : state;
        const result: LiveResult = {
          matchId: room.id, playerId: p.id, won: p.place === 1, position: p.place,
          deflections: p.hits, goalsAgainst: p.goals,
          xpEarned: (p.place === 1 ? 150 : 50) + Math.min(p.hits, 100),
          coinsEarned: p.place === 1 ? 40 : 10,
          matchType: ranked ? "ranked" : "casual", humanCount: humans,
          ratingBefore, ratingAfter: next.rating,
        };
        const inserted = await tx.insert(arenaResults).values({ id: `${room.id}:${p.id}`,
          matchId: room.id, playerId: p.id, receipt: result }).onConflictDoNothing().returning();
        if (inserted.length) await tx.update(arenaPlayers).set({
          rating: result.ratingAfter,
          competitive: ranked ? { ...stored!.competitive, [season]: next } : stored!.competitive,
          earnedCoins: sql`${arenaPlayers.earnedCoins} + ${result.coinsEarned}`,
          earnedXP: sql`${arenaPlayers.earnedXP} + ${result.xpEarned}`,
        }).where(eq(arenaPlayers.id, p.id));
      }
    });
    room.phase = "finished"; room.finishedAt = Date.now(); room.reason = "";
  } catch (err) {
    room.reason = "Saving verified results. Please stay connected; rewards will not be duplicated.";
    logger.error({ err, matchId: room.id }, "Arena receipt persistence failed");
  } finally { room.saving = false; }
}
export function tickRooms(now = Date.now()) {
  for (const room of rooms.values()) {
    if (room.phase === "waiting") {
      for (const p of [...room.players]) if (!p.isBot && now - p.seen > 20_000) leaveRoom(p.id);
      const connected = room.players.length > 0 && room.players.every(p => p.isBot || p.connected);
      const reserved = room.reservedIds?.some(id => !room.players.some(p => p.id === id));
      // Parties get time for everyone; server party membership is checked by the join route.
      if (room.mode === "casual" && now-room.createdAt >= 5000 && connected && !reserved) {
        const names = ["Cedar", "Marlow", "Finch", "Rowan"];
        while (room.players.length < 4) {
          const seat = room.players.length;
          room.players.push({ id: `ai-${randomUUID()}`, name: names[seat]!, color: ["#F36B3F","#EDBA3C","#EEE9DE","#E3DFD3"][seat]!,
            seat, isBot: true, connected: true, paddle: 500, target: 500, lives: RULES[room.variant]!.lives,
            hits: 0, goals: 0, place: 0, rating: room.createdRating, seen: now, nextThink: 0, seq: -1 });
        }
      }
      if (room.players.length === 4 && connected) { room.phase = "countdown"; room.startAt = now + 3000; }
    } else if (room.phase === "countdown") {
      if (room.players.some(p => !p.isBot && !p.connected)) { room.phase = "waiting"; room.startAt = 0; }
      else if (now >= room.startAt) {
        room.phase = "playing";
        for (let i = 0; i < RULES[room.variant]!.balls; i++) spawnBall(room);
      }
    } else if (room.phase === "playing") {
      if (!room.players.some(p => !p.isBot && now-p.seen < 20000)) {
        room.phase = "void"; room.reason = "All players disconnected. Match cancelled without rewards.";
      } else stepArena(room, now);
    } else if (room.phase === "saving" && room.tick % 60 === 0) { void persistResults(room); }
    if (room.phase === "saving") room.tick++;
    if (room.phase === "finished" || room.phase === "void") {
      room.finishedAt ??= now;
      if (now-room.finishedAt > 120000) {
        rooms.delete(room.id);
        for (const p of room.players) if (playerRooms.get(p.id) === room.id) playerRooms.delete(p.id);
      }
    }
  }
}
