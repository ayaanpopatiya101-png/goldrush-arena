import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const temporary = await mkdtemp(path.join(tmpdir(), 'goldrush-store-'));
try {
  const output = path.join(temporary, 'store.test.cjs');
  const fixture = path.resolve('tests/store-provider-fixture.ts');
  await build({
    entryPoints: ['tests/store-api.test.ts'], outfile: output, bundle: true, platform: 'node', format: 'cjs',
    external: ['pg-native'], logLevel: 'warning',
    plugins: [{ name: 'non-charging-provider-fixtures', setup(builder) {
      builder.onResolve({ filter: /stripeClient\.js$|^@replit\/connectors-sdk$/ }, () => ({ path: fixture }));
      builder.onResolve({ filter: /\/logger\.js$/ }, args =>
        args.importer.includes('/api-server/src/') ? { path: fixture } : undefined);
    } }],
  });
  const result = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test' } });
  process.exitCode = result.status ?? 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
