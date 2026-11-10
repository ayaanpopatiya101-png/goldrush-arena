// Shared photo-avatar state per username. Profile header, onboarding card and
// the editor all read the same store, so a save shows everywhere at once.
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  commitAvatar, getAvatar, removeAvatar, requestAvatarUpload, shareAvatar, type AvatarInfo,
} from '@workspace/api-client-react';
import { arenaRequestOptions } from '@/utils/arenaSession';
import { apiUrl } from '@/utils/api';
import { blobToDataUri, readCroppedBody } from '@/utils/avatarImage';

export interface AvatarState {
  info: AvatarInfo | null;
  uri: string | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
}
const EMPTY: AvatarState = { info: null, uri: null, loading: false, loaded: false, error: null };
const store = new Map<string, AvatarState>();
const listeners = new Set<() => void>();
const inflight = new Map<string, Promise<void>>();
const generations = new Map<string, number>();
const epoch = (user: string) => generations.get(user) ?? 0;
export function clearAvatarState(user: string) {
  generations.set(user,epoch(user)+1);
  store.delete(user);inflight.delete(user);
  listeners.forEach(l=>l());
}

function get(user: string) { return store.get(user) ?? EMPTY; }
function set(user: string, patch: Partial<AvatarState>) {
  store.set(user, { ...get(user), ...patch });
  listeners.forEach(l => l());
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }

function messageOf(e: unknown, fallback: string) {
  if (e instanceof Error && e.name === 'AbortError') return 'The server took too long. Check your connection and retry.';
  return fallback;
}

async function fetchOwnImage(user: string, options?: RequestInit): Promise<string> {
  const opts = options ?? await arenaRequestOptions(user);
  const res = await fetch(apiUrl('/multiplayer/avatar/image'), { headers: opts.headers, signal: opts.signal ?? undefined });
  if (!res.ok) throw new Error(`Image request failed (${res.status}).`);
  return blobToDataUri(await res.blob());
}

async function load(user: string) {
  const generation=epoch(user);
  const running = inflight.get(user);
  if (running) return running;
  const p = (async () => {
    set(user, { loading: true, error: null });
    try {
      const options=await arenaRequestOptions(user);
      const info = await getAvatar(options);
      const uri = info.id ? await fetchOwnImage(user,options) : null;
      if(epoch(user)===generation)set(user, { info, uri, loading: false, loaded: true });
    } catch (e) {
      if(epoch(user)===generation)set(user, { loading: false, loaded: true, error: messageOf(e, 'Your photo could not be loaded.') });
    }
  })();
  inflight.set(user, p);
  p.finally(() => {if(epoch(user)===generation)inflight.delete(user);});
  return p;
}

export function useAvatar(username: string | null | undefined) {
  const user = username?.trim() || '';
  const state = useSyncExternalStore(subscribe, () => (user ? get(user) : EMPTY), () => EMPTY);

  useEffect(() => {
    if (user && !get(user).loaded && !get(user).loading) void load(user);
  }, [user]);

  const reload = useCallback(() => (user ? load(user) : Promise.resolve()), [user]);

  /** Upload cropped JPEG through the bounded authenticated endpoint, then commit. */
  const save = useCallback(async (croppedUri: string, shared: boolean) => {
    if (!user) throw new Error('Pick a player name first.');
    const generation=epoch(user);
    const options=await arenaRequestOptions(user);
    const body = await readCroppedBody(croppedUri);
    const { id } = await requestAvatarUpload({ size: body.size, contentType: 'image/jpeg' }, options);
    await body.send(apiUrl(`/multiplayer/avatar/upload/${id}`),options);
    if(epoch(user)!==generation)throw new Error('Player was deleted.');
    const info = await commitAvatar({ uploadId: id, shared }, options);
    let uri: string | null = croppedUri;
    try { uri = await fetchOwnImage(user,options); } catch { /* staged crop is identical content */ }
    if(epoch(user)===generation)set(user, { info, uri, loaded: true, error: null });
    return info;
  }, [user]);

  const setShared = useCallback(async (shared: boolean) => {
    if (!user) return;
    const generation=epoch(user);
    const info = await shareAvatar({ shared }, await arenaRequestOptions(user));
    if(epoch(user)===generation)set(user, { info });
  }, [user]);

  const remove = useCallback(async () => {
    if (!user) return;
    const generation=epoch(user);
    await removeAvatar(await arenaRequestOptions(user));
    if(epoch(user)===generation)set(user, { info: { id: null, shared: false }, uri: null });
  }, [user]);

  return { ...state, reload, save, setShared, remove };
}
