import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const SETTINGS_KEY = '@goldrush_settings_v1';

export interface AppSettings {
  musicEnabled:    boolean;
  soundEnabled:    boolean;
  gameSoundEnabled: boolean;
  celebrationSoundEnabled: boolean;
  autoRematch: boolean;
  sensitivity:     number;    // 0.5 | 1.0 | 1.5
  colorBoard:      boolean;   // color-shifting board
  showEmojis:      boolean;   // floating goal emojis
  screenShake:     boolean;   // arena shake on goal
  hapticsEnabled:  boolean;   // vibration on hits, goals, events
  showLobbyRules:  boolean;   // rules card shown in lobby
  reducedEffects: boolean;
}

const DEFAULTS: AppSettings = {
  musicEnabled:    true,
  soundEnabled:    true,
  gameSoundEnabled: true,
  celebrationSoundEnabled: true,
  autoRematch: true,
  sensitivity:     1.0,
  colorBoard:      false,
  showEmojis:      false,
  screenShake:     false,
  hapticsEnabled:  true,
  showLobbyRules:  true,
  reducedEffects: false,
};

let _cached: AppSettings = { ...DEFAULTS };
const listeners = new Set<(settings: AppSettings) => void>();
let loading: Promise<void> | undefined;
let readError: string | null = null;
let writes = Promise.resolve();

/** Only known, valid values migrate; explicit legacy booleans are preserved. */
export function parseSettings(raw: string): AppSettings {
  const saved = JSON.parse(raw);
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid settings');
  const next = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof AppSettings)[]) {
    if (key === 'sensitivity') {
      if ([0.5, 0.6, 1, 1.5].includes(saved[key])) next.sensitivity = saved[key] === 0.5 ? 0.6 : saved[key];
    } else if (typeof saved[key] === 'boolean') {
      (next[key] as boolean) = saved[key];
    }
  }
  return next;
}

function loadSettings() {
  return loading ??= AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
    if (raw) _cached = parseSettings(raw);
    listeners.forEach(listener => listener(_cached));
  }).catch(() => { readError = 'Saved settings could not be read. Reset settings to recover; stored data was not overwritten.'; });
}

function saveSettings(change: (current: AppSettings) => AppSettings, reset = false) {
  const operation = writes.then(async () => {
    await loadSettings();
    if (readError && !reset) throw new Error(readError);
    const next = change(_cached);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    _cached = next;
    readError = null;
    listeners.forEach(listener => listener(next));
  });
  writes = operation.catch(() => {});
  return operation;
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(_cached);
  const [loaded,   setLoaded]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { listeners.add(setSettings); return () => { listeners.delete(setSettings); }; }, []);

  useEffect(() => {
    loadSettings().then(() => {
      setSettings(_cached);
      setError(readError);
      setLoaded(true);
    });
  }, []);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    try {
      await saveSettings(current => ({ ...current, [key]: value }));
      setError(null);
    } catch { setError('Setting was not saved. Check device storage and try again.'); }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      await saveSettings(() => ({ ...DEFAULTS }), true);
      setError(null);
    } catch { setError('Settings were not reset. Check device storage and try again.'); }
  }, []);

  return { settings, updateSetting, resetSettings, loaded, error };
}

/** Read settings synchronously from the cached copy (for use outside React) */
export function getSettings(): AppSettings { return _cached; }
