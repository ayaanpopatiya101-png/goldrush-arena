import { useEffect, useRef, useState, type RefObject } from 'react';
import type { View } from 'react-native';
import type { HighlightType } from '../store/highlightClip';

export function useClipCaptureBuffer(capture: (view: RefObject<View | null>) => Promise<string>) {
  const frames = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const marked = useRef<{ frames: string[]; type: HighlightType } | null>(null);
  const [captureStatus, setStatus] = useState('Preparing recording…');
  function stop() {
    generation.current++;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }
  useEffect(() => stop, []);
  function startCapture(view: RefObject<View | null>) {
    stop();
    frames.current = [];
    marked.current = null;
    busy.current = false;
    const epoch = generation.current;
    timer.current = setInterval(async () => {
      if (busy.current || !view.current) return;
      busy.current = true;
      try {
        const frame = await capture(view);
        if (epoch !== generation.current) return;
        if (!frame) throw new Error('Empty capture');
        frames.current = [...frames.current.slice(-35), frame];
        setStatus(frames.current.length < 4 ? 'Preparing recording…' : 'Recording ready');
      } catch {
        if (epoch === generation.current) setStatus('Recording unavailable. Retry by starting a new match.');
      } finally {
        if (epoch === generation.current) busy.current = false;
      }
    }, 333);
  }
  function snapshotClip(): string[] | null {
    return frames.current.length >= 4 ? [...frames.current] : null;
  }
  function triggerHighlight(type: HighlightType) {
    const snapshot = snapshotClip();
    if (snapshot) marked.current = { frames: snapshot, type };
  }
  function stopAndGetClip() {
    stop();
    const clip = marked.current;
    marked.current = null;
    frames.current = [];
    return clip;
  }
  return { startCapture, snapshotClip, triggerHighlight, stopAndGetClip,
    isCapturing: () => timer.current !== null, captureStatus };
}
