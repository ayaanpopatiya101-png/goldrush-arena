// Server-verified cosmetic state, shared per username via React Query.
// Every mutation keeps the previous cache until the server confirms success;
// failures surface as explicit errors and never fall back to local coins/owned.
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import {
  assistPaddleDesign, deletePaddleDesign, equipCosmetic, getCosmetics, purchaseCosmetic,
  respondCosmeticOffer, savePaddleDesign,
  type CosmeticState, type DesignAssistResult, type PaddleDesign,
} from '@workspace/api-client-react';

import { usePlayer } from '@/context/PlayerContext';
import { arenaRequestOptions, arenaTimeout, arenaProfileEpoch } from '@/utils/arenaSession';

export const MAX_DESIGNS = 20;
export const cosmeticsKey = (username: string) => ['cosmetics', username,arenaProfileEpoch(username)] as const;

/** Secure UUID v4 via expo-crypto (native CSPRNG). Throws rather than falling back to Math.random. */
export function secureUUID(): string {
  try { const id = Crypto.randomUUID(); if (id) return id.toLowerCase(); } catch { /* try web crypto below */ }
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().toLowerCase();
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  throw new Error('This device cannot create a secure design id. Update the app and try again.');
}
export const newDesignId = () => `custom_${secureUUID()}`;

export function cosmeticErrorMessage(err: unknown, fallback = 'The arena server could not be reached.'): string {
  if (!err) return fallback;
  const e = err as { name?: string; message?: string; data?: { error?: string; message?: string } };
  if (e.name === 'AbortError') return 'The request timed out. Check your connection and retry.';
  return e.data?.error ?? e.data?.message ?? e.message ?? fallback;
}

export function useCosmetics() {
  const { currentUsername } = usePlayer();
  const qc = useQueryClient();
  const key = cosmeticsKey(currentUsername);
  const query = useQuery<CosmeticState, Error>({
    queryKey: key,
    enabled: !!currentUsername,
    queryFn: async () => getCosmetics(await arenaRequestOptions(currentUsername)),
    staleTime: 30_000,
    retry: 1,
  });

  const commit = useCallback(async (next: CosmeticState) => {
    await qc.cancelQueries({queryKey:key});
    qc.setQueryData(key, next);
    return next;
  }, [qc, currentUsername,key[2]]);

  const guard = useCallback(() => {
    if (!currentUsername) throw new Error('Choose a local player profile first.');
    return currentUsername;
  }, [currentUsername]);

  const saveDesign = useCallback(async (design: PaddleDesign) => {
    const u = guard();
    const prev = qc.getQueryData<CosmeticState>(cosmeticsKey(u));
    if (prev && !prev.designs.some(d => d.id === design.id) && prev.designs.length >= MAX_DESIGNS)
      throw new Error(`You have ${MAX_DESIGNS} saved designs. Delete one to save another.`);
    return commit(await savePaddleDesign(design, await arenaRequestOptions(u)));
  }, [guard, qc, commit]);

  const deleteDesign = useCallback(async (id: string) => {
    const u = guard();
    return commit(await deletePaddleDesign(id, await arenaRequestOptions(u)));
  }, [guard, commit]);

  const equip = useCallback(async (kind: 'skin' | 'theme' | 'strike', id: string) => {
    const u = guard();
    return commit(await equipCosmetic({ kind, id }, await arenaRequestOptions(u)));
  }, [guard, commit]);

  const purchase = useCallback(async (id: string, requestId: string = secureUUID()) => {
    const u = guard();
    return commit(await purchaseCosmetic({ id, requestId }, await arenaRequestOptions(u)));
  }, [guard, commit]);

  const offer = useCallback(async (action: 'shown' | 'dismissed') => {
    const u = guard();
    return commit(await respondCosmeticOffer({ action }, await arenaRequestOptions(u)));
  }, [guard, commit]);

  const assist = useCallback(async (prompt: string, current: PaddleDesign): Promise<DesignAssistResult> => {
    const u = guard();
    const opts = await arenaRequestOptions(u);
    return assistPaddleDesign({ prompt, current }, { ...opts, signal: arenaTimeout(90000) });
  }, [guard]);

  return {
    username: currentUsername,
    state: query.data ?? null,
    loading: query.isLoading,
    refreshing: query.isFetching,
    error: query.error ? cosmeticErrorMessage(query.error) : null,
    reload: query.refetch,
    saveDesign, deleteDesign, equip, purchase, offer, assist,
  };
}

export default useCosmetics;
