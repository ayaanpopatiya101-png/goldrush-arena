/** Shared fixed-step authority. The workshop preview runs precisely this simulation. */
export interface WorkshopPreset {
  id: string; name: string;
  court: { floor: string; lines: string; markings: 'classic' | 'rings' | 'lanes'; texture: 'flat' | 'grain' | 'beveled' };
  hit: { color: string; shape: 'ring' | 'diamond' | 'burst'; size: number; duration: number };
  rules: { paddleScale: .8 | 1 | 1.2; ballSpeed: .75 | 1 | 1.25; bounce: 'gentle' | 'standard' | 'lively'; lives: number; balls: number; maxBalls: number };
}
export type SimPlayer = {
  id: string; name: string; color: string; avatarUrl?: string | null; seat: number; isBot: boolean;
  connected: boolean; paddle: number; lives: number; hits: number; goals: number; place: number;
  rating: number; target: number; seen: number; nextThink: number; seq: number;
};
export type ArenaRoom = {
  id: string; mode: 'ranked' | 'casual'; variant: string; region: string;
  phase: 'waiting' | 'countdown' | 'playing' | 'saving' | 'finished' | 'void';
  players: SimPlayer[]; balls: { id: number; x: number; y: number; vx: number; vy: number }[];
  tick: number; serverTime: number; startAt: number; createdAt: number; reason: string;
  partyCode?: string; latency: number; nextBall: number; finishedAt?: number; saving?: boolean;
  createdRating: number; reservedIds?: string[];
  customPreset?: WorkshopPreset; customCode?: string; configHash?: string; agreedIds?: string[];
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
export const clamp = (v: number, scale = 1) => Math.max(40 + 90 * scale, Math.min(960 - 90 * scale, v));
export const rulesFor = (room: ArenaRoom) => {
  const base = RULES[room.variant] ?? RULES.classic!;
  const c = room.customPreset?.rules;
  return { ...base, lives: c?.lives ?? base.lives, balls: c?.balls ?? base.balls,
    speed: base.speed * (c?.ballSpeed ?? 1), maxBalls: c?.maxBalls ?? 8,
    paddleScale: c?.paddleScale ?? 1, bounce: c?.bounce ?? 'standard' };
};
export function spawnBall(room: ArenaRoom, random = Math.random) {
  const angle = random() * Math.PI * 2;
  const speed = Math.min(760, rulesFor(room).speed * (1 + room.tick / 36000));
  room.balls.push({ id: room.nextBall++, x: 500, y: 500, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
}
export function eliminate(room: ArenaRoom, p: SimPlayer) {
  if (p.place) return;
  p.lives = 0; p.place = room.players.filter(v => !v.place).length;
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
export function stepArena(room: ArenaRoom, now: number, random = Math.random) {
  if (room.phase !== "playing") return;
  const rules = rulesFor(room);
  room.tick++;
  for (const p of room.players) {
    if (!p.lives) continue;
    if (!p.isBot && now - p.seen > 20_000) { eliminate(room, p); continue; }
    if (p.isBot && now >= p.nextThink) {
      p.nextThink = now + 180 + random() * 260;
      const horizontal = p.seat < 2;
      const incoming = room.balls.filter(b => p.seat === 0 ? b.vy > 0 : p.seat === 1 ? b.vy < 0 : p.seat === 2 ? b.vx < 0 : b.vx > 0);
      const dist = (v: ArenaRoom['balls'][number]) => p.seat === 0 ? 960-v.y : p.seat === 1 ? v.y-40 : p.seat === 2 ? v.x-40 : 960-v.x;
      const b = incoming.sort((a, b) => dist(a) - dist(b))[0];
      p.target = clamp(b ? (horizontal ? b.x : b.y) + (random() - .5) * 150 : 500, rules.paddleScale);
    }
    p.paddle = clamp(p.paddle + Math.max(-12, Math.min(12, p.target - p.paddle)), rules.paddleScale);
  }
  for (const b of room.balls) {
    b.x += b.vx / 60; b.y += b.vy / 60;
    const seat = b.y >= 948 && b.vy > 0 ? 0 : b.y <= 52 && b.vy < 0 ? 1 : b.x <= 52 && b.vx < 0 ? 2 : b.x >= 948 && b.vx > 0 ? 3 : -1;
    if (seat < 0) continue;
    const p = room.players[seat]!;
    const coordinate = seat < 2 ? b.x : b.y;
    if (p.lives <= 0 || Math.abs(coordinate - p.paddle) <= 90 * rules.paddleScale + 12) {
      if (p.lives > 0) p.hits++;
      if (seat < 2) { b.vy *= -1; b.y = seat === 0 ? 947 : 53; }
      else { b.vx *= -1; b.x = seat === 3 ? 947 : 53; }
      if (p.lives > 0) {
        const gain = rules.bounce === 'gentle' ? 1 : rules.bounce === 'lively' ? 1.03 : 1.015;
        const speed = Math.min(760, Math.hypot(b.vx, b.vy) * gain);
        const tangent = Math.max(-.8, Math.min(.8, (coordinate - p.paddle) / (120 * rules.paddleScale)));
        if (seat < 2) { b.vx = tangent * speed; b.vy = (seat === 0 ? -1 : 1) * speed * Math.sqrt(1-tangent*tangent); }
        else { b.vy = tangent * speed; b.vx = (seat === 3 ? -1 : 1) * speed * Math.sqrt(1-tangent*tangent); }
      }
    } else {
      p.goals++; if (room.variant !== "rally_race") p.lives--;
      if (p.lives === 0) eliminate(room, p);
      const angle = random() * Math.PI * 2;
      b.x = 500; b.y = 500; b.vx = Math.cos(angle)*rules.speed; b.vy = Math.sin(angle)*rules.speed;
    }
  }
  const first = room.variant === "classic" ? 7 * 60 : rules.spawn * 60;
  const interval = rules.spawn * 60;
  if (room.tick >= first && (room.tick-first) % interval === 0 && room.balls.length < rules.maxBalls) spawnBall(room, random);
  finishIfNeeded(room);
  if (room.variant === "rally_race" && room.tick >= 3600 && room.phase === "playing") {
    const contenders = room.players.filter(p => !p.place).sort((a,b) => (b.hits-2*b.goals)-(a.hits-2*a.goals));
    if (contenders.length < 2 || contenders[0]!.hits-2*contenders[0]!.goals === contenders[1]!.hits-2*contenders[1]!.goals) {
      room.phase = "void"; room.reason = "Rally Race ended tied. No winner or rewards issued.";
    } else { contenders.forEach((p,i) => { p.place=i+1; }); room.phase="saving"; }
  }
  if (room.tick >= 60*600 && room.phase === "playing") { room.phase="void"; room.reason="Time limit reached without a winner. No rewards issued."; }
}
export function createPracticeRoom(preset: WorkshopPreset): ArenaRoom {
  const now = Date.now();
  const room: ArenaRoom = { id:'practice', mode:'casual', variant:'classic', region:'device', phase:'playing',
    customPreset: JSON.parse(JSON.stringify(preset)), players: [], balls: [], tick:0, nextBall:0,
    serverTime:now, startAt:now, createdAt:now, reason:'Practice — no rewards', latency:0, createdRating:0 };
  room.players = ['You','Cedar','Finch','Rowan'].map((name,seat) => ({id:`practice-${seat}`,name,seat,
    color:['#F36B3F','#EDBA3C','#EEE9DE','#A9D3D5'][seat]!,isBot:seat!==0,connected:true,
    paddle:500,lives:preset.rules.lives,hits:0,goals:0,place:0,rating:0,target:500,seen:now,nextThink:0,seq:-1}));
  for(let i=0;i<preset.rules.balls;i++)spawnBall(room);
  return room;
}
