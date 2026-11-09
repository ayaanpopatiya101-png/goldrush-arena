---
name: Avatar privacy boundary
description: Why photo ownership uses existing guest identities and publication remains separate from local profile appearance.
---

Photo upload must remain optional and private by default. Publishing is a separate, explicit choice; local emblem/frame saves must not implicitly publish a photo.

**Why:** Players already have device-local saves and guest-session ownership. Replacing these with a new account system would disrupt returning players, while sharing private file paths or treating display names as ownership would expose photos.

**How to apply:** Use authenticated guest ownership for cloud photos, preserve offline progression, and only project explicitly published sanitized images into opponent data. Never reuse a deleted profile's username-keyed credential/cache. Complete authenticated remote retirement before discarding deletion authority; offline deletion must remain retryable.

Enforce byte limits before storage writes and clean abandoned uploads independently of guest activity.

**Why:** Declared-size checks plus validation at commit do not limit a signed PUT; a guest can skip commit. Cleanup triggered only by the same guest leaves abandoned files indefinitely.

Photo upload starts in Profile after player creation, not during onboarding.

**Why:** A cloud photo saved against an unfinished onboarding name can be abandoned
without any saved player retaining its deletion credential.

Cleanup records must survive failed commits and failed storage deletions.
Register outputs before writing, coordinate cleanup with the owner lock, and
never discard retry authority just because an avatar is no longer selected.
