import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import { CATALOG, SKINS } from '@workspace/goldrush-catalog';
import { createProfile, importProfile, exportProfile, loadProfile, transact, DATABASE_NAME } from './profile';

beforeEach(() => { globalThis.indexedDB = new IDBFactory(); });
const saved = (coins = 200) => JSON.stringify({
  name: 'Regression player', coins, ownedSkins: ['default', 'season_aurora', 'legacy_skin'],
  currentSkin: 'default', ownedThemes: ['default', 'solar', 'unknown_theme'],
  currentArenaTheme: 'solar', seasonPassOwned: true, credits: 25, hiddenMigration: { keep: true },
});

test('new profiles persist without invented coins and cannot overwrite existing saves', async () => {
  await assert.rejects(createProfile('   '));
  const p = await createProfile(' Local player ');
  assert.equal(p.coins, 0);
  assert.equal(p.name, 'Local player');
  assert.deepEqual(await loadProfile(), p);
  await assert.rejects(createProfile('Replacement'), /already exists/);
  await assert.rejects(importProfile(saved()), /cannot overwrite/);
  assert.deepEqual(await loadProfile(), p);
});
test('purchase atomically saves exact wallet, ownership and equipped skin, then survives reopen', async () => {
  const p = await importProfile(saved());
  const purchased = await transact({ kind: 'purchase', itemId: 'plasma' });
  assert.equal(purchased.coins, 50);
  assert.equal(purchased.currentSkin, 'plasma');
  assert.equal(purchased.revision, p.revision + 1);
  assert.deepEqual(purchased.ownedSkins, [...p.ownedSkins, 'plasma']);
  assert.deepEqual(purchased.originalSave, JSON.parse(saved()));
  assert.deepEqual(purchased.ownedThemes, p.ownedThemes);
  assert.deepEqual(await loadProfile(), purchased);
  const equipped = await transact({ kind: 'equip', itemId: 'season_aurora' });
  assert.equal(equipped.currentSkin, 'season_aurora');
  assert.equal(equipped.coins, 50);
  assert.equal(JSON.parse(await exportProfile()).currentSkin, 'season_aurora');
});
test('duplicate simultaneous purchases serialize and charge once', async () => {
  await importProfile(saved());
  const results = await Promise.allSettled([
    transact({ kind: 'purchase', itemId: 'plasma' }),
    transact({ kind: 'purchase', itemId: 'plasma' }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await loadProfile())!.coins, 50);
  assert.equal((await loadProfile())!.ownedSkins.filter(id => id === 'plasma').length, 1);
});
test('competing purchases cannot spend the same balance twice', async () => {
  await importProfile(saved());
  const results = await Promise.allSettled([
    transact({ kind: 'purchase', itemId: 'plasma' }),
    transact({ kind: 'purchase', itemId: 'frost' }),
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await loadProfile())!.coins, 50);
});
test('locks, insufficient funds, non-skins, and unowned equip leave state unchanged', async () => {
  const initial = await importProfile(saved(10));
  for (const itemId of ['plasma', 'season_phantom', 'solar', 'season_pass', 'shield3', 'trail_fire', 'starter_sack']) {
    await assert.rejects(transact({ kind: 'purchase', itemId }));
    assert.deepEqual(await loadProfile(), initial);
  }
  await assert.rejects(transact({ kind: 'equip', itemId: 'frost' }), /Only owned/);
  await assert.rejects(transact({ kind: 'purchase', itemId: 'toxic', itemKind: 'theme' }));
  await assert.rejects(transact({ kind: 'equip', itemId: 'default', itemKind: 'theme' }));
  assert.deepEqual(await loadProfile(), initial);
});
test('corrupt/invalid imports fail explicitly without replacing a profile', async () => {
  for (const raw of ['not json', 'null', '[]', '{}', saved(-1), saved(1.5), saved(Number.MAX_SAFE_INTEGER + 1)]) {
    await assert.rejects(importProfile(raw));
    assert.equal(await loadProfile(), null);
  }
});
test('backup can recover a browser-local profile including legacy ownership and fields', async () => {
  const p = await importProfile(saved());
  const backup = await exportProfile();
  globalThis.indexedDB = new IDBFactory();
  assert.deepEqual(await importProfile(backup), p);
});
test('storage access failure never reports a purchase as successful', async () => {
  const original = globalThis.indexedDB;
  Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true, writable: true });
  await assert.rejects(createProfile('Player'), /storage is unavailable/);
  globalThis.indexedDB = original;
});
test('aborted write preserves wallet and ownership', async () => {
  const before = await importProfile(saved());
  const request = indexedDB.open(DATABASE_NAME, 1);
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
  await new Promise<void>(resolve => {
    const tx = db.transaction('profiles', 'readwrite');
    tx.objectStore('profiles').put({ ...before, coins: 0 }, 'player');
    tx.abort();
    tx.onabort = () => resolve();
  });
  db.close();
  assert.deepEqual(await loadProfile(), before);
});
test('coin catalog matches native source IDs, prices, colors and pass restrictions', () => {
  const source = readFileSync(new URL('../../../mobile/context/PlayerContext.tsx', import.meta.url), 'utf8');
  const block = source.slice(source.indexOf('export const SKINS = ['), source.indexOf('// ─── Rank helpers'));
  const native = [...block.matchAll(/\{ id: '([^']+)',\s+name: '([^']+)',\s+color: '([^']+)',\s+glowColor: '[^']+',\s+price: (\d+)(,\s+exclusive: true)?/g)]
    .map(([, id, name, color, price, exclusive]) => ({ id, name, color, price: Number(price), ...(exclusive ? { exclusive: true } : {}) }));
  assert.equal(native.length, 10);
  assert.deepEqual(SKINS, native);
  assert.equal(CATALOG.filter(i => i.available).length, 8);
  assert.ok(CATALOG.filter(i => i.kind === 'money').every(i => i.price === null && !i.available));
});
