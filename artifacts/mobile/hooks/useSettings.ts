import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const SETTINGS_KEY = '@goldrush_settings_v1';

export interface AppSettings {
  musicEnabled:  boolean;
  soundEnabled:  boolean;
  sensitivity:   number;    // 0.5 | 1.0 | 1.5
  colorBoard:    boolean;   // color-shifting board
}

const DEFAULTS: AppSettings = {
  musicEnabled: true,
  soundEnabled: true,
  sensitivity:  1.0,
  colorBoard:   true,
};

let _cached: AppSettings = { ...DEFAULTS };

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(_cached);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then(raw => {
      if (raw) {
        try { const parsed = { ...DEFAULTS, ...JSON.parse(raw) }; _cached = parsed; setSettings(parsed); }
        catch { /* ignore */ }
      }
      setLoaded(true);
    });
  }, []);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ..._cached, [key]: value };
    _cached = next;
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  }, []);

  return { settings, updateSetting, loaded };
}

/** Read settings synchronously from the cached copy (for use outside React) */
export function getSettings(): AppSettings { return _cached; }
