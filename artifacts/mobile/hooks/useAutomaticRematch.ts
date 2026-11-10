import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { createRematchController, subscribeRematchCancel } from '@/store/rematch';

export function useAutomaticRematch(enabled: boolean, blocked: boolean, onStart: () => void) {
  const controller = useRef(createRematchController());
  const [remaining, setRemaining] = useState<number | null>(15);
  const latest = useRef({ enabled, blocked, onStart });
  const wasEnabled = useRef(enabled);
  latest.current = { enabled, blocked, onStart };
  const cancel = useCallback(() => {
    controller.current.cancel();
    setRemaining(null);
  }, []);
  useEffect(() => subscribeRematchCancel(cancel), [cancel]);
  useEffect(() => {
    if (blocked) cancel();
  }, [blocked, cancel]);
  useEffect(() => {
    if (wasEnabled.current && !enabled) cancel();
    wasEnabled.current = enabled;
  }, [enabled, cancel]);
  useFocusEffect(useCallback(() => {
    const foreground = () => AppState.currentState === 'active' &&
      (Platform.OS !== 'web' || document.visibilityState === 'visible');
    if (!foreground()) cancel();
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    const visibility = () => { if (!foreground()) cancel(); };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => {
      const current = latest.current;
      // Hydration does not consume the reading time.
      if (!current.enabled) return;
      const next = controller.current.tick(!current.blocked && foreground());
      setRemaining(next);
      if (next === 0) current.onStart();
    }, 1000);
    return () => {
      clearInterval(timer);
      sub.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility);
      cancel();
    };
  }, [cancel]));
  return { remaining: enabled && !blocked ? remaining : null, cancel };
}
