import { SKINS, skinPurchaseError } from '@workspace/goldrush-catalog';

export interface ShopProfile {
  version: 1;
  name: string;
  coins: number;
  ownedSkins: string[];
  currentSkin: string;
  ownedThemes: string[];
  currentArenaTheme: string;
  revision: number;
  /** Keep migration-sensitive fields from the source, without changing them. */
  originalSave?: Record<string, unknown>;
}

export const DATABASE_NAME = 'goldrush-collectible-shop-local-v1';
const STORE = 'profiles';
const KEY = 'player';
const listeners = new Set<() => void>();
let channel: BroadcastChannel | undefined;

function notify() {
  listeners.forEach(fn => fn());
  channel?.postMessage('changed');
}
export function subscribeProfile(callback: () => void) {
  listeners.add(callback);
  if (typeof BroadcastChannel !== 'undefined' && !channel) {
    channel = new BroadcastChannel(DATABASE_NAME);
    channel.onmessage = () => listeners.forEach(fn => fn());
  }
  return () => { listeners.delete(callback); };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Persistent storage is unavailable. Enable browser storage and retry.')); return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open browser storage. Your existing save was not changed.'));
    request.onblocked = () => reject(new Error('Storage is busy in another tab. Close older shop tabs and retry.'));
  });
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 10000 || !value.every(v => typeof v === 'string' && v.length > 0 && v.length <= 200)) {
    throw new Error(`Invalid ${label}. Import a complete existing save or a shop backup.`);
  }
  return [...new Set(value)];
}
export function validateProfile(value: unknown): ShopProfile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid save file.');
  const p = value as Record<string, unknown>;
  if (p.version !== 1 || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 40 ||
    typeof p.coins !== 'number' || !Number.isSafeInteger(p.coins) || p.coins < 0 ||
    !Number.isSafeInteger(p.revision) || Number(p.revision) < 0) throw new Error('Invalid saved profile. Export a backup before attempting recovery.');
  const ownedSkins = stringArray(p.ownedSkins, 'skin ownership');
  const ownedThemes = stringArray(p.ownedThemes, 'theme ownership');
  if (typeof p.currentSkin !== 'string' || !ownedSkins.includes(p.currentSkin) ||
    typeof p.currentArenaTheme !== 'string' || !ownedThemes.includes(p.currentArenaTheme)) throw new Error('Equipped item is missing from saved ownership.');
  return { ...p, ownedSkins, ownedThemes } as ShopProfile;
}

/** A single IDB readwrite transaction serializes across tabs and commits the
 * wallet and ownership in ONE record. Success is emitted only on commit.
 */
async function access(update?: (current: ShopProfile | null) => ShopProfile): Promise<ShopProfile | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, update ? 'readwrite' : 'readonly');
    const store = tx.objectStore(STORE);
    const request = store.get(KEY);
    let result: ShopProfile | null = null;
    let failure: Error | undefined;
    request.onsuccess = () => {
      try {
        const current = request.result === undefined ? null : validateProfile(request.result);
        result = update ? validateProfile(update(current)) : current;
        if (update) store.put(result, KEY);
      } catch (error) {
        failure = error instanceof Error ? error : new Error('Invalid profile.');
        tx.abort();
      }
    };
    tx.oncomplete = () => { db.close(); if (update) notify(); resolve(result); };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(failure ?? new Error('Could not save to browser storage. No transaction was confirmed. Free some storage and retry.'));
    };
  });
}

export function loadProfile() { return access(); }
export async function createProfile(name: string): Promise<ShopProfile> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40) throw new Error('Enter a player name between 1 and 40 characters.');
  return (await access(current => {
    if (current) throw new Error('A local profile already exists. Reload to continue without overwriting it.');
    return { version: 1, name: trimmed, coins: 0, ownedSkins: ['default'], currentSkin: 'default', ownedThemes: ['default'], currentArenaTheme: 'default', revision: 0 };
  }))!;
}

export async function transact(action: { kind: 'purchase' | 'equip'; itemId: string; itemKind?: string }): Promise<ShopProfile> {
  return (await access(current => {
    if (!current) throw new Error('Create or import a local profile first.');
    if (action.itemKind !== undefined && action.itemKind !== 'skin') throw new Error('This product cannot be bought or equipped here.');
    const skin = SKINS.find(s => s.id === action.itemId);
    if (!skin) throw new Error('This product cannot be bought or equipped here.');
    if (action.kind === 'purchase') {
      const error = skinPurchaseError(current, skin.id);
      if (error) throw new Error(error);
      return { ...current, coins: current.coins - skin.price, ownedSkins: [...current.ownedSkins, skin.id], currentSkin: skin.id, revision: current.revision + 1 };
    }
    if (action.kind !== 'equip') throw new Error('Unsupported transaction.');
    if (!current.ownedSkins.includes(skin.id)) throw new Error('Only owned skins can be equipped.');
    return { ...current, currentSkin: skin.id, revision: current.revision + 1 };
  }))!;
}

export async function importProfile(raw: string): Promise<ShopProfile> {
  if (raw.length > 2_000_000) throw new Error('Save is too large. Maximum size is 2 MB.');
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw); } catch { throw new Error('Invalid JSON. Paste a complete existing save or shop backup.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid save.');
  // Native saves have no schema version. Keep the complete payload separately,
  // and copy only the fields needed for the shop. Never migrate native storage.
  const imported = validateProfile({
    ...parsed,
    version: 1,
    revision: parsed.version === 1 ? parsed.revision : 0,
    originalSave: parsed.version === 1 ? parsed.originalSave : parsed,
  });
  return (await access(current => {
    if (current) throw new Error('Import cannot overwrite an existing shop profile. Your collection is unchanged.');
    return imported;
  }))!;
}
export async function exportProfile(): Promise<string> {
  const current = await loadProfile();
  if (!current) throw new Error('No local profile to export.');
  return JSON.stringify(current, null, 2);
}
