/**
 * Native highlight-clip capture hook.
 *
 * Maintains a rolling ring buffer of JPEG frames captured from the game arena
 * at 4 fps using react-native-view-shot.  When a highlight event fires
 * (triggerHighlight), the type is recorded.  When the game ends
 * (stopAndGetClip), the last MAX_CLIP_FRAMES frames are returned as a clip
 * together with the highlight type — or null if no highlight occurred.
 */

import { RefObject, useRef } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const CAPTURE_FPS      = 4;
const CAPTURE_INTERVAL = Math.round(1000 / CAPTURE_FPS); // 250 ms
const MAX_BUFFER       = 100;  // 25 s of history
const MAX_CLIP_FRAMES  = 48;   // last 12 s delivered as the clip

export type HighlightType = 'multi_block' | 'near_death' | 'hot_streak';

export function useHighlightCapture() {
  const allFrames     = useRef<string[]>([]);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureTarget = useRef<RefObject<View> | null>(null);
  const highlightType = useRef<HighlightType | null>(null);
  const busy          = useRef(false);   // prevent overlapping captures

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
        // View may have unmounted mid-capture — ignore silently.
      } finally {
        busy.current = false;
      }
    }, CAPTURE_INTERVAL);
  }

  // ── Mark a highlight moment ───────────────────────────────────────────────
  // Only the first highlight per game is kept (most impactful moment wins).
  function triggerHighlight(type: HighlightType) {
    if (!highlightType.current) {
      highlightType.current = type;
    }
  }

  // ── Stop capturing and return the clip (or null) ──────────────────────────
  function stopAndGetClip(): { frames: string[]; type: HighlightType } | null {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    busy.current = false;

    const type   = highlightType.current;
    const frames = allFrames.current.slice(-MAX_CLIP_FRAMES);

    // Clean up
    allFrames.current     = [];
    highlightType.current = null;

    if (!type || frames.length < 4) return null;
    return { frames, type };
  }

  return { startCapture, triggerHighlight, stopAndGetClip };
}
