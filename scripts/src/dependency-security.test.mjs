import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const lock = readFileSync(new URL("pnpm-lock.yaml", root), "utf8");
// Inspect package records, not stale directories left in node_modules by pnpm.
const packages = lock.split("\npackages:\n")[1]?.split("\nsnapshots:\n")[0];
assert.ok(packages, "Expected a pnpm v9 lockfile packages section");
const versions = new Map();
for (const match of packages.matchAll(/^  '?([^'\n]+)@(\d+\.\d+\.\d+)[':]?[:]?\s*$/gm)) {
  const [, name, version] = match;
  versions.set(name, [...(versions.get(name) || []), version]);
}

// Floors cover all requested advisories, plus newer fixes in the same lines.
const floors = {
  "@babel/core": { 7: "7.29.6" },
  "body-parser": { 2: "2.4.0" },
  "brace-expansion": { 1: "1.1.21", 2: "2.1.7", 5: "5.0.12" },
  esbuild: { 0: "0.28.1" },
  "fast-uri": { 3: "3.1.9" },
  "js-yaml": { 3: "3.15.2", 4: "4.3.2" },
  "linkify-it": { 5: "5.0.2" },
  "markdown-it": { 14: "14.3.3" },
  postcss: { 8: "8.5.23" },
  qs: { 6: "6.16.1" },
  "shell-quote": { 1: "1.11.0" },
  tar: { 7: "7.5.21" },
  undici: { 6: "6.29.1" },
  uuid: { 11: "11.1.1" },
  vite: { 7: "7.3.7" },
};

function atLeast(actual, minimum) {
  const a = actual.split(".").map(Number);
  const b = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return true;
}

for (const [name, majors] of Object.entries(floors)) {
  test(`${name}: every locked version meets its security floor`, () => {
    const installed = versions.get(name);
    assert.ok(installed?.length, `No ${name} records found; review this guard if removed`);
    for (const version of installed) {
      const minimum = majors[Number(version.split(".")[0])];
      assert.ok(minimum, `Review security floor for new major: ${name}@${version}`);
      assert.ok(atLeast(version, minimum), `${name}@${version} must be >=${minimum}`);
    }
  });
}

const mobileRequire = createRequire(new URL("artifacts/mobile/package.json", root));
const cliRequire = createRequire(mobileRequire.resolve("@expo/cli/package.json"));
const pluginsRequire = createRequire(cliRequire.resolve("@expo/config-plugins/package.json"));

test("Xcode tooling still generates project IDs with the CommonJS uuid override", () => {
  const xcode = pluginsRequire("xcode");
  const project = xcode.project("compatibility-test.pbxproj");
  project.hash = { project: { objects: {} } };
  const first = project.generateUuid();
  assert.match(first, /^[A-F0-9]{24}$/);
  assert.notEqual(project.generateUuid(), first);
});

test("ngrok loads with the patched CommonJS uuid v4 API without starting a tunnel", () => {
  const ngrok = mobileRequire("@expo/ngrok");
  assert.equal(typeof ngrok.connect, "function");
  const ngrokRequire = createRequire(mobileRequire.resolve("@expo/ngrok/package.json"));
  const { v4, validate } = ngrokRequire("uuid");
  assert.ok(validate(v4()));
});

test("Vite resolves a single peer context for both web apps", () => {
  const contexts = [...lock.matchAll(/^  (vite@\S+):$/gm)].map((m) => m[1]);
  const snapshots = contexts.filter((context) => context.includes("("));
  assert.equal(snapshots.length, 1, "Align optional peers instead of casting plugin types");
});
