import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

/** Local/Codespaces entry point; the existing Replit workflow stays unchanged. */
export function createLaunchConfig(sourceEnv) {
  const env = { ...sourceEnv };
  const args = ['--filter', '@workspace/mobile', 'exec', 'expo', 'start', '--web'];
  const port = env.CODESPACES === 'true' ? 8081 : Number(env.PORT || 8081);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a whole number between 1 and 65535.');
  }
  let previewUrl = `http://localhost:${port}`;
  if (env.CODESPACES === 'true') {
    const name = env.CODESPACE_NAME;
    const domain = env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
    if (!name || !/^[a-z0-9-]+$/i.test(name) || !domain || !/^[a-z0-9.-]+$/i.test(domain)) {
      throw new Error('GitHub Codespaces forwarding information is missing or invalid. Restart the Codespace and try again.');
    }
    previewUrl = `https://${name}-8081.${domain}`;
    env.EXPO_PACKAGER_PROXY_URL = previewUrl;
    env.BROWSER = 'none'; // The forwarded-port setting opens the browser instead.
    env.CI = '1'; // Never wait on an invisible interactive port-selection prompt.
    args.push('--host', 'localhost');
  }
  args.push('--port', String(port));
  return { args, env, previewUrl };
}

function main() {
  let launch;
  try {
    launch = createLaunchConfig(process.env);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes('--dry-run')) {
    // Deliberately omit the environment: it can contain unrelated credentials.
    console.log(JSON.stringify({ command: 'pnpm', args: launch.args, previewUrl: launch.previewUrl }, null, 2));
    return;
  }
  console.log(launch.env.CODESPACES === 'true'
    ? `Starting GoldRush Arena. Open the forwarded port 8081: ${launch.previewUrl}`
    : `Starting GoldRush Arena. Once bundling finishes, open ${launch.previewUrl}`);
  const child = spawn('pnpm', launch.args, {
    cwd: workspaceRoot,
    env: launch.env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.once('error', error => {
    console.error(`Could not start GoldRush Arena: ${error.message}`);
    process.exitCode = 1;
  });
  child.once('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => child.kill(signal));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
