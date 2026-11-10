---
name: Gameplay pacing and demo intent
description: User-defined normal-mode ball timing and separation of the home demonstration from tutorials.
---

Normal mode starts with one ball, adds the second after seven seconds, then adds
each subsequent ball at ten-second intervals.

**Why:** The user said the game gets too fast and explicitly clarified that the
seven- and ten-second values mean time between new balls, not serve delays.

**How to apply:** Preserve these pacing requirements across local and online
normal-mode implementations. Do not apply them automatically to special modes.

The Home arena is intended to be a self-playing bot-versus-bot demonstration;
tutorials are where the player learns through direct control.

**Why:** The user explicitly requested a watch-only live demonstration instead
of requiring the visitor to play “Try a rally.”

**How to apply:** Keep demonstration logic separate from playable instruction,
progression, paid resources and claims about real human activity.

Browser gesture containment belongs only to an active, playable court. Keep normal
page scrolling and accessible zoom outside it; a watch-only demo must not capture
player gestures.

**Why:** The user wants paddle dragging to stop phone-browser scrolling without
disabling normal browsing elsewhere in the app.

**How to apply:** Preserve this scope when changing court controls or adding
playable surfaces, including tutorials and warm-up. Cancellation and re-entry
must work without refreshing the page.
