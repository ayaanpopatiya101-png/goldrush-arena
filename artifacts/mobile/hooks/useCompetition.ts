import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCompetition, getGetCompetitionQueryKey, type GetCompetition200 } from '@workspace/api-client-react';
import { arenaRequestOptions } from '@/utils/arenaSession';

export type CompetitiveSeasonData = GetCompetition200['current'];

export const PLACEMENT_GAMES = 5;
export const PARTICIPATION_GOAL = 10;
export const SEASON_START_RATING = 1000;

/** Personal competitive season + history for the signed-in local player. Refetches on focus. */
export function useCompetition(username: string) {
  const query = useQuery<GetCompetition200, Error>({
    queryKey: [...getGetCompetitionQueryKey(), username],
    enabled: !!username,
    queryFn: async () => getCompetition(await arenaRequestOptions(username)),
    retry: 1,
  });
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;
  useFocusEffect(useCallback(() => { if (username) void refetchRef.current(); }, [username]));
  return query;
}

/** Format "YYYY-MM" as e.g. "May 2025". */
export function seasonLabel(season: string): string {
  const [y, m] = season.split('-').map(Number);
  if (!y || !m) return season;
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[m - 1]} ${y}`;
}

export function formatUtcEnd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hh}:${mm} UTC`;
}

export function daysLeft(iso: string): number | null {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 86_400_000));
}

export function seasonBadges(s: CompetitiveSeasonData) {
  return {
    participation: s.games >= PARTICIPATION_GOAL,
    improvement: s.peak > SEASON_START_RATING,
  };
}
