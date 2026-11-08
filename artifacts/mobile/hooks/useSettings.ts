import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const SETTINGS_KEY = '@goldrush_settings_v1';

export interface AppSettings {
  musicEnabled:    boolean;
  soundEnabled:    boolean;
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
  sensitivity:     1.0,
  colorBoard:      false,
  showEmojis:      false,
  screenShake:     true,
  hapticsEnabled:  true,
  showLobbyRules:  true,
  reducedEffects: false,
};

let _cached: AppSettings = { ...DEFAULTS };
const listeners = new Set<(settings: AppSettings) => void>();

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(_cached);
  const [loaded,   setLoaded]   = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { listeners.add(setSettings); return () => { listeners.delete(setSettings); }; }, []);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (raw) {
        try { const parsed = { ...DEFAULTS, ...JSON.parse(raw) }; _cached = parsed; setSettings(parsed); }
        catch { setError('Saved settings are unreadable. No stored settings were overwritten.'); }
      }
      setLoaded(true);
    }).catch(() => {
      setError('Saved settings could not be read. Check device storage.');
      setLoaded(true);
    });
  }, []);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ..._cached, [key]: value };
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      _cached = next;
      listeners.forEach(listener => listener(next));
      setError(null);
    } catch { setError('Setting was not saved. Check device storage and try again.'); }
  }, []);

  return { settings, updateSetting, loaded, error };
}

/** Read settings synchronously from the cached copy (for use outside React) */
export function getSettings(): AppSettings { return _cached; }
