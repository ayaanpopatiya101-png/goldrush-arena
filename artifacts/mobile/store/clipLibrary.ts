/**
 * Persistent device-only clip library — up to 50 clips within a byte budget.
 * Each clip keeps raw JPEG frames (for re-editing/re-encoding) plus a
 * optional GIF cache. Recorded frames remain the playback/editing authority.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { type HighlightType } from './highlightClip';

const LIBRARY_KEY = '@goldrush_clip_library_v1';
const MAX_CLIPS   = 50;  // plenty of room for auto-saved match highlights
// Bound bytes too: browser quotas and Android AsyncStorage row limits are small.
const MAX_LIBRARY_BYTES = 1_800_000;
let writes: Promise<unknown> = Promise.resolve();
function mutate<T>(operation: () => Promise<T>): Promise<T> {
  const result = writes.then(operation);
  writes = result.catch(() => {});
  return result;
}
function serialize(library: SavedClip[]): string {
  let raw = JSON.stringify(library);
  while (raw.length * 2 > MAX_LIBRARY_BYTES && library.length > 1) {
    library.pop();
    raw = JSON.stringify(library);
  }
  if (raw.length * 2 > MAX_LIBRARY_BYTES) throw new Error('This clip is too large for device storage. Trim it first.');
  return raw;
}

export interface SavedClip {
  id: string;
  timestamp: number;
  matchId?: string;       // links clips from the same match together
  frames: string[];       // raw base64 JPEG frames — kept for re-encoding on edits
  gifBase64?: string;     // pre-encoded GIF for instant playback ('' or absent = encode lazily)
  type: HighlightType;
  score: number;          // deflection count
  clipScore: number;      // quality score 0–200+
  tier: string;           // 'BASIC' | 'NICE' | 'EPIC' | 'LEGENDARY' | 'GOD MODE'
  tierColor: string;      // hex accent colour for the tier
  caption?: string;
  sticker?: string;       // single emoji sticker
  autoSaved?: boolean;    // true when saved automatically at game-over (not user-initiated)
}

export async function getClipLibrary(): Promise<SavedClip[]> {
  const raw = await AsyncStorage.getItem(LIBRARY_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(parsed) || parsed.some(c => !c || typeof c.id !== 'string')) {
    throw new Error('Clip library is damaged. Existing data has not been changed.');
  }
  return parsed as SavedClip[];
}

export async function saveClipToLibrary(
  clip: Omit<SavedClip, 'id' | 'timestamp'>,
): Promise<SavedClip> {
  return mutate(async () => {
    if (!Array.isArray(clip.frames) || clip.frames.length < 2 || clip.frames.length > 36 ||
        clip.frames.some(f => typeof f !== 'string' || !f.length)) throw new Error('Recorded frames are missing');
    const library = await getClipLibrary();
    const entry: SavedClip = { ...clip, id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, timestamp: Date.now() };
    const updated = [entry, ...library].slice(0, MAX_CLIPS);
    await AsyncStorage.setItem(LIBRARY_KEY, serialize(updated));
    return entry;
  });
}

export async function updateClipInLibrary(
  id: string,
  updates: Partial<Pick<SavedClip, 'caption' | 'sticker' | 'gifBase64' | 'frames'>>,
): Promise<void> {
  return mutate(async () => {
    const library = await getClipLibrary();
    if (!library.some(c => c.id === id)) throw new Error('This clip was removed from My Clips. Save a new copy.');
    await AsyncStorage.setItem(
      LIBRARY_KEY,
      serialize([
        { ...library.find(c => c.id === id)!, ...updates },
        ...library.filter(c => c.id !== id),
      ]),
    );
  });
}

export async function deleteClipFromLibrary(id: string): Promise<void> {
  return mutate(async () => {
    const library = await getClipLibrary();
    await AsyncStorage.setItem(
      LIBRARY_KEY,
      JSON.stringify(library.filter(c => c.id !== id)),
    );
  });
}

/** Encode Uint8Array → base64 string (safe on large buffers). */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
