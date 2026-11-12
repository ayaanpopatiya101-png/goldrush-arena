import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../utils/avatarImage.ts', import.meta.url), 'utf8');

function harness({ os = 'web', mime = 'image/jpeg', size = 1024, width = 800, height = 600, decodes = true, permission } = {}) {
  const calls = [];
  const ctx = {
    crop: rect => calls.push(['crop', rect]),
    resize: rect => calls.push(['resize', rect]),
    renderAsync: async () => {
      if (!decodes) throw new Error('invalid image');
      return { width, height, saveAsync: async options => { calls.push(['encode', options]); return { uri: 'clean.jpg' }; } };
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require: name => ({
      'react-native': { Platform: { OS: os }, Linking: { openSettings: async () => { throw new Error('unavailable'); } } },
      'expo-image-picker': {
        getMediaLibraryPermissionsAsync: async () => { calls.push(['permission']); return permission ?? { granted: true }; },
        requestMediaLibraryPermissionsAsync: async () => permission,
        launchImageLibraryAsync: async options => { calls.push(['picker', options]); return { assets: [{ uri: 'test.jpg', mimeType: mime, width, height, fileSize: size }] }; },
      },
      'expo-image-manipulator': { ImageManipulator: { manipulate: () => ctx }, SaveFormat: { JPEG: 'jpeg' } },
    })[name],
  });
  return { ...exports, calls };
}

test('Android system picker does not request undeclared broad library access', async () => {
  const h = harness({ os: 'android' });
  assert.equal((await h.pickAvatarPhoto()).kind, 'picked');
  assert.equal(h.calls.some(([name]) => name === 'permission'), false);
});

test('iOS denial preserves a recovery path and limited library is accepted', async () => {
  const denied = await harness({ os: 'ios', permission: { granted: false, canAskAgain: false } }).pickAvatarPhoto();
  assert.equal(denied.kind, 'denied');
  assert.equal(denied.canAskAgain, false);
  assert.equal((await harness({ os: 'ios', permission: { granted: false, canAskAgain: false, accessPrivileges: 'limited' } }).pickAvatarPhoto()).kind, 'picked');
});

test('unsafe, unsupported, oversize and undecodable inputs never enter crop editor', async () => {
  for (const mime of ['image/svg+xml', 'application/pdf', 'application/javascript', 'image/gif']) {
    assert.equal((await harness({ mime }).pickAvatarPhoto()).kind, 'invalid');
  }
  const heic = await harness({ mime: 'image/heic' }).pickAvatarPhoto();
  assert.equal(heic.kind, 'invalid');
  assert.match(heic.message, /export a JPEG/);
  assert.equal((await harness({ size: 5 * 1024 * 1024 + 1 }).pickAvatarPhoto()).kind, 'invalid');
  assert.equal((await harness({ width: 5000, height: 5000 }).pickAvatarPhoto()).kind, 'invalid');
  assert.equal((await harness({ decodes: false }).pickAvatarPhoto()).kind, 'invalid');
});

test('crop always re-encodes a square 512 JPEG and Settings errors are recoverable', async () => {
  const h = harness();
  assert.equal(await h.renderSquareCrop('original.png', { originX: 0, originY: 0, width: 500, height: 500 }), 'clean.jpg');
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.find(([name]) => name === 'resize')[1])), { width: 512, height: 512 });
  assert.equal(h.calls.find(([name]) => name === 'encode')[1].format, 'jpeg');
  await assert.rejects(harness({ os: 'ios' }).openAppSettings(), /unavailable/);
});
