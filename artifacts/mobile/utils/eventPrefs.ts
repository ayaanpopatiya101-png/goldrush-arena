// Per-profile Events preferences: followed items and in-app reminder toggles.
// Stored locally only. Reminders are shown inside the app; no push notifications are scheduled.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface EventPrefs { follows: string[]; reminders: string[] }
const EMPTY: EventPrefs = { follows: [], reminders: [] };
const keyFor = (profileKey: string) => `goldrush.eventPrefs.v1.${profileKey || 'default'}`;

export function useEventPrefs(profileKey: string) {
  const [prefs, setPrefs] = useState<EventPrefs>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const raw = await AsyncStorage.getItem(keyFor(profileKey));
      const parsed = raw ? (JSON.parse(raw) as Partial<EventPrefs>) : {};
      setPrefs({ follows: parsed.follows ?? [], reminders: parsed.reminders ?? [] });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [profileKey]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async (field: keyof EventPrefs, id: string): Promise<boolean> => {
    const prev = prefsRef.current;
    const list = prev[field];
    const next = { ...prev, [field]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
    setPrefs(next);
    try {
      await AsyncStorage.setItem(keyFor(profileKey), JSON.stringify(next));
      return true;
    } catch {
      setPrefs(prev);
      return false;
    }
  }, [profileKey]);

  return { prefs, status, reload: load, toggle };
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Next (or current) local-device window for a weekday-based schedule entry. */
export function scheduleWindow(startDay: number, endDay: number, now = new Date()) {
  const today = now.getDay();
  const len = ((endDay - startDay + 7) % 7) + 1;
  const offsetIntoWindow = (today - startDay + 7) % 7;
  const active = offsetIntoWindow < len;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + (active ? -offsetIntoWindow : (startDay - today + 7) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + len);
  return { start, end, active, days: startDay === endDay ? DAY_NAMES[startDay] : `${DAY_NAMES[startDay]}–${DAY_NAMES[endDay]}` };
}

export function fmtLocal(d: Date): string {
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function fmtSpan(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function deviceTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'device local time'; } catch { return 'device local time'; }
}

/** Explicit local-device windows for local challenges, independent of countdown math. */
export function localChallengeWindow(type: 'weekly' | 'monthly' | 'annual', endsInMs: number, now = new Date()): { opens: Date | null; closes: Date } {
  const y = now.getFullYear(), mo = now.getMonth();
  if (type === 'monthly') {
    const opening = new Date(y, mo, 28);
    return { opens: now >= opening ? null : opening,
      closes: new Date(opening.getFullYear(), opening.getMonth() + 1, 1) };
  }
  if (type === 'annual') {
    const opening = new Date(y, 9, 28);
    return { opens: now >= opening ? null : opening,
      closes: new Date(opening.getFullYear() + 1, 0, 1) };
  }
  return { opens: null, closes: new Date(now.getTime() + endsInMs) };
}
