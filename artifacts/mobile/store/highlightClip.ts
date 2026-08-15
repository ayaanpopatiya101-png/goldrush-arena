/**
 * Module-level store for a single pending highlight clip.
 *
 * game.tsx writes here immediately after the game ends (if a highlight was
 * captured). postgame.tsx reads + clears it to show the "Share Highlight" button.
 * Using a module singleton avoids prop-drilling large binary frame arrays through
 * navigation params or a heavy global state manager.
 */

export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak';

interface PendingClip {
  frames: string[];        // base64 JPEG strings from react-native-view-shot
  type: HighlightType;
  score: number;           // deflection count at time of highlight
}

let _pending: PendingClip | null = null;

export function setPendingClip(frames: string[], type: HighlightType, score: number): void {
  _pending = { frames, type, score };
}

export function getPendingClip(): PendingClip | null {
  return _pending;
}

export function clearPendingClip(): void {
  _pending = null;
}
