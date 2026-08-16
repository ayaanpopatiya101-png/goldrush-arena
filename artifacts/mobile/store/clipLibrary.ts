/**
 * Persistent clip library — stores up to 10 saved clips in AsyncStorage.
 * Each clip keeps raw JPEG frames (for re-editing/re-encoding) plus a
 * pre-encoded GIF base64 string for instant display.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { type HighlightType } from './highlightClip';

const LIBRARY_KEY = '@goldrush_clip_library_v1';
const MAX_CLIPS   = 10;

export interface SavedClip {
  id: string;
  timestamp: number;
  frames: string[];       // raw base64 JPEG frames — kept for re-encoding on edits
  gifBase64: string;      // pre-encoded GIF for instant playback
  type: HighlightType;
  score: number;          // deflection count
  clipScore: number;      // quality score 0–200+
  tier: string;           // 'Basic' | 'Nice' | 'Epic' | 'Legendary'
  tierColor: string;      // hex accent colour for the tier
  caption?: string;
  sticker?: string;       // single emoji sticker
}

export async function getClipLibrary(): Promise<SavedClip[]> {
  try {
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    return raw ? (JSON.parse(raw) as SavedClip[]) : [];
  } catch {
    return [];
  }
}

export async function saveClipToLibrary(
  clip: Omit<SavedClip, 'id' | 'timestamp'>,
): Promise<SavedClip> {
  const library = await getClipLibrary();
  const entry: SavedClip = { ...clip, id: String(Date.now()), timestamp: Date.now() };
  const updated = [entry, ...library].slice(0, MAX_CLIPS);
  await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(updated));
  return entry;
}

export async function updateClipInLibrary(
  id: string,
  updates: Partial<Pick<SavedClip, 'caption' | 'sticker' | 'gifBase64'>>,
): Promise<void> {
  const library = await getClipLibrary();
  await AsyncStorage.setItem(
    LIBRARY_KEY,
    JSON.stringify(library.map(c => (c.id === id ? { ...c, ...updates } : c))),
  );
}

export async function deleteClipFromLibrary(id: string): Promise<void> {
  const library = await getClipLibrary();
  await AsyncStorage.setItem(
    LIBRARY_KEY,
    JSON.stringify(library.filter(c => c.id !== id)),
  );
}

/** Encode Uint8Array → base64 string (safe on large buffers). */
export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
