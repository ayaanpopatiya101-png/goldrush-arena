---
name: Arena verification boundaries
description: Build resource isolation and the distinction between engineering checks and release evidence.
---

Run mobile platform exports sequentially with one Metro worker, separate from the browser walkthrough when workspace memory is constrained.

**Why:** Concurrent three-platform export and the browser tooling coincided with a stopped preview and HTTP 502 before the player journey could start. An interrupted export is not evidence of a successful build.

**How to apply:** Finish the browser pass before platform exports, or finish exports before launching the browser. Preserve logs and distinguish successful JS/Hermes export from an installed, signed native test. Never replace missing real-device or human observations with an automated-browser success.

Validate Codespaces base-image availability with a registry manifest GET that accepts OCI indexes, not just a HEAD request.

**Why:** The registry returned 404 to HEAD requests advertising only a Docker manifest, even for listed, available tags. A GET accepting OCI indexes returned the actual multi-platform manifest successfully.

**How to apply:** Confirm the image exists when updating the external launch configuration. Separate launcher/configuration checks from an actual Codespaces boot; creating a billed cloud workspace requires the user's choice.
