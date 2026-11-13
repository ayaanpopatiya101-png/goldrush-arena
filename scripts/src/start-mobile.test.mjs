import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createLaunchConfig } from './start-mobile.mjs';

test('a local checkout launches the actual Expo mobile app in web mode', () => {
  const source = { PATH: '/example/bin', EXPO_PUBLIC_DOMAIN: 'api.example.com' };
  const launch = createLaunchConfig(source);
  assert.deepEqual(launch.args, ['--filter', '@workspace/mobile', 'exec', 'expo', 'start', '--web', '--port', '8081']);
  assert.equal(launch.previewUrl, 'http://localhost:8081');
  assert.deepEqual(launch.env, source);
  assert.notEqual(launch.env, source);
});

test('local startup supports another port and rejects invalid ports', () => {
  const launch = createLaunchConfig({ PORT: '18081' });
  assert.equal(launch.previewUrl, 'http://localhost:18081');
  assert.deepEqual(launch.args.slice(-2), ['--port', '18081']);
  for (const PORT of ['0', '-1', '65536', '8081.5', 'invalid']) {
    assert.throws(() => createLaunchConfig({ PORT }), /PORT must/);
  }
});

test('Codespaces uses the HTTPS forwarded URL and the configured port', () => {
  const launch = createLaunchConfig({
    CODESPACES: 'true',
    CODESPACE_NAME: 'goldrush-test-123',
    GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev',
  });
  assert.equal(launch.previewUrl, 'https://goldrush-test-123-8081.app.github.dev');
  assert.equal(launch.env.EXPO_PACKAGER_PROXY_URL, launch.previewUrl);
  assert.equal(launch.env.BROWSER, 'none');
  assert.equal(launch.env.CI, '1');
  assert.deepEqual(launch.args.slice(-4), ['--host', 'localhost', '--port', '8081']);
});

test('Codespaces fails clearly rather than inventing a broken forwarding URL', () => {
  for (const env of [
    { CODESPACES: 'true' },
    { CODESPACES: 'true', CODESPACE_NAME: 'invalid/name', GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: 'app.github.dev' },
  ]) assert.throws(() => createLaunchConfig(env), /forwarding information/);
});

test('GitHub setup forwards the same port and does not replace the Replit workflow', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../../.devcontainer/devcontainer.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.forwardPorts, [8081]);
  assert.equal(config.portsAttributes['8081'].onAutoForward, 'openBrowser');
  assert.match(config.postCreateCommand, /pnpm install --frozen-lockfile/);
  assert.match(config.postStartCommand, /pnpm start/);
  const mobile = JSON.parse(fs.readFileSync(new URL('../../artifacts/mobile/package.json', import.meta.url), 'utf8'));
  assert.match(mobile.scripts.dev, /REPLIT_EXPO_DEV_DOMAIN/);
});
