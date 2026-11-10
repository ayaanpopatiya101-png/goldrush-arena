---
name: Clip export permission boundaries
description: Non-obvious Expo media permissions and evidence requirements for GIF export.
---

Use write-only/add-only Photos permission, not permission to read the player's library. On SDK 54, Android below API 33 still needs the legacy write permission even where the OS itself could add owned media without it.

**Why:** Expo's installed media-library implementation checks WRITE_EXTERNAL_STORAGE before saving on Android below API 33. Assuming scoped storage removes this package-level check causes saves to fail on Android 10–12.

**How to apply:** Inspect the installed package when upgrading SDKs rather than retaining this cutoff blindly. Keep native Photos evidence separate from mock permission tests, JavaScript bundle exports and browser GIF downloads. A resolved native share sheet does not verify publication or a Photos save.
