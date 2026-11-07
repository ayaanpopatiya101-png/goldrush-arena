# Dependency security verification

Verified on 2026-11-07. All 32 requested advisory/package-version pairs are
resolved. Both `pnpm audit --json` and the workspace dependency scanner report
**zero findings for all 15 affected package names**.

## Resolved versions

| Package | Previously affected versions | Locked versions |
| --- | --- | --- |
| @babel/core | 7.29.0 | 7.29.13 |
| body-parser | 2.2.2 | 2.4.0 |
| brace-expansion | 1.1.14, 2.1.1, 5.0.6 | 1.1.21, 2.1.7, 5.0.12 |
| esbuild | 0.27.3 | 0.28.2 |
| fast-uri | 3.1.2 | 3.1.9 |
| js-yaml | 3.14.2, 4.1.1 | 3.15.2, 4.3.2 |
| linkify-it | 5.0.0 | 5.0.2 |
| markdown-it | 14.1.1 | 14.3.3 |
| postcss | 8.4.49 | 8.5.32 |
| qs | 6.15.1 | 6.17.1 |
| shell-quote | 1.8.4 | 1.12.0 |
| tar | 7.5.15 | 7.5.22 |
| undici | 6.26.0 | 6.29.1 |
| uuid | 3.4.0, 7.0.3 | 11.1.1 |
| vite | 7.3.3 | 7.3.7 |

Direct toolchain updates remain within Expo SDK 54, Express 5, Babel 7, and
Vite 7. esbuild moves from 0.27 to patched 0.28. The lockfile also refreshes
compatible transitive releases.

### Compatibility constraints

- Expo Metro pins an older PostCSS minor. Override that edge to a patched
  PostCSS 8 release rather than migrate the mobile SDK.
- Expo SDK 54's Xcode tooling and the latest `@expo/ngrok` wrapper retain
  legacy UUID requirements. Scoped overrides select UUID 11, the patched
  CommonJS-compatible line. Their existing `v4()` callers are tested; UUID is
  not added to the application's native runtime.
- Other security overrides preserve the dependency's major version, including
  separate js-yaml 3 and 4 and brace-expansion 1, 2, and 5 lines.
- Align tsx's catalog entry and the legacy esbuild-loader replacement. Different
  optional tsx peers otherwise produce incompatible Vite plugin type identities.

## Verification

- `pnpm install --frozen-lockfile` — passed.
- `pnpm run typecheck` — passed for all workspace libraries and leaf packages.
- `pnpm run test:dependencies` — 18 passed, covering every affected locked
  package, Xcode UUID generation, ngrok's CommonJS import and UUID API, and
  Vite's peer context.
- `pnpm run test:launcher` — 4 passed.
- `pnpm --filter @workspace/mobile test:reliability` — 39 passed.
- API server, GoldRush shop, and mockup sandbox production builds — passed.
- Expo web, iOS, and Android exports — passed sequentially with one Metro worker.
  Export logs and outputs are in ignored
  `generated-artifacts/dependency-verification/`. These are compilation checks,
  not signed builds or physical-device test results.
- All four managed workflows restarted successfully.
- `/api/healthz` returned `{"status":"ok"}` through the shared proxy.
- Mobile onboarding and shop landing pages rendered in browser screenshots
  without runtime errors.

### Existing unrelated test failure

`pnpm --filter @workspace/goldrush-shop test`: 9 passed, 1 failed.
`coin catalog matches native source IDs, prices, colors and pass restrictions`
compares Classic skin color `#C99A2E` in the shared shop catalog against
`#F36B3F` in the mobile source. The test and both source files are identical to
the starting Git revision, where those conflicting values are already present.
No catalog, pricing, theme, or test expectation was changed in this dependency task.

## Remaining audit findings outside this scope

This is not a claim that the entire repository is vulnerability-free. The final
pnpm audit reports 23 other findings (11 critical, 5 high, 6 moderate, 1 low).
The workspace scanner reports 23 (11 critical, 5 high, 7 moderate), reflecting
different severity classifications. These concern Orval, image-size, Zod,
decode-uri-component, fast-copy, postcss-selector-parser, deepmerge, glob,
and minimatch, not the requested advisory/package pairs. They were not hidden,
ignored, or suppressed. The pnpm audit output is retained under the ignored
verification directory.
