---
name: Toolchain security compatibility
description: Compatibility boundaries when patching Expo build tools and Vite optional peers.
---

Keep Vite's optional build-tool peers aligned across workspace packages and
replacement aliases; do not cast plugin types to work around duplicate identities.

**Why:** A security dependency refresh produced two copies of the same Vite
version with different optional tsx peers. TypeScript treated their plugin types
as incompatible even though their Vite versions matched. Deduplication alone
could not unify an exact catalog pin with a newer transitive peer.

**How to apply:** When dependency changes trigger Vite plugin type incompatibility,
inspect the full peer-context paths in the diagnostic and align the conflicting
tool version, including aliases, before changing application configuration.

Use a CommonJS-compatible patched UUID line for legacy Expo Node tooling unless
the parent itself migrates; do not apply an ESM-only UUID major indiscriminately.

**Why:** Legacy ngrok and SDK-bound Xcode consumers require UUID synchronously.
Removing an advisory by forcing the newest major can break those tool paths.

**How to apply:** Scope overrides to the Node tooling parents and exercise their
real ID-generation APIs, not just the package's version number. Keep this
separate from native application dependency decisions.
