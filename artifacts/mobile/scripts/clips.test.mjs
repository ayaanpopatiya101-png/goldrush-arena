import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const jpeg = require('jpeg-js');
const { GifReader } = require('omggif');

function load(path, mocks = {}, globals = {}) {
  const source = readFileSync(new URL(`../${path}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: name => mocks[name] ?? require(name),
    Uint8Array, Uint8ClampedArray, atob, btoa, setTimeout, clearTimeout, console, ...globals };
  vm.runInNewContext(code, context, { filename: path });
  return module.exports;
}
const encoder = load('utils/gifEncoder');
const rules = load('utils/clipExportRules');
function recordedFrames(count = 4, size = 48) {
  return Array.from({ length: count }, (_, frame) => {
    const data = new Uint8Array(size * size * 4);
    let seed = frame + 55;
    for (let i = 0; i < data.length; i += 4) {
      seed = Math.imul(seed, 1664525) + 1013904223 | 0;
      data.set([seed & 255, seed >>> 8 & 255, seed >>> 16 & 255, 255], i);
    }
    return Buffer.from(jpeg.encode({ data, width: size, height: size }, 48).data).toString('base64');
  });
}
function store() {
  const data = new Map();
  let broken = false;
  return { data, break: () => { broken = true; }, getItem: async key => {
    if (broken) throw new Error('storage full'); return data.get(key) ?? null;
  }, setItem: async (key, value) => {
    if (broken) throw new Error('storage full'); data.set(key, value);
  }};
}
const clip = frames => ({ frames, gifBase64: '', type: 'manual', score: 8, clipScore: 25, tier: 'BASIC', tierColor: '#fff' });

test('independent GIF decoder reads every pixel across LZW size transitions and resets', () => {
  const frames = recordedFrames(4, 180);
  const gif = encoder.createHighlightGIF(frames);
  const reader = new GifReader(gif);
  assert.equal(reader.numFrames(), 4);
  assert.equal(reader.width, 180);
  for (let n = 0; n < 4; n++) {
    assert.equal(reader.frameInfo(n).delay, 33);
    const rgba = new Uint8Array(180 * 180 * 4);
    reader.decodeAndBlitFrameRGBA(n, rgba);
    const decoded = encoder.decodeJpegBase64(frames[n]).data;
    for (let i = 0; i < rgba.length; i += 4) {
      assert.equal(rgba[i], Math.round(Math.round(decoded[i] * 7 / 255) * 255 / 7));
      assert.equal(rgba[i + 1], Math.round(Math.round(decoded[i + 1] * 7 / 255) * 255 / 7));
      assert.equal(rgba[i + 2], Math.round(Math.round(decoded[i + 2] * 3 / 255) * 255 / 3));
      assert.equal(rgba[i + 3], 255);
    }
  }
});
test('empty, missing, corrupt, mismatched frames and invalid timing fail explicitly', () => {
  const frames = recordedFrames();
  for (const bad of [[], [frames[0]], [frames[0], ''], [frames[0], 'corrupt'], [frames[0], recordedFrames(2, 24)[0]]]) {
    assert.throws(() => encoder.createHighlightGIF(bad));
  }
  assert.throws(() => encoder.createHighlightGIF(frames, undefined, undefined, 0));
  assert.throws(() => encoder.encodeGIF([new Uint8ClampedArray(1)], 20, 20, 33));
});
test('concurrent saves survive reload, lazy GIFs encode, trim frames persist and delete is durable', async () => {
  const storage = store();
  const mocks = { '@react-native-async-storage/async-storage': storage };
  const lib = load('store/clipLibrary', mocks);
  const frames = recordedFrames();
  const entries = await Promise.all(Array.from({ length: 3 }, () => lib.saveClipToLibrary(clip(frames))));
  assert.equal(new Set(entries.map(e => e.id)).size, 3);
  const reloaded = load('store/clipLibrary', mocks);
  assert.equal((await reloaded.getClipLibrary()).length, 3);
  assert.equal(new GifReader(encoder.createHighlightGIF((await reloaded.getClipLibrary())[0].frames)).numFrames(), 4);
  await reloaded.updateClipInLibrary(entries[0].id, { frames: frames.slice(1, 3), gifBase64: '' });
  assert.equal((await reloaded.getClipLibrary()).find(c => c.id === entries[0].id).frames.length, 2);
  await reloaded.deleteClipFromLibrary(entries[0].id);
  assert.equal((await load('store/clipLibrary', mocks).getClipLibrary()).length, 2);
  await assert.rejects(reloaded.updateClipInLibrary('deleted', {}));
});
test('library is bounded and storage failures never masquerade as an empty library', async () => {
  const storage = store();
  const lib = load('store/clipLibrary', { '@react-native-async-storage/async-storage': storage });
  for (let i = 0; i < 55; i++) await lib.saveClipToLibrary(clip(recordedFrames(2, 4)));
  assert.equal((await lib.getClipLibrary()).length, 50);
  storage.data.set('@goldrush_clip_library_v1', '{bad');
  await assert.rejects(lib.getClipLibrary());
  await assert.rejects(lib.saveClipToLibrary(clip(recordedFrames())));
  storage.break();
  await assert.rejects(lib.getClipLibrary());
});
test('repeated and concurrent export bonuses cannot exceed one per source or the daily cap', async () => {
  const storage = store();
  const mocks = { '@react-native-async-storage/async-storage': storage };
  const rewards = load('utils/clipRewards', mocks);
  const id = rewards.clipRewardIdentity(recordedFrames());
  const results = await Promise.all(Array.from({ length: 12 }, () => rewards.consumeClipRewardSlot(id)));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await load('utils/clipRewards', mocks).consumeClipRewardSlot(id), false);
  const other = await Promise.all(Array.from({ length: 10 }, (_, i) => rewards.consumeClipRewardSlot(`other-${i}`)));
  assert.equal(other.filter(Boolean).length, 4);
  storage.break();
  await assert.rejects(rewards.consumeClipRewardSlot('new'));
});
test('web unsupported file sharing downloads GIF and cancellation does not download', async () => {
  let clicked = 0;
  const globals = {
    File, navigator: {}, URL: { createObjectURL: file => { assert.equal(file.type, 'image/gif'); return 'blob:test'; }, revokeObjectURL() {} },
    document: { createElement: () => ({ click: () => clicked++, remove() {} }), body: { appendChild() {} } },
    setTimeout: () => 0,
  };
  const web = load('utils/clipExport', { './clipExportRules': rules }, globals);
  const gif = Buffer.from(encoder.createHighlightGIF(recordedFrames())).toString('base64');
  assert.match(await web.exportClip(gif, 'share'), /download requested.*unavailable/);
  assert.equal(clicked, 1);
  globals.navigator.canShare = () => true;
  globals.navigator.share = async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); };
  assert.match(await web.exportClip(gif, 'share'), /cancelled/);
  assert.equal(clicked, 1);
  await assert.rejects(web.exportClip('bm90LWEtZ2lm', 'download'));
});
test('native add-only denial never saves; limited permission saves only after API completion', async () => {
  let saved = 0, removed = 0, permissionArgs;
  let permission = { granted: false, canAskAgain: true, accessPrivileges: 'none' };
  let failure = null;
  const gif = Buffer.from(encoder.createHighlightGIF(recordedFrames())).toString('base64');
  const native = load('utils/clipExport.native', {
    './clipExportRules': rules,
    'react-native': { Platform: { OS: 'ios', Version: 18 } },
    'expo-file-system/legacy': { cacheDirectory: 'file://cache/', EncodingType: { Base64: 'base64' },
      writeAsStringAsync: async () => {}, getInfoAsync: async () => ({ exists: true, size: atob(gif).length }),
      deleteAsync: async () => { removed++; } },
    'expo-sharing': { isAvailableAsync: async () => false },
    'expo-media-library': {
      getPermissionsAsync: async (...args) => { permissionArgs = args; return permission; },
      requestPermissionsAsync: async () => permission,
      saveToLibraryAsync: async () => { if (failure) throw failure; saved++; },
    },
  });
  await assert.rejects(native.exportClip(gif, 'photos'), /permission denied/);
  assert.equal(saved, 0);
  assert.equal(permissionArgs[0], true);
  assert.equal(permissionArgs[1].length, 0);
  permission = { granted: true, accessPrivileges: 'limited' };
  assert.match(await native.exportClip(gif, 'photos'), /GIF saved to Photos/);
  assert.equal(saved, 1);
  failure = new Error('ENOSPC storage full');
  await assert.rejects(native.exportClip(gif, 'photos'), /ENOSPC/);
  assert.equal(saved, 1);
  assert.match(rules.exportErrorMessage(failure), /full/);
  await assert.rejects(native.exportClip(gif, 'share'), /unavailable/);
  assert.equal(removed, 4);
});

test('stopping capture cancels timers and discards late asynchronous captures', async () => {
  let tick, cleanup, resolveCapture;
  const react = {
    useRef: current => ({ current }),
    useState: initial => [initial, () => {}],
    useEffect: effect => { cleanup = effect(); },
  };
  const { useClipCaptureBuffer } = load('hooks/useClipCaptureBuffer', { react }, {
    setInterval: fn => { tick = fn; return 1; },
    clearInterval: () => {},
  });
  let late = false;
  const capture = useClipCaptureBuffer(async () => {
    if (late) return new Promise(resolve => { resolveCapture = resolve; });
    return recordedFrames(2, 4)[0];
  });
  capture.startCapture({ current: {} });
  for (let i = 0; i < 4; i++) await tick();
  assert.equal(capture.snapshotClip().length, 4);
  capture.triggerHighlight('manual');
  late = true;
  const inFlight = tick();
  const clip = capture.stopAndGetClip();
  assert.equal(clip.frames.length, 4);
  resolveCapture('late-frame');
  await inFlight;
  assert.equal(capture.snapshotClip(), null);
  assert.equal(capture.isCapturing(), false);
  cleanup();
});

test('normal live matches and offline matches both wire recording through to results', () => {
  const online = readFileSync(new URL('../components/multiplayer/OnlineMatch.tsx', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../components/multiplayer/LiveMatchView.tsx', import.meta.url), 'utf8');
  const game = readFileSync(new URL('../app/game.tsx', import.meta.url), 'utf8');
  const results = readFileSync(new URL('../app/postgame.tsx', import.meta.url), 'utf8');
  assert.match(online, /capture.startCapture\(captureTarget\)/);
  assert.match(online, /captureTarget=\{captureTarget\}/);
  assert.match(online, /setPendingClip\(frames, "manual", verified.deflections/);
  assert.match(view, /Capture this moment/);
  assert.match(view, /captureTarget.current = node/);
  assert.match(game, /startCapture\(arenaWrapRef/);
  assert.doesNotMatch(results, /useEffect\(\(\) => \(\) => clearPendingClip/);
});
