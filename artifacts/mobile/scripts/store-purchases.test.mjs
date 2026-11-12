import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const ts = createRequire(import.meta.url)('typescript');
const noop = () => {};
const generic = new Proxy({}, { get: () => noop });

// Exercise the actual provider callbacks with memory storage and a non-charging receipt verifier.
async function harness(storage = new Map()) {
  const key = '@goldrush_v3_receipts';
  let stateIndex = 0, refIndex = 0, failSave = false, failVerify = false, failCleanup = false;
  const states = [], refs = [];
  const modules = {
    react: {
      createContext: () => ({ Provider: 'Provider' }), createElement: (type, props) => ({ type, props }),
      useState: initial => {
        const i = stateIndex++;
        if (!(i in states)) states[i] = i === 0 && storage.has(key) ? JSON.parse(storage.get(key)) : typeof initial === 'function' ? initial() : initial;
        return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
      },
      useRef: initial => refs[refIndex++] ??= { current: initial },
      useEffect: noop, useCallback: fn => fn,
    },
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (k, value) => {
        if ((k === key && failSave) || (k.endsWith('pending-store-receipts') && value === '[]' && failCleanup)) throw new Error('fixture storage full');
        storage.set(k, value);
      },
    },
    '@/utils/arenaSession': { arenaRequestOptions: async () => ({ headers: { Authorization: 'Bearer fixture' } }) },
    '@workspace/api-client-react': {
      verifyNativePurchase: async ({ transactionIdentifier }) => {
        if (failVerify) throw new Error('fixture pending receipt');
        return { code: `GR-ABCDEF-${transactionIdentifier}` };
      },
    },
  };
  const exports = {};
  const source = (await readFile(new URL('../context/PlayerContext.tsx', import.meta.url), 'utf8')).replace(/if \(!isLoaded\) return <StartupState[^;]+;/, '');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, {
    exports, require: id => modules[id] ?? generic, console, Date, Math,
    process: { env: { EXPO_PUBLIC_DOMAIN: 'fixture.invalid' } },
    fetch: async () => ({ ok: true, json: async () => ({ reward: { rewardType: 'coins', rewardAmount: 1000, label: '1,000 device coins' } }) }),
  });
  return {
    storage, key,
    render() { stateIndex = 0; refIndex = 0; return exports.PlayerProvider({ username: 'receipts', onLogout: noop }).props.value; },
    failSave(value) { failSave = value; }, failVerify(value) { failVerify = value; }, failCleanup(value) { failCleanup = value; },
  };
}
const receipt = { productIdentifier: 'com.goldrush.arena.starter_sack', transactionIdentifier: '123ABC' };

test('concurrent receipt retries and reloads add coins once, not once per SDK callback', async () => {
  const h = await harness(), p = h.render(), initial = p.profile.coins;
  await Promise.all([p.applyStorePurchases([receipt]), p.applyStorePurchases([receipt])]);
  assert.equal(h.render().profile.coins, initial + 1000);
  const reopened = await harness(h.storage);
  await reopened.render().applyStorePurchases([receipt]);
  assert.equal(reopened.render().profile.coins, initial + 1000);
});
test('pending or failed verification grants nothing and preserves a receipt for retry', async () => {
  const h = await harness(), p = h.render(), initial = p.profile.coins;
  h.failVerify(true);
  await assert.rejects(p.applyStorePurchases([receipt]), /awaiting verification/);
  assert.equal(h.render().profile.coins, initial);
  assert.equal(JSON.parse(h.storage.get(`${h.key}:pending-store-receipts`)).length, 1);
  h.failVerify(false);
  await h.render().replayPendingStorePurchases();
  assert.equal(h.render().profile.coins, initial + 1000);
});
test('failed device save can reclaim its owner-bound code without losing or duplicating a reward', async () => {
  const h = await harness(), p = h.render(), initial = p.profile.coins;
  h.failSave(true);
  await assert.rejects(p.applyStorePurchases([receipt]));
  assert.equal(h.render().profile.coins, initial);
  h.failSave(false);
  await h.render().replayPendingStorePurchases();
  await h.render().applyStorePurchases([receipt]);
  assert.equal(h.render().profile.coins, initial + 1000);
});
test('an interruption after the reward commit but before receipt cleanup does not duplicate coins', async () => {
  const h = await harness(), p = h.render(), initial = p.profile.coins;
  h.failCleanup(true);
  await assert.rejects(p.applyStorePurchases([receipt]));
  assert.equal(h.render().profile.coins, initial + 1000);
  h.failCleanup(false);
  const reopened = await harness(h.storage);
  await reopened.render().replayPendingStorePurchases();
  assert.equal(reopened.render().profile.coins, initial + 1000);
});
