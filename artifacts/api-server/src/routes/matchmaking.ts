import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MatchPlayer {
  id:       string;
  name:     string;
  rank:     string;
  color:    string;
  lastSeen: number;
  isBot:    boolean;
}

interface Room {
  id:        string;
  players:   MatchPlayer[];
  createdAt: number;
  readyAt:   number | null;
}

// ─── In-memory state ──────────────────────────────────────────────────────────
const rooms      = new Map<string, Room>();
const partyRooms = new Map<string, string>(); // partyCode → roomId
const partyMeta  = new Map<string, { expectedSize: number }>(); // partyCode → meta
const FILL_AFTER_MS        = 12_000;
const PARTY_FILL_AFTER_MS  = 35_000; // longer wait for party members to arrive
const PLAYER_DROP_MS       =  8_000;
const ROOM_EXPIRE_MS       = 90_000;

// ─── Bot name pools by rank tier ──────────────────────────────────────────────
// Tier decided by rank index passed from the player
const BOT_POOLS: Record<string, string[]> = {
  iron:   ['TreyH_22', 'luca_vr', 'driftzer0', 'tommy_g', 'nate_puck', 'jayden_rv', 'coolguy44', 'puck_kiddo'],
  bronze: ['SkylarzH', 'kira_dash', 'BryCooper', 'nova_hit', 'ryanFast', 'alex_puck7', 'mikey_g', 'puck_ninja'],
  silver: ['SlipStream7', 'GridKing', 'ArcFast88', 'neonpuck', 'QuickHex', 'RushCode', 'PulseGrid', 'FastStrike'],
  gold:   ['VeloKid', 'PulseAce', 'ZephyrR', 'NightRunner', 'strikeFX', 'DashReaper', 'ArcVolt', 'HexStrike9'],
  plat:   ['ArcReaper', 'GhostPad', 'ShadowHex', 'frostByte9', 'VoidDash', 'IceStrike', 'Nightfall_X', 'SilentBolt'],
  diamond:['PhantomBolt', 'NightHawk', 'CyberAce', 'RiftBreaker', 'Eclipse_X', 'ZeroShift', 'QuantumAce', 'Apex_Zero'],
  master: ['LegacyWave', 'QuantumFX', 'ApexRift', 'CrimsonStrike', 'DominatorX', 'VoidLegacy', 'PrismXL', 'Sovereign7'],
  general:['Mythic_G1', 'SpartanX1', 'ZeroGravity', 'LegendVoid', 'NovaSurge', 'TitanPulse', 'OmegaStrike', 'AbsoluteX'],
};

const BOT_RANKS: Record<string, string[]> = {
  iron:   ['Iron', 'Bronze I', 'Bronze II'],
  bronze: ['Bronze II', 'Bronze III', 'Silver I'],
  silver: ['Silver I', 'Silver II', 'Gold I'],
  gold:   ['Gold I', 'Gold II', 'Gold III'],
  plat:   ['Platinum', 'Diamond'],
  diamond:['Diamond', 'Master 1'],
  master: ['Master 1', 'Master 2', 'Master 3', 'Grandmaster 1'],
  general:['Grandmaster 2', 'General 1', 'General 2'],
};

function rankTier(rankIndex: number): string {
  if (rankIndex <=  1) return 'iron';
  if (rankIndex <=  3) return 'bronze';
  if (rankIndex <=  6) return 'silver';
  if (rankIndex <=  9) return 'gold';
  if (rankIndex <= 10) return 'plat';
  if (rankIndex <= 11) return 'diamond';
  if (rankIndex <= 16) return 'master';
  return 'general';
}

const BOT_COLORS = ['#FF4757', '#00BFFF', '#00FF88', '#9B59B6', '#FF6B35', '#FF00FF', '#C0C0C0', '#FFD700'];

function makeBots(count: number, nearRankIndex: number, takenNames: Set<string>): MatchPlayer[] {
  const tier   = rankTier(nearRankIndex + Math.floor(Math.random() * 3) - 1);
  const names  = BOT_POOLS[tier]  ?? BOT_POOLS['silver']!;
  const ranks  = BOT_RANKS[tier]  ?? BOT_RANKS['silver']!;
  const result: MatchPlayer[] = [];
  const usedNames = new Set<string>(takenNames);
  for (let i = 0; i < count; i++) {
    const available = names.filter(n => !usedNames.has(n));
    const name = available.length
      ? available[Math.floor(Math.random() * available.length)]!
      : `Player_${Math.floor(Math.random() * 9999)}`;
    usedNames.add(name);
    result.push({
      id:       `bot-${Date.now()}-${i}`,
      name,
      rank:     ranks[Math.floor(Math.random() * ranks.length)]!,
      color:    BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)]!,
      lastSeen: Date.now(),
      isBot:    true,
    });
  }
  return result;
}

// ─── Cleanup helper ───────────────────────────────────────────────────────────
function cleanRooms() {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > ROOM_EXPIRE_MS) {
      rooms.delete(id);
      continue;
    }
    // Drop players who stopped polling
    if (!room.readyAt) {
      room.players = room.players.filter(p => p.isBot || now - p.lastSeen < PLAYER_DROP_MS);
    }
  }
}

function findOrCreateRoom(player: MatchPlayer, rankIndex: number, partyCode?: string): Room {
  cleanRooms();
  const now = Date.now();

  // Party matchmaking: all members share one dedicated room
  if (partyCode) {
    const existingId = partyRooms.get(partyCode);
    if (existingId) {
      const existing = rooms.get(existingId);
      if (existing && !existing.readyAt && existing.players.length < 4) {
        if (!existing.players.some(p => p.id === player.id)) existing.players.push(player);
        return existing;
      }
    }
    const id = `room-party-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const room: Room = { id, players: [player], createdAt: now, readyAt: null };
    rooms.set(id, room);
    partyRooms.set(partyCode, id);
    logger.info({ roomId: id, partyCode }, 'matchmaking: party room created');
    return room;
  }

  // Find an open room (not ready, not expired, has space)
  for (const room of rooms.values()) {
    if (room.readyAt) continue;
    if (room.players.length >= 4) continue;
    if (now - room.createdAt > FILL_AFTER_MS) continue; // stale, skip
    // Don't join a room that already has this player
    if (room.players.some(p => p.id === player.id)) return room;
    room.players.push(player);
    return room;
  }
  // Create new room
  const id = `room-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const room: Room = { id, players: [player], createdAt: now, readyAt: null };
  rooms.set(id, room);
  logger.info({ roomId: id }, 'matchmaking: new room created');
  return room;
}

function resolveRoom(room: Room, playerRankIndex: number, partyCode?: string, partySize?: number): Room {
  const now  = Date.now();
  const age  = now - room.createdAt;
  const real = room.players.filter(p => !p.isBot);
  const takenNames = new Set(room.players.map(p => p.name));

  // Track the expected party size so subsequent polls keep the same threshold
  if (partyCode && partySize) {
    const existing = partyMeta.get(partyCode);
    if (!existing || partySize > existing.expectedSize) {
      partyMeta.set(partyCode, { expectedSize: partySize });
    }
  }
  const expected = partyCode ? (partyMeta.get(partyCode)?.expectedSize ?? 1) : 1;
  const isPartyRoom  = partyCode && partyRooms.get(partyCode) === room.id;
  const fillTimeout  = isPartyRoom ? PARTY_FILL_AFTER_MS : FILL_AFTER_MS;
  const partyFull    = isPartyRoom ? real.length >= expected : true;

  if (!room.readyAt) {
    if (room.players.length === 4) {
      room.readyAt = now;
    } else if (partyFull || age >= fillTimeout) {
      // Fill remaining slots with bots (party room waits for its members first)
      const needed = 4 - room.players.length;
      room.players.push(...makeBots(needed, playerRankIndex, takenNames));
      room.readyAt = now;
      logger.info({ roomId: room.id, real: real.length, bots: needed, isPartyRoom }, 'matchmaking: room filled with bots');
    }
  }
  return room;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/matchmaking/join
router.post("/matchmaking/join", (req, res) => {
  const { playerId, playerName, playerRank, rankIndex = 0, color = '#FFD700', partyCode, partySize } = req.body as {
    playerId: string; playerName: string; playerRank: string; rankIndex?: number; color?: string; partyCode?: string; partySize?: number;
  };
  if (!playerId || !playerName) {
    res.status(400).json({ error: "playerId and playerName required" });
    return;
  }

  // Check if player is already in a room
  for (const room of rooms.values()) {
    const existing = room.players.find(p => p.id === playerId);
    if (existing) {
      existing.lastSeen = Date.now();
      const resolved = resolveRoom(room, rankIndex, partyCode, partySize);
      res.json({
        roomId: resolved.id,
        players: resolved.players.map(({ isBot: _, ...rest }) => rest), // strip isBot
        isReady: !!resolved.readyAt,
        playerCount: resolved.players.length,
      });
      return;
    }
  }

  const player: MatchPlayer = {
    id: playerId, name: playerName, rank: playerRank, color,
    lastSeen: Date.now(), isBot: false,
  };
  const room = findOrCreateRoom(player, rankIndex, partyCode);
  const resolved = resolveRoom(room, rankIndex, partyCode, partySize);

  res.json({
    roomId:      resolved.id,
    players:     resolved.players.map(({ isBot: _, ...rest }) => rest),
    isReady:     !!resolved.readyAt,
    playerCount: resolved.players.length,
  });
});

// GET /api/matchmaking/room/:roomId?playerId=xxx&rankIndex=0
router.get("/matchmaking/room/:roomId", (req, res) => {
  const room = rooms.get(req.params.roomId!);
  if (!room) {
    res.status(404).json({ error: "room not found" });
    return;
  }
  const { playerId, rankIndex = '0', partyCode, partySize } = req.query as {
    playerId?: string; rankIndex?: string; partyCode?: string; partySize?: string;
  };

  // Heartbeat
  const player = room.players.find(p => p.id === playerId);
  if (player) player.lastSeen = Date.now();

  const resolved = resolveRoom(
    room,
    parseInt(rankIndex, 10),
    partyCode,
    partySize ? parseInt(partySize, 10) : undefined,
  );
  res.json({
    roomId:      resolved.id,
    players:     resolved.players.map(({ isBot: _, ...rest }) => rest),
    isReady:     !!resolved.readyAt,
    playerCount: resolved.players.length,
  });
});

// DELETE /api/matchmaking/room/:roomId/leave
router.delete("/matchmaking/room/:roomId/leave", (req, res) => {
  const room = rooms.get(req.params.roomId!);
  if (!room) { res.json({ ok: true }); return; }
  const { playerId } = req.body as { playerId?: string };
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.filter(p => !p.isBot).length === 0) rooms.delete(room.id);
  res.json({ ok: true });
});

export default router;
