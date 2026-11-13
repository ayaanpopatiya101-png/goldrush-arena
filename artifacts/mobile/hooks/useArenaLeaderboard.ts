import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  getArenaLeaderboard,
  getGetArenaLeaderboardQueryKey,
  updateLeaderboardProfile,
  useGetArenaLeaderboard,
  useUpdateLeaderboardProfile,
  type ArenaLeaderboard,
  type GetArenaLeaderboardParams,
} from '@workspace/api-client-react';
import { arenaRequestOptions } from '@/utils/arenaSession';

export const LEADERBOARD_DIVISIONS = ['All', 'Copper', 'Silver', 'Gold', 'Platinum', 'Master'] as const;
export const NICKNAME_RE = /^[\p{L}\p{N} _.-]{2,24}$/u;

const rootKey = (username: string) => ['arena-leaderboard', username] as const;

/** Public global ladder. Fresh auth + 12s timeout per request; key isolates username + filters; 30s polling. */
export function useArenaLeaderboard(username: string, params: GetArenaLeaderboardParams) {
  const query = useGetArenaLeaderboard<ArenaLeaderboard, Error>(params, {
    query: {
      queryKey: [...rootKey(username), ...getGetArenaLeaderboardQueryKey(params)],
      queryFn: async () => getArenaLeaderboard(params, await arenaRequestOptions(username)),
      enabled: !!username,
      refetchInterval: 30_000,
      retry: 1,
    },
  });
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;
  useFocusEffect(useCallback(() => { if (username) void refetchRef.current(); }, [username]));
  return query;
}

export function useSaveLeaderboardProfile(username: string) {
  const qc = useQueryClient();
  return useUpdateLeaderboardProfile<Error>({
    mutation: {
      mutationFn: async ({ data }) => updateLeaderboardProfile(data, await arenaRequestOptions(username)),
      onSuccess: () => qc.invalidateQueries({ queryKey: rootKey(username) }),
    },
  });
}
