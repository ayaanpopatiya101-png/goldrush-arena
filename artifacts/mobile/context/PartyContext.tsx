import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePlayer } from './PlayerContext';
import { apiUrl } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PartyMember {
  playerId:    string;
  name:        string;
  avatarEmoji: string;
  rank:        string;
  winStreak:   number;
  isLeader:    boolean;
}

interface PartyContextType {
  partyCode:   string | null;
  members:     PartyMember[];
  isInParty:   boolean;
  isLeader:    boolean;
  createParty: () => Promise<string | null>;
  joinParty:   (code: string) => Promise<'ok' | 'not_found' | 'error'>;
  leaveParty:  () => void;
}

const PartyContext = createContext<PartyContextType>({
  partyCode: null, members: [], isInParty: false, isLeader: false,
  createParty: async () => null,
  joinParty:   async () => 'error',
  leaveParty:  () => {},
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
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef(`${profile.name}-${Date.now()}`);

  const isInParty = partyCode !== null;
  const isLeader  = members.some(m => m.isLeader && m.name === profile.name);

  function stopPoll() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  const refreshMembers = useCallback(async (code: string) => {
    try {
      const res = await fetch(apiUrl(`/party/${code}/members`));
      if (!res.ok) return;
      const data = await res.json() as { members: PartyMember[] };
      setMembers(data.members);
    } catch { /* network hiccup, keep polling */ }
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

  async function joinParty(code: string): Promise<'ok' | 'not_found' | 'error'> {
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
        body: JSON.stringify({ partyCode, playerName: profile.name }),
      }).catch(() => {});
    }
    setPartyCode(null);
    setMembers([]);
  }

  useEffect(() => () => stopPoll(), []);

  return (
    <PartyContext.Provider value={{ partyCode, members, isInParty, isLeader, createParty, joinParty, leaveParty }}>
      {children}
    </PartyContext.Provider>
  );
}

export function useParty() {
  return useContext(PartyContext);
}
