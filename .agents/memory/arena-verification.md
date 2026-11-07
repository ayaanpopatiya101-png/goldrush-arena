---
name: Arena verification boundaries
description: Build resource isolation and the distinction between engineering checks and release evidence.
---

Run mobile platform exports sequentially with one Metro worker, separate from the browser walkthrough when workspace memory is constrained.

**Why:** Concurrent three-platform export and the browser tooling coincided with a stopped preview and HTTP 502 before the player journey could start. An interrupted export is not evidence of a successful build.

**How to apply:** Finish the browser pass before platform exports, or finish exports before launching the browser. Preserve logs and distinguish successful JS/Hermes export from an installed, signed native test. Never replace missing real-device or human observations with an automated-browser success.
