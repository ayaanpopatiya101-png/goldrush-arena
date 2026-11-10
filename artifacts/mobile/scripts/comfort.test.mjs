import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { createRematchController } from '../store/rematch.ts';

const ts = createRequire(import.meta.url)('typescript');
async function load(path, modules = {}, globals = {}) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => modules[id], ...globals });
  return exports;
}

async function settingsHarness(raw) {
  const store = new Map(raw ? [['@goldrush_settings_v1', raw]] : []);
  const effects = [];
  const api = await load('hooks/useSettings.ts', {
    react: { useState: value => [value, () => {}], useCallback: fn => fn, useEffect: fn => effects.push(fn) },
    '@react-native-async-storage/async-storage': {
      getItem: async key => store.get(key) ?? null,
      setItem: async (key, value) => { store.set(key, value); },
    },
  });
  const hook = api.useSettings();
  effects.forEach(fn => fn());
  await new Promise(resolve => setImmediate(resolve));
  return { api, hook, store };
}

test('safe defaults, explicit old preferences, invalid values and reload', async () => {
  const fresh = await settingsHarness();
  assert.equal(fresh.api.getSettings().screenShake, false);
  const saved = await settingsHarness(JSON.stringify({ screenShake: true, soundEnabled: false, sensitivity: 0.5 }));
  assert.equal(saved.api.getSettings().screenShake, true);
  assert.equal(saved.api.getSettings().soundEnabled, false);
  assert.equal(saved.api.getSettings().sensitivity, 0.6);
  await Promise.all([
    saved.hook.updateSetting('gameSoundEnabled', false),
    saved.hook.updateSetting('celebrationSoundEnabled', false),
    saved.hook.updateSetting('autoRematch', false),
    saved.hook.updateSetting('reducedEffects', true),
    saved.hook.updateSetting('hapticsEnabled', false),
    saved.hook.updateSetting('musicEnabled', false),
    saved.hook.updateSetting('sensitivity', 1.5),
  ]);
  const reloaded = await settingsHarness(saved.store.get('@goldrush_settings_v1'));
  assert.deepEqual(JSON.parse(JSON.stringify(reloaded.api.getSettings())), JSON.parse(saved.store.get('@goldrush_settings_v1')));
  assert.equal(reloaded.api.getSettings().autoRematch, false);
  await reloaded.hook.resetSettings();
  assert.equal(reloaded.api.getSettings().screenShake, false);
  assert.equal(reloaded.api.getSettings().sensitivity, 1);
  const invalid = await settingsHarness('{"screenShake":"yes","sensitivity":99}');
  assert.equal(invalid.api.getSettings().screenShake, false);
  assert.equal(invalid.api.getSettings().sensitivity, 1);
});

test('corrupt storage is not silently overwritten; explicit reset recovers', async () => {
  const h = await settingsHarness('{');
  await h.hook.updateSetting('screenShake', true);
  assert.equal(h.store.get('@goldrush_settings_v1'), '{');
  await h.hook.resetSettings();
  assert.equal(JSON.parse(h.store.get('@goldrush_settings_v1')).screenShake, false);
});

test('countdown gives 15 seconds and fires only once; unsafe and cancelled runs never resume', () => {
  const c = createRematchController();
  for (let i = 14; i >= 0; i--) assert.equal(c.tick(true), i);
  assert.equal(c.tick(true), null);
  for (const reason of ['background', 'blur', 'overlay', 'party', 'settings']) {
    const stopped = createRematchController();
    assert.equal(stopped.tick(true), 14);
    if (reason === 'settings' || reason === 'blur') stopped.cancel();
    else assert.equal(stopped.tick(false), null);
    for (let i = 0; i < 20; i++) assert.equal(stopped.tick(true), null, reason);
  }
});

test('hook cancels on app background, browser hiding, route blur, overlays and settings', async () => {
  for (const reason of ['app', 'browser', 'route', 'overlay', 'settings']) {
    const rematch = await load('store/rematch.ts');
    const effects = [];
    let interval, appEvent, visibilityEvent, cleanup, started = 0;
    const doc = { visibilityState: 'visible',
      addEventListener: (_, fn) => { visibilityEvent = fn; }, removeEventListener() {} };
    const app = { currentState: 'active',
      addEventListener: (_, fn) => { appEvent = fn; return { remove() {} }; } };
    const api = await load('hooks/useAutomaticRematch.ts', {
      react: { useState: v => [v, () => {}], useRef: current => ({ current }),
        useCallback: fn => fn, useEffect: fn => effects.push(fn) },
      'react-native': { AppState: app, Platform: { OS: 'web' } },
      'expo-router': { useFocusEffect: fn => { cleanup = fn(); } },
      '@/store/rematch': rematch,
    }, { document: doc, setInterval: fn => { interval = fn; return 1; }, clearInterval() {} });
    api.useAutomaticRematch(true, reason === 'overlay', () => started++);
    effects.forEach(fn => fn());
    interval();
    if (reason === 'app') appEvent('background');
    if (reason === 'browser') { doc.visibilityState = 'hidden'; visibilityEvent(); doc.visibilityState = 'visible'; }
    if (reason === 'route') cleanup();
    if (reason === 'settings') rematch.cancelAutomaticRematch();
    for (let i = 0; i < 20; i++) interval();
    assert.equal(started, 0, reason);
  }
});

test('game and celebration channels are independent and global mute overrides queued notes', async () => {
  for (const platform of ['web', 'ios']) {
    const settings = { soundEnabled: true, gameSoundEnabled: false, celebrationSoundEnabled: true };
    const queued = [];
    let tones = 0;
    class AudioContext {
      currentTime = 0;
      createOscillator() { tones++; return { connect() {}, frequency: { setValueAtTime() {} }, start() {}, stop() {} }; }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, setTargetAtTime() {} } }; }
      close() {}
    }
    const api = await load('hooks/useSoundFX.ts', {
      'react-native': { Platform: { OS: platform } },
      'expo-file-system': { File: class { exists = true; uri = 'tone'; }, Paths: { cache: '' } },
      'expo-audio': { createAudioPlayer: () => { tones++; return { addListener: () => ({ remove() {} }), play() {} }; } },
      '@/hooks/useSettings': { getSettings: () => settings },
    }, { AudioContext, setTimeout: fn => queued.push(fn) });
    const sfx = api.useSoundFX(true);
    sfx.paddleHit();
    assert.equal(tones, 0);
    sfx.rankUp();
    queued.splice(0).forEach(fn => fn());
    assert.equal(tones, 5);
    settings.celebrationSoundEnabled = false;
    settings.gameSoundEnabled = true;
    sfx.rankUp();
    queued.splice(0).forEach(fn => fn());
    assert.equal(tones, 5);
    sfx.paddleHit();
    assert.equal(tones, 6);
    sfx.goalScored();
    settings.soundEnabled = false;
    queued.splice(0).forEach(fn => fn());
    assert.equal(tones, 6);
  }
});
