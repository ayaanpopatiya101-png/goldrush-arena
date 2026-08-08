import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { usePlayer, SKINS } from './PlayerContext';
import { apiUrl } from '@/utils/api';
import { setGameConfig } from '@/store/gameSession';
import type { MatchType, GameVariant } from '@/store/gameSession';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PartyMember {
  playerId:    string;
  name:        string;
  avatarEmoji: string;
  rank:        string;
  winStreak:   number;
  isLeader:    boolean;
}

/** Shape the leader sends when launching a game mode for the whole party. */
export interface PartyLaunchConfig {
  matchType:              string;
  variant:                string;
  featuredModeId?:        string;
  featuredCoinMult?:      number;
  featuredXpMult?:        number;
  featuredBallSpeedFactor?: number;
}

interface ServerLaunchConfig extends PartyLaunchConfig {
  launchTime: number;
}

interface PartyContextType {
  partyCode:   string | null;
  members:     PartyMember[];
  isInParty:   boolean;
  isLeader:    boolean;
  /** Stable session-scoped ID — use this for matchmaking so party identity and room identity match. */
  myPlayerId:  string;
  createParty: () => Promise<string | null>;
  joinParty:   (code: string) => Promise<'ok' | 'not_found' | 'full' | 'error'>;
  leaveParty:  () => void;
  /** Leader only: broadcasts a game-mode launch to all party members, who auto-navigate to /lobby. */
  launchParty: (cfg: PartyLaunchConfig) => void;
}

const PartyContext = createContext<PartyContextType>({
  partyCode: null, members: [], isInParty: false, isLeader: false,
  myPlayerId: 'unset',
  createParty: async () => null,
  joinParty:   async () => 'error' as const,
  leaveParty:  () => {},
  launchParty: () => {},
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function genPartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function PartyProvider({ children }: { children: React.ReactNode }) {
  const { profile } = usePlayer();
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [members,   setMembers]   = useState<PartyMember[]>([]);
  const pollRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef      = useRef(`${profile.name}-${Date.now()}`);
  const profileRef       = useRef(profile);
  const isLeaderRef      = useRef(false);
  const lastLaunchTimeRef = useRef<number>(0);

  // Keep profileRef fresh so async polling callbacks always see latest profile
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const isInParty = partyCode !== null;
  const isLeader  = members.some(m => m.isLeader && m.playerId === playerIdRef.current);
  // Sync ref so async callbacks can read current value without stale closure
  isLeaderRef.current = isLeader;

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  const refreshMembers = useCallback(async (code: string) => {
    try {
      const res = await fetch(apiUrl(`/party/${code}/members`));
      if (!res.ok) return;
      const data = await res.json() as { members: PartyMember[]; launchConfig: ServerLaunchConfig | null };
      setMembers(data.members);

      // Non-leaders auto-follow when leader launches a mode
      if (data.launchConfig && !isLeaderRef.current) {
        const lc = data.launchConfig;
        const isStale     = Date.now() - lc.launchTime > 30_000; // ignore launches older than 30s
        const alreadyActed = lastLaunchTimeRef.current === lc.launchTime;
        if (!isStale && !alreadyActed) {
          lastLaunchTimeRef.current = lc.launchTime;
          const p    = profileRef.current;
          const skin = SKINS.find(sk => sk.id === p.currentSkin) ?? SKINS[0];
          setGameConfig({
            playerName:   p.name,
            playerSkinId: skin.id,
            playerColor:  skin.color,
            playerGlowColor: skin.glowColor,
            playerRelicId: p.currentRelic,
            matchType: lc.matchType as MatchType,
            variant:   lc.variant   as GameVariant,
            featuredModeId:          lc.featuredModeId,
            featuredCoinMult:        lc.featuredCoinMult,
            featuredXpMult:          lc.featuredXpMult,
            featuredBallSpeedFactor: lc.featuredBallSpeedFactor,
          });
          router.push('/lobby');
        }
      }
    } catch { /* network hiccup — keep polling */ }
  }, []);

  async function createParty(): Promise<string | null> {
    const code = genPartyCode();
    try {
      const res = await fetch(apiUrl('/party/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode:   code,
          playerId:    playerIdRef.current,
          playerName:  profile.name,
          avatarEmoji: profile.avatarEmoji,
          rank:        profile.rank,
          winStreak:   profile.winStreak,
        }),
      });
      if (!res.ok) throw new Error('api-error');
      const data = await res.json() as { members: PartyMember[] };
      setPartyCode(code);
      setMembers(data.members);
      stopPoll();
      pollRef.current = setInterval(() => refreshMembers(code), 3000);
      return code;
    } catch {
      // Offline: create locally so the UI still works for single-device use
      const me: PartyMember = {
        playerId: playerIdRef.current, name: profile.name,
        avatarEmoji: profile.avatarEmoji, rank: profile.rank,
        winStreak: profile.winStreak, isLeader: true,
      };
      setPartyCode(code);
      setMembers([me]);
      return code;
    }
  }

  async function joinParty(code: string): Promise<'ok' | 'not_found' | 'full' | 'error'> {
    const upper = code.toUpperCase().trim();
    try {
      const res = await fetch(apiUrl('/party/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyCode:   upper,
          playerId:    playerIdRef.current,
          playerName:  profile.name,
          avatarEmoji: profile.avatarEmoji,
          rank:        profile.rank,
          winStreak:   profile.winStreak,
        }),
      });
      if (res.status === 404) return 'not_found';
      if (res.status === 409) return 'full';
      if (!res.ok) return 'error';
      const data = await res.json() as { members: PartyMember[] };
      setPartyCode(upper);
      setMembers(data.members);
      stopPoll();
      pollRef.current = setInterval(() => refreshMembers(upper), 3000);
      return 'ok';
    } catch {
      return 'error';
    }
  }

  function leaveParty() {
    stopPoll();
    if (partyCode) {
      fetch(apiUrl('/party/leave'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyCode, playerId: playerIdRef.current }),
      }).catch(() => {});
    }
    setPartyCode(null);
    setMembers([]);
    lastLaunchTimeRef.current = 0;
  }

  /** Leader broadcasts the chosen game mode; all non-leader members auto-navigate to /lobby. */
  function launchParty(cfg: PartyLaunchConfig) {
    if (!partyCode) return;
    fetch(apiUrl(`/party/${partyCode}/launch`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: playerIdRef.current, ...cfg }),
    }).catch(() => {}); // fire-and-forget; leader navigates immediately in the calling component
  }

  useEffect(() => () => stopPoll(), []);

  return (
    <PartyContext.Provider value={{
      partyCode, members, isInParty, isLeader,
      myPlayerId: playerIdRef.current,
      createParty, joinParty, leaveParty, launchParty,
    }}>
      {children}
    </PartyContext.Provider>
  );
}

export function useParty() {
  return useContext(PartyContext);
}
