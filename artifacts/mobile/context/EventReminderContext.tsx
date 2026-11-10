import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePlayer, EVENT_MIN_RANK_INDEX, getCurrentEvents, getRankIndex } from './PlayerContext';
import { FEATURED_MODES } from '@/utils/featuredModes';
import { localChallengeWindow, scheduleWindow } from '@/utils/eventWindows';
import { notificationDriver } from '@/utils/eventNotificationDriver';
import { eventNotificationScheduler as scheduler, phoneReminderStorageKey } from '@/utils/eventNotificationScheduler';
import {
  parseReminderPrefs, planEventReminders, REMINDER_DEFAULTS, validLeadMinutes,
  type PhoneReminderPrefs, type PlannedReminder, type ReminderEvent,
} from '@/utils/eventNotificationRules';

type Permission = 'allowed' | 'denied' | 'prompt' | 'unavailable';
interface ReminderState {
  supported: boolean;
  ready: boolean;
  busy: boolean;
  permission: Permission;
  prefs: PhoneReminderPrefs;
  events: ReminderEvent[];
  scheduled: PlannedReminder[];
  error: string | null;
  save: (patch: Partial<Pick<PhoneReminderPrefs, 'enabled' | 'leadMinutes' | 'events'>>) => Promise<boolean>;
  retry: () => void;
  reset: () => Promise<void>;
}
const Context = createContext<ReminderState | null>(null);

function eligibleEvents(rank: string): ReminderEvent[] {
  const now = new Date();
  const local = getCurrentEvents();
  const eligible = getRankIndex(rank) >= EVENT_MIN_RANK_INDEX;
  return [
    ...FEATURED_MODES.map(mode => {
      const win = scheduleWindow(mode.startDay, mode.endDay, now);
      return { id: mode.id, name: mode.name, closesAt: win.end.getTime(), active: win.active, eligible: true };
    }),
    ...[local.weekly, local.monthly, local.annual].map(event => ({
      id: event.id, name: event.name,
      closesAt: localChallengeWindow(event.type, event.endsIn, now).closes.getTime(),
      active: !event.isLocked, eligible,
    })),
  ];
}

export function EventReminderProvider({ children }: { children: React.ReactNode }) {
  const { currentUsername, profile, isLoaded } = usePlayer();
  const [prefs, setPrefs] = useState<PhoneReminderPrefs>({ ...REMINDER_DEFAULTS, events: [] });
  const prefsRef = useRef(prefs);
  const [events, setEvents] = useState<ReminderEvent[]>([]);
  const [scheduled, setScheduled] = useState<PlannedReminder[]>([]);
  const [permission, setPermission] = useState<Permission>(notificationDriver.supported ? 'prompt' : 'unavailable');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const action = useRef(false);
  const owner = useRef('');
  const rank = useRef(profile.rank);
  rank.current = profile.rank;
  const key = phoneReminderStorageKey(currentUsername);

  const reconcile = useCallback(async (settings: PhoneReminderPrefs) => {
    const nextEvents = eligibleEvents(rank.current);
    const p = notificationDriver.supported ? await notificationDriver.permission() : 'unavailable';
    const actual = await scheduler.reconcile(
      planEventReminders(owner.current, settings, nextEvents, Date.now()),
      () => alive.current,
    );
    if (alive.current) {
      setPermission(p); setEvents(nextEvents); setScheduled(actual);
    }
  }, []);

  const load = useCallback(async () => {
    if (action.current) return;
    action.current = true;
    setBusy(true); setReady(false); setError(null);
    try {
      // This application owns the prefix, not all system notifications.
      // Remove an outgoing profile's reminders before reading another profile.
      await scheduler.cancelAll();
      const raw = await AsyncStorage.getItem(key);
      const settings = parseReminderPrefs(raw);
      let savedOwner = await AsyncStorage.getItem(`${key}.owner`);
      if (!savedOwner) {
        savedOwner = Crypto.randomUUID();
        await AsyncStorage.setItem(`${key}.owner`, savedOwner);
      }
      if (!alive.current) return;
      owner.current = savedOwner;
      prefsRef.current = settings; setPrefs(settings);
      await reconcile(settings);
      if (alive.current) setReady(true);
    } catch {
      if (alive.current) setError('Phone reminders could not be loaded or scheduled. Retry, or reset them. Device notification settings can also stop alerts.');
    } finally {
      action.current = false;
      if (alive.current) setBusy(false);
    }
  }, [key, reconcile]);

  useEffect(() => {
    alive.current = true;
    if (isLoaded) void load();
    return () => {
      alive.current = false;
      void scheduler.cancelAll().catch(() => {
        // No false success is shown on sign-out. A later startup retries this
        // cancellation; users can also revoke notifications in system settings.
      });
    };
  }, [isLoaded, load]);

  useEffect(() => {
    if (!ready) return;
    const refresh = async () => {
      if (action.current || AppState.currentState === 'background') return;
      action.current = true;
      try { await reconcile(prefsRef.current); if (alive.current) setError(null); }
      catch { if (alive.current) setError('Could not refresh phone reminders. Reopen Events and retry; device settings can stop alerts.'); }
      finally { action.current = false; }
    };
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    const interval = setInterval(() => { void refresh(); }, 60_000);
    void refresh();
    return () => { subscription.remove(); clearInterval(interval); };
  }, [ready, profile.rank, reconcile]);

  const save = useCallback(async (patch: Partial<Pick<PhoneReminderPrefs, 'enabled' | 'leadMinutes' | 'events'>>) => {
    if (!ready || action.current || !notificationDriver.supported) return false;
    const next = { ...prefsRef.current, ...patch };
    if (!validLeadMinutes(next.leadMinutes)) {
      setError('Choose a whole number of minutes between 5 and 10,080 (7 days).'); return false;
    }
    action.current = true; setBusy(true); setError(null);
    try {
      if (patch.enabled === true) {
        const status = await notificationDriver.permission(true);
        if (!alive.current) return false;
        setPermission(status);
        if (status !== 'allowed') {
          setError('Notifications were not allowed. Enable them in your phone settings, then try again.');
          return false;
        }
      }
      // Persist desired state before touching OS schedules so a failed
      // operation can be retried safely after app restart.
      await AsyncStorage.setItem(key, JSON.stringify(next));
      if (!alive.current) return false;
      prefsRef.current = next; setPrefs(next);
      await reconcile(next);
      return alive.current;
    } catch {
      if (alive.current) setError('Could not update every phone reminder. Retry to apply your saved choices. To stop all alerts immediately, use your phone notification settings.');
      return false;
    } finally {
      action.current = false; if (alive.current) setBusy(false);
    }
  }, [key, ready, reconcile]);

  const reset = useCallback(async () => {
    if (action.current) return;
    action.current = true; setBusy(true); setError(null);
    try {
      const defaults = { ...REMINDER_DEFAULTS, events: [] };
      await AsyncStorage.setItem(key, JSON.stringify(defaults));
      await scheduler.cancelAll();
      if (!owner.current) {
        const savedOwner = await AsyncStorage.getItem(`${key}.owner`) ?? Crypto.randomUUID();
        await AsyncStorage.setItem(`${key}.owner`, savedOwner);
        owner.current = savedOwner;
      }
      if (!alive.current) return;
      prefsRef.current = defaults; setPrefs(defaults); setScheduled([]); setReady(true);
      setEvents(eligibleEvents(rank.current));
    } catch {
      if (alive.current) setError('Could not reset phone reminders. Retry or turn off GoldRush notifications in phone settings.');
    } finally { action.current = false; if (alive.current) setBusy(false); }
  }, [key]);

  return <Context.Provider value={{
    supported: notificationDriver.supported, ready, busy, permission, prefs, events, scheduled, error,
    save, reset, retry: () => { void load(); },
  }}>{children}</Context.Provider>;
}

export function useEventReminders() {
  const value = useContext(Context);
  if (!value) throw new Error('EventReminderProvider is required');
  return value;
}
