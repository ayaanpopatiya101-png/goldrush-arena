import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const directory = await mkdtemp(path.join(tmpdir(), "goldrush-ladder-"));
try {
  const outfile = path.join(directory, "leaderboard.test.cjs");
  const entry = process.argv.includes("--api") ? "tests/leaderboard-api.test.ts" : "tests/leaderboard.test.ts";
  await build({ entryPoints: [entry], outfile, bundle: true, platform: "node", format: "cjs", external: ["pg-native"] });
  const result = spawnSync(process.execPath, ["--test", outfile], { stdio: "inherit", env: { ...process.env, NODE_ENV: "production" } });
  process.exitCode = result.status ?? 1;
} finally { await rm(directory, { recursive: true, force: true }); }
