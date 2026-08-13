/**
 * Stable device identifier — a UUID v4 generated once on first launch and
 * persisted in AsyncStorage.  Used as the leaderboard key for challenge scores
 * so it remains stable even if the player changes their display name, and so
 * two players with the same display name cannot overwrite each other's scores.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@goldrush:deviceId';
let _cached: string | null = null;

/** Returns the device's stable UUID, generating one on first call. */
export async function getDeviceId(): Promise<string> {
  if (_cached) return _cached;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) { _cached = stored; return stored; }
  } catch { /* ignore */ }
  const id = generateUUID();
  _cached = id;
  AsyncStorage.setItem(DEVICE_ID_KEY, id).catch(() => {});
  return id;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
