# Clip export verification

## Verified in the workspace

- `pnpm --filter @workspace/mobile test:clips`: 9 focused checks pass.
  Independent `omggif` decoding checks every quantized pixel across LZW
  dictionary-width changes and resets. Tests also cover missing/corrupt frames,
  invalid dimensions/timing, concurrent local saves, reload, persisted trim,
  deletion, bounded storage, read failures, reward deduplication/daily limits,
  unsupported web sharing, cancellation, mocked native permission denial,
  limited access, full storage, and late capture completion after cancellation.
- `pnpm --filter @workspace/mobile test:reliability`: 55 checks pass.
- `pnpm --filter @workspace/mobile typecheck`: passes.
- Sequential one-worker iOS and Android `expo export` runs both pass.
  These confirm JavaScript/Hermes bundling, **not** signed native builds.
- Expo configuration introspection confirms an iOS Photos-add description,
  no Android media read/location permissions, and the legacy Android write
  permission required by SDK 54 below API 33.

## Real browser recording and export

The focused browser check used the regular Play → Blitz → live match flow,
not a seeded frame fixture. Recording became ready, manual capture worked,
and the match finished naturally. The recorded clip opened from results,
was trimmed from 32 to 30 frames, saved to My Clips, and reopened after a
hard reload.

The exported file was 79,326 bytes, `GIF89a`, 180×180, with 30 full-frame
images, 30 distinct decoded pixel-index hashes, 33-centisecond frame delays,
and the GIF trailer. This independently confirms animation in the exported
file. The viewer rendered the court on reopen; canvas sampling of the browser
image alone was not used as proof of animation.

Unsupported file sharing fell back to GIF download with explicit Photos
instructions. Repeated exports granted no web progression rewards: the
account changed only by the completed match's 10 coins and 50 XP.

An earlier browser attempt revealed that normal server-backed matches had no
recording UI. That route now uses the same recording pipeline as offline
matches; the continuation verified this previously blocked flow. One earlier
reload briefly returned HTTP 502; the final cache-disabled library reload
succeeded.

## Native Photos verification still required

No physical device or installed signed build was available. No actual native
Photos-library save, animation in iOS Photos/Android galleries, or OS permission
dialog is claimed as verified.

On signed iOS and Android builds, verify:

1. Record an actual match; trim, save/reopen from My Clips, then Save to Photos.
2. Confirm the GIF exists and animates in Photos/the device gallery before
   considering the save successful.
3. Deny permission, retry, deny permanently and follow Open device Settings.
   Check iOS limited access/add-only behavior without broadening to read access.
4. Check Android API 29–32 legacy-write permission and API 33+ no-read-permission
   saving separately.
5. Test low/full storage and OS save failures; no success message should appear.
6. Cancel native sharing and rapidly repeat save/share taps; ensure only the
   existing share-sheet bonus can be granted once per source, within the daily
   cap. Returning from a share sheet does not prove a social post or Photos save.

Exports are animated GIFs, not MP4. Captions/stickers remain library
decorations and are explicitly not included in the GIF. Clips stay on this
device; no clip upload or external publishing integration was added.
