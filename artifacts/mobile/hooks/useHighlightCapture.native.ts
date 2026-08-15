/**
 * Native highlight-clip capture hook.
 *
 * Maintains a rolling ring buffer of JPEG frames captured from the game arena
 * at 4 fps using react-native-view-shot.
 *
 * API:
 *   startCapture(viewRef)  — begin recording into the ring buffer
 *   triggerHighlight(type) — mark the first auto-highlight type per game
 *   snapshotClip()         — read the last N frames NOW (non-destructive; keeps recording)
 *   stopAndGetClip()       — stop recording and return the clip, or null if nothing happened
 */

import { RefObject, useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const CAPTURE_FPS      = 4;
const CAPTURE_INTERVAL = Math.round(1000 / CAPTURE_FPS); // 250 ms
const MAX_BUFFER       = 100;  // 25 s of history
const MAX_CLIP_FRAMES  = 48;   // last 12 s returned as a clip

export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak' | 'manual';

export function useHighlightCapture() {
  const allFrames     = useRef<string[]>([]);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureTarget = useRef<RefObject<View> | null>(null);
  const highlightType = useRef<HighlightType | null>(null);
  const busy          = useRef(false);

  // ── Start capturing ───────────────────────────────────────────────────────
  function startCapture(viewRef: RefObject<View>) {
    captureTarget.current = viewRef;
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      if (busy.current || !captureTarget.current?.current) return;
      busy.current = true;
      try {
        const b64 = await captureRef(captureTarget.current, {
          format:  'jpg',
          quality: 0.60,
          result:  'base64',
          width:   200,
          height:  200,
        }) as string;
        allFrames.current.push(b64);
        if (allFrames.current.length > MAX_BUFFER) allFrames.current.shift();
      } catch {
        // View may have unmounted — ignore.
      } finally {
        busy.current = false;
      }
    }, CAPTURE_INTERVAL);
  }

  // ── Mark an auto-highlight moment ─────────────────────────────────────────
  function triggerHighlight(type: HighlightType) {
    if (!highlightType.current) highlightType.current = type;
  }

  // ── Non-destructive snapshot (manual record) ──────────────────────────────
  /** Returns the current last MAX_CLIP_FRAMES frames without stopping the capture.
   *  Returns null if there aren't enough frames yet (player hasn't played long enough). */
  function snapshotClip(): string[] | null {
    const frames = allFrames.current.slice(-MAX_CLIP_FRAMES);
    return frames.length >= 4 ? [...frames] : null;
  }

  // ── Stop and collect final clip ───────────────────────────────────────────
  function stopAndGetClip(): { frames: string[]; type: HighlightType } | null {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    busy.current = false;

    const type   = highlightType.current;
    const frames = allFrames.current.slice(-MAX_CLIP_FRAMES);

    allFrames.current     = [];
    highlightType.current = null;

    if (!type || frames.length < 4) return null;
    return { frames, type };
  }

  /** Whether the capture interval is currently running. */
  function isCapturing(): boolean {
    return intervalRef.current !== null;
  }

  return { startCapture, triggerHighlight, snapshotClip, stopAndGetClip, isCapturing };
}
