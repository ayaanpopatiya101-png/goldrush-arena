import type { LivePlayer, LiveRoom } from "@workspace/api-zod";

export type SimPlayer = LivePlayer & { target: number; seen: number; nextThink: number; seq: number };
type Ball = { id: number; x: number; y: number; vx: number; vy: number };
export type ArenaRoom = Omit<LiveRoom, "players" | "balls"> & {
  players: SimPlayer[]; balls: Ball[]; partyCode?: string; latency: number;
  nextBall: number; finishedAt?: number; saving?: boolean; createdRating: number; reservedIds?: string[];
};
export const RULES: Record<string, { lives: number; balls: number; speed: number; spawn: number }> = {
  classic: { lives: 5, balls: 1, speed: 300, spawn: 10 },
  rally_race: { lives: 5, balls: 1, speed: 300, spawn: 15 },
  duos: { lives: 5, balls: 1, speed: 300, spawn: 7 },
  blitz: { lives: 1, balls: 2, speed: 450, spawn: 10 },
  chaos: { lives: 3, balls: 5, speed: 360, spawn: 5 },
  survival: { lives: 12, balls: 1, speed: 300, spawn: 5 },
  sudden_death: { lives: 1, balls: 3, speed: 600, spawn: 4 },
  turbo: { lives: 5, balls: 1, speed: 540, spawn: 8 },
  pinball: { lives: 5, balls: 1, speed: 300, spawn: 3 },
};
export const clamp = (v: number) => Math.max(130, Math.min(870, v));
export function spawnBall(room: ArenaRoom, random = Math.random) {
  const angle = random() * Math.PI * 2;
  const speed = Math.min(760, (RULES[room.variant]?.speed ?? 300) * (1 + room.tick / 36000));
  room.balls.push({ id: room.nextBall++, x: 500, y: 500, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
}
export function eliminate(room: ArenaRoom, p: SimPlayer) {
  if (p.place) return;
  p.lives = 0;
  p.place = room.players.filter(v => !v.place).length;
}
export function finishIfNeeded(room: ArenaRoom) {
  const alive = room.players.filter(p => p.lives > 0);
  const team = (p: SimPlayer) => p.seat === 0 || p.seat === 3 ? 0 : 1;
  if (alive.length <= 1 || (room.variant === "duos" && new Set(alive.map(team)).size <= 1)) {
    if (!alive.length) { room.phase = "void"; room.reason = "No surviving player. No rewards issued."; return; }
    for (const p of alive) p.place = 1;
    if (room.variant === "duos") {
      const winningTeam = team(alive[0]!);
      for (const p of room.players) p.place = team(p) === winningTeam ? 1 : 3;
    }
    room.phase = "saving";
  }
}
/** Fixed 60 Hz authority. Clients submit only bounded paddle intent, never ball/life state. */
export function stepArena(room: ArenaRoom, now: number, random = Math.random) {
  if (room.phase !== "playing") return;
  room.tick++;
  for (const p of room.players) {
    if (!p.lives) continue;
    if (!p.isBot && now - p.seen > 20_000) { eliminate(room, p); continue; }
    if (p.isBot && now >= p.nextThink) {
      p.nextThink = now + 180 + random() * 260;
      const horizontal = p.seat < 2;
      const incoming = room.balls.filter(b => p.seat === 0 ? b.vy > 0 : p.seat === 1 ? b.vy < 0 : p.seat === 2 ? b.vx < 0 : b.vx > 0);
      const b = incoming.sort((a, b) => {
        const dist = (v: Ball) => p.seat === 0 ? 960-v.y : p.seat === 1 ? v.y-40 : p.seat === 2 ? v.x-40 : 960-v.x;
        return dist(a) - dist(b);
      })[0];
      p.target = clamp(b ? (horizontal ? b.x : b.y) + (random() - .5) * 150 : 500);
    }
    // Same speed cap for humans and AI, including after reconnect.
    p.paddle = clamp(p.paddle + Math.max(-12, Math.min(12, p.target - p.paddle)));
  }
  for (const b of room.balls) {
    b.x += b.vx / 60; b.y += b.vy / 60;
    const seat = b.y >= 948 && b.vy > 0 ? 0 : b.y <= 52 && b.vy < 0 ? 1 : b.x <= 52 && b.vx < 0 ? 2 : b.x >= 948 && b.vx > 0 ? 3 : -1;
    if (seat < 0) continue;
    const p = room.players[seat]!;
    const coordinate = seat < 2 ? b.x : b.y;
    if (p.lives <= 0 || Math.abs(coordinate - p.paddle) <= 102) {
      if (p.lives > 0) p.hits++;
      if (seat < 2) { b.vy *= -1; b.y = seat === 0 ? 947 : 53; }
      else { b.vx *= -1; b.x = seat === 3 ? 947 : 53; }
      // A small impact angle based on paddle position avoids endless axis loops.
      if (p.lives > 0) {
        const speed = Math.min(760, Math.hypot(b.vx, b.vy) * 1.015);
        const tangent = Math.max(-.8, Math.min(.8, (coordinate - p.paddle) / 120));
        if (seat < 2) { b.vx = tangent * speed; b.vy = (seat === 0 ? -1 : 1) * speed * Math.sqrt(1-tangent*tangent); }
        else { b.vy = tangent * speed; b.vx = (seat === 3 ? -1 : 1) * speed * Math.sqrt(1-tangent*tangent); }
      }
    } else {
      p.goals++; if (room.variant !== "rally_race") p.lives--;
      if (p.lives === 0) eliminate(room, p);
      const angle = random() * Math.PI * 2;
      const speed = RULES[room.variant]!.speed;
      b.x = 500; b.y = 500; b.vx = Math.cos(angle)*speed; b.vy = Math.sin(angle)*speed;
    }
  }
  const first = room.variant === "classic" ? 7 * 60 : RULES[room.variant]!.spawn * 60;
  const interval = RULES[room.variant]!.spawn * 60;
  if (room.tick >= first && (room.tick - first) % interval === 0 && room.balls.length < 8) spawnBall(room, random);
  finishIfNeeded(room);
  if (room.variant === "rally_race" && room.tick >= 3600 && room.phase === "playing") {
    const contenders = room.players.filter(p => !p.place).sort((a, b) => (b.hits - 2*b.goals) - (a.hits - 2*a.goals));
    if (contenders.length < 2 || contenders[0]!.hits - 2*contenders[0]!.goals === contenders[1]!.hits - 2*contenders[1]!.goals) {
      room.phase = "void"; room.reason = "Rally Race ended tied. No winner or rewards issued.";
    } else {
      contenders.forEach((p, i) => { p.place = i + 1; });
      room.phase = "saving";
    }
  }
  // Never fabricate a winner for stalled/overlong games.
  if (room.tick >= 60 * 600 && room.phase === "playing") {
    room.phase = "void"; room.reason = "Time limit reached without a winner. No rewards issued.";
  }
}
