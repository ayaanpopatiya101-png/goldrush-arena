// All nonvisual production dependencies end here. No source app imports, API,
// storage, player identity, clipboard, game engine, party server or real routes.
import React, { createContext, useContext, useEffect, useState } from 'react';

// Explicit fixture: fields consumed by Home, taken from PlayerContext's
// DEFAULT_PROFILE. It is not a real user's profile. Reset on preview reload.
export const SAMPLE_PROFILE = {
  name: 'Player', xp: 0, level: 1, rank: 'Bronze', coins: 200,
  wins: 0, losses: 0, totalGames: 0, winStreak: 0,
  loginStreak: 0, currentSkin: 'default', selectedSuper: 1,
  avatarEmoji: '🎮', avatarFrameColor: '#FFD700',
  seasonPassClaimed: [] as number[],
};
export type SampleProfile = typeof SAMPLE_PROFILE;
export type PartyMember = {
  playerId: string; name: string; avatarEmoji: string; rank: string;
  winStreak: number; isLeader: boolean;
};
type SampleState = {
  profile: SampleProfile;
  setProfile: React.Dispatch<React.SetStateAction<SampleProfile>>;
  partyCode: string | null;
  setPartyCode: React.Dispatch<React.SetStateAction<string | null>>;
  members: PartyMember[];
  setMembers: React.Dispatch<React.SetStateAction<PartyMember[]>>;
};
const Context = createContext<SampleState | null>(null);
export function SampleStateProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState(SAMPLE_PROFILE);
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  return <Context.Provider value={{ profile, setProfile, partyCode, setPartyCode, members, setMembers }}>{children}</Context.Provider>;
}
export function useSampleState() {
  const value = useContext(Context);
  if (!value) throw new Error('GoldRush sample state must be inside SampleStateProvider.');
  return value;
}
export function notify(message: string) {
  window.dispatchEvent(new CustomEvent('goldrush-guide-action', { detail: message }));
}
export const router = {
  push: (path: string) => notify(`Preview only: ${path}. Navigation is disabled; this is an isolated Home extraction.`),
};
export function useSafeAreaInsets() { return { top: 0, right: 0, bottom: 0, left: 0 }; }
export function useFocusEffect(effect: () => void | (() => void)) { useEffect(effect, [effect]); }
export function useReducedMotion() { return true; }
export function useBlockingOverlay(visible: boolean) { return visible; }
// Same non-looping implementation as components/ui/motion.ts.
export function staticLoop(_animation: unknown) {
  return { start: () => {}, stop: () => {}, reset: () => {} };
}
export function useParty() {
  const { profile, partyCode, setPartyCode, members, setMembers } = useSampleState();
  const sampleMember: PartyMember = {
    playerId: 'sample-player', name: profile.name, avatarEmoji: profile.avatarEmoji,
    rank: profile.rank, winStreak: profile.winStreak, isLeader: true,
  };
  return {
    partyCode, members, isInParty: partyCode !== null, isLeader: true,
    createParty: async () => {
      setPartyCode('SAMPLE');
      setMembers([sampleMember]);
      notify('Local sample party created. SAMPLE is a fixture, not an online party code.');
      return 'SAMPLE';
    },
    joinParty: async (code: string): Promise<'joined' | 'not_found' | 'full' | 'error'> => {
      if (code !== 'SAMPLE') return 'not_found';
      setPartyCode(code);
      setMembers([sampleMember]);
      notify('Joined the local SAMPLE fixture. No online party or other players are connected.');
      return 'joined';
    },
    leaveParty: () => { setPartyCode(null); setMembers([]); },
    launchParty: async (_config: unknown) => {
      notify('Preview only: no party server or multiplayer match is launched.');
      return true;
    },
  };
}
export type GameVariant = 'classic' | 'duos' | 'blitz' | 'chaos' | 'survival' | 'sudden_death' | 'turbo' | 'pinball' | 'six_player' | 'storm_surge' | 'ghost_protocol' | 'warlord';
export type MatchType = 'ranked' | 'casual' | 'gauntlet';
export function setGameConfig(_config: unknown) { /* no game store writes */ }
export function startGauntlet(): GameVariant { return 'classic'; }
export async function getDeviceId() { return 'isolated-preview-no-device-id'; }
export async function fetchTodayChallenge(_deviceId: string): Promise<{
  matchNonce?: string; seedHash?: string; seed?: string; startSpeedMult?: number; rampRate?: number;
} | null> {
  // Do not fabricate a server nonce. Home's own explicit error UI handles this.
  return null;
}
export function useFeaturedModeCountdown() {
  // Frozen sample of the actual "Double Coins" featured-mode catalog entry.
  // Neither an assertion about today's event nor a live server countdown.
  return {
    mode: {
      id: 'double_coins', name: 'Double Coins', emoji: '🪙',
      descriptor: 'Earn 2× coins on every match this weekend',
      color: '#D0AF66', gradient: ['#191B19', '#191B19'] as [string, string],
    },
    timeLeft: { d: 0, h: 18, m: 24, s: 9 },
  };
}
