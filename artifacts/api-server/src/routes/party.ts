import { Router, type IRouter } from "express";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────
interface PartyMember {
  playerId:    string;
  playerName:  string;
  avatarEmoji: string;
  rank:        string;
  winStreak:   number;
  isLeader:    boolean;
  joinedAt:    number;
}

interface LaunchConfig {
  matchType:              string;
  variant:                string;
  featuredModeId?:        string;
  featuredCoinMult?:      number;
  featuredXpMult?:        number;
  featuredBallSpeedFactor?: number;
  launchTime:             number;
}

interface Party {
  code:          string;
  members:       PartyMember[];
  createdAt:     number;
  launchConfig?: LaunchConfig;
}

// ─── In-memory state ──────────────────────────────────────────────────────────
const parties  = new Map<string, Party>();
const PARTY_TTL = 30 * 60 * 1_000; // 30 min

function cleanParties() {
  const now = Date.now();
  for (const [code, party] of parties) {
    if (now - party.createdAt > PARTY_TTL) parties.delete(code);
  }
}

function memberView(m: PartyMember) {
  return {
    playerId:    m.playerId,
    name:        m.playerName,
    avatarEmoji: m.avatarEmoji,
    rank:        m.rank,
    winStreak:   m.winStreak,
    isLeader:    m.isLeader,
  };
}

// ─── POST /party/create ───────────────────────────────────────────────────────
router.post('/party/create', (req, res) => {
  cleanParties();
  const {
    partyCode, playerId, playerName,
    avatarEmoji = '🎮', rank = 'Bronze 1', winStreak = 0,
  } = req.body as {
    partyCode: string; playerId: string; playerName: string;
    avatarEmoji?: string; rank?: string; winStreak?: number;
  };

  if (!partyCode || !playerId || !playerName) {
    res.status(400).json({ error: 'partyCode, playerId, playerName required' });
    return;
  }
  if (parties.has(partyCode)) {
    // Return existing party if this player is already the leader (reconnect)
    const existing = parties.get(partyCode)!;
    const alreadyIn = existing.members.find(m => m.playerId === playerId);
    if (alreadyIn) { res.json({ members: existing.members.map(memberView) }); return; }
    res.status(409).json({ error: 'party code already in use' });
    return;
  }

  const leader: PartyMember = {
    playerId, playerName, avatarEmoji, rank, winStreak,
    isLeader: true, joinedAt: Date.now(),
  };
  parties.set(partyCode, { code: partyCode, members: [leader], createdAt: Date.now() });
  logger.info({ partyCode, playerName }, 'party: created');
  res.json({ members: [memberView(leader)] });
});

// ─── POST /party/join ─────────────────────────────────────────────────────────
router.post('/party/join', (req, res) => {
  cleanParties();
  const {
    partyCode, playerId, playerName,
    avatarEmoji = '🎮', rank = 'Bronze 1', winStreak = 0,
  } = req.body as {
    partyCode: string; playerId: string; playerName: string;
    avatarEmoji?: string; rank?: string; winStreak?: number;
  };

  if (!partyCode || !playerId || !playerName) {
    res.status(400).json({ error: 'partyCode, playerId, playerName required' });
    return;
  }

  const party = parties.get(partyCode.toUpperCase());
  if (!party) { res.status(404).json({ error: 'party not found' }); return; }

  // Already in the party — idempotent re-join
  const existing = party.members.find(m => m.playerId === playerId);
  if (existing) { res.json({ members: party.members.map(memberView) }); return; }

  // Matches cap at 4 — reject a 5th member before they queue
  if (party.members.length >= 4) {
    res.status(409).json({ error: 'party is full' });
    return;
  }

  const joiner: PartyMember = {
    playerId, playerName, avatarEmoji, rank, winStreak,
    isLeader: false, joinedAt: Date.now(),
  };
  party.members.push(joiner);
  logger.info({ partyCode, playerName }, 'party: member joined');
  res.json({ members: party.members.map(memberView) });
});

// ─── GET /party/:code/members ─────────────────────────────────────────────────
router.get('/party/:code/members', (req, res) => {
  cleanParties();
  const party = parties.get((req.params.code ?? '').toUpperCase());
  if (!party) { res.status(404).json({ error: 'party not found' }); return; }
  res.json({ members: party.members.map(memberView), launchConfig: party.launchConfig ?? null });
});

// ─── PATCH /party/:code/launch — leader sets the game mode for the whole party ─
router.patch('/party/:code/launch', (req, res) => {
  const party = parties.get((req.params.code ?? '').toUpperCase());
  if (!party) { res.status(404).json({ error: 'party not found' }); return; }

  const {
    playerId, matchType, variant,
    featuredModeId, featuredCoinMult, featuredXpMult, featuredBallSpeedFactor,
  } = req.body as {
    playerId: string; matchType: string; variant: string;
    featuredModeId?: string; featuredCoinMult?: number;
    featuredXpMult?: number; featuredBallSpeedFactor?: number;
  };

  const leader = party.members.find(m => m.isLeader);
  if (!leader || leader.playerId !== playerId) {
    res.status(403).json({ error: 'only the party leader can launch' });
    return;
  }

  party.launchConfig = {
    matchType, variant,
    featuredModeId, featuredCoinMult, featuredXpMult, featuredBallSpeedFactor,
    launchTime: Date.now(),
  };
  logger.info({ partyCode: party.code, matchType, variant }, 'party: leader launched mode');
  res.json({ ok: true });
});

// ─── DELETE /party/leave ──────────────────────────────────────────────────────
router.delete('/party/leave', (req, res) => {
  // Use playerId (stable) — NOT playerName (mutable display string)
  const { partyCode, playerId } = req.body as { partyCode?: string; playerId?: string };
  if (!partyCode || !playerId) { res.json({ ok: true }); return; }

  const party = parties.get(partyCode.toUpperCase());
  if (party) {
    party.members = party.members.filter(m => m.playerId !== playerId);
    if (party.members.length === 0) {
      parties.delete(partyCode.toUpperCase());
    } else if (!party.members.some(m => m.isLeader)) {
      party.members[0]!.isLeader = true; // promote earliest joiner to leader
    }
  }
  res.json({ ok: true });
});

export default router;
