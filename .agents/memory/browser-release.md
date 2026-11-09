---
name: Browser and native releases
description: Why the browser release shares real game code and owns the ordinary root path.
---

Publish the real browser game at the main address, retaining the mobile app and
its Expo/native previews separately.

**Why:** The user explicitly approved a browser version so visiting their custom
domain opens the playable game, rather than the native Expo installation page.
Sharing the existing web-compatible game avoids losing features or diverging
physics, rewards and entitlements in a rushed rewrite.

**How to apply:** Preserve native routing and builds when changing browser hosting.
Browser requests must resolve API/websocket URLs from their current origin.
A custom domain already connected in deployment metadata does not mean the new
browser release is live: the owner must publish the update.
