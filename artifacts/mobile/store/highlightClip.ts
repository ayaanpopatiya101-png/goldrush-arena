/**
 * Module-level store for a single pending highlight clip.
 *
 * game.tsx writes here after every triggered or manual clip capture.
 * postgame.tsx reads + clears it to show the "Share Highlight" button.
 *
 * Using a module singleton avoids prop-drilling large binary frame arrays
 * through navigation params or a heavy global state manager.
 */

export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak' | 'manual';

interface PendingClip {
  frames: string[];       // base64 JPEG strings from react-native-view-shot
  type: HighlightType;
  score: number;          // player's deflection count at the time of recording
  clipScore: number;      // quality score (0–200+) used to determine reward tier
}

let _pending: PendingClip | null = null;

export function setPendingClip(
  frames: string[],
  type: HighlightType,
  score: number,
  clipScore = 0,
): void {
  _pending = { frames, type, score, clipScore };
}

export function getPendingClip(): PendingClip | null {
  return _pending;
}

export function clearPendingClip(): void {
  _pending = null;
}
