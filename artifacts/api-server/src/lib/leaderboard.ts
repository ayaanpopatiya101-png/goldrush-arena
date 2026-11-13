import { createHash } from "node:crypto";
import { division, initialSeason, seasonKey, seasonView, type SeasonState } from "./competition.js";

export const LADDER_ACTIVITY_MS = 7 * 86_400_000;
export type LadderProfile = { anonymous: boolean; nickname: string };
export type LadderPlayer = {
  id: string;
  competitive: Record<string, SeasonState>;
  profile: unknown;
  lastRankedAt: string | Date | null;
};
export function publicPreference(value: unknown): LadderProfile {
  const p = value as Partial<LadderProfile> | null;
  return { anonymous: p?.anonymous !== false, nickname: typeof p?.nickname === "string" ? p.nickname.slice(0, 24) : "" };
}
export function ladderName(player: LadderPlayer) {
  const p = publicPreference(player.profile);
  return !p.anonymous && p.nickname.trim()
    ? p.nickname.trim()
    : `Player-${createHash("sha256").update(player.id).digest("hex").slice(0, 8).toUpperCase()}`;
}
export function ladderEligibility(player: LadderPlayer, season: string, now: number) {
  const state = player.competitive[season];
  if (!state?.games) return "no_games" as const;
  if (state.games < 5) return "placements" as const;
  if (season === seasonKey(now)) {
    const last = player.lastRankedAt ? new Date(player.lastRankedAt).getTime() : NaN;
    if (!Number.isFinite(last) || last < now - LADDER_ACTIVITY_MS) return "inactive" as const;
  }
  return "eligible" as const;
}
export function buildLeaderboard(players: LadderPlayer[], viewer: LadderPlayer, filters: {
  season?: string; division?: string; search?: string; page?: number;
}, now = Date.now()) {
  const season = filters.season ?? seasonKey(now);
  const seasons = [...new Set([seasonKey(now), ...players.flatMap(p => Object.keys(p.competitive))])].sort().reverse();
  // Stable shared positions for exact ties. Rating, then wins, then fewer games.
  const eligible = players.filter(p => ladderEligibility(p, season, now) === "eligible");
  eligible.sort((a, b) => {
    const x = a.competitive[season]!, y = b.competitive[season]!;
    return y.rating - x.rating || y.wins - x.wins || x.games - y.games || a.id.localeCompare(b.id);
  });
  let position = 0;
  const ranked = eligible.map((p, i) => {
    const s = p.competitive[season]!;
    const previous = i ? eligible[i - 1]!.competitive[season]! : null;
    if (!previous || previous.rating !== s.rating || previous.wins !== s.wins || previous.games !== s.games) position = i + 1;
    return { position, name: ladderName(p), rating: s.rating, division: division(s.rating),
      wins: s.wins, games: s.games, peak: s.peak, isYou: p.id === viewer.id };
  });
  const yourPosition = ranked.find(p => p.isYou)?.position ?? null;
  const search = (filters.search ?? "").trim().toLowerCase();
  const entries = ranked.slice(0, 500)
    .filter(p => !filters.division || filters.division === "All" || p.division.startsWith(`${filters.division} `))
    .filter(p => !search || p.name.toLowerCase().includes(search));
  const page = filters.page ?? 1;
  return { season, seasons, endsAt: seasonView(season, initialSeason()).endsAt, updatedAt: new Date(now).toISOString(),
    scope: "global" as const, entries: entries.slice((page - 1) * 25, page * 25),
    total: entries.length, page, pages: Math.ceil(entries.length / 25), eligiblePlayers: eligible.length,
    yourPosition, eligibility: ladderEligibility(viewer, season, now), profile: publicPreference(viewer.profile) };
}
