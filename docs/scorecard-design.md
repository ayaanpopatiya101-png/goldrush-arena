# GoldRush Arena: tournament scorecard

## Direction

GoldRush is a four-sided air hockey survival game. Its interface should feel like a competition desk: direct, legible, and built around the court.

Use charcoal surfaces, ivory text, brass actions, and low-saturation position colors. Keep the court geometry and circular ball shapes. Panels and controls use 2px corners. Body text uses the system font; Rajdhani remains the display face.

The signature is the four-paddle court, used in the entry screen, match desk, warm-up, and flat app icon.

## What changed

- Rebuilt entry, first-run instructions, home, and navigation.
- Added an offline warm-up using the actual game engine, isolated from progression.
- Kept saved-player storage keys, inventory identifiers, purchases, and game modes.
- Replaced emoji presentation, including legacy saved avatars, with line icons.
- Removed glass navigation, ambient orbs, idle pulses, shimmering surfaces, and rendered hue gradients.
- Added static loading placeholders without looping shimmer.
- Kept privacy and terms accessible before creating a local player.
- Fixed production API embedding and consolidated the store endpoint.
- Fixed paused paddle input, paused countdowns, and the duel clock advancing while paused.
- Cancelled delayed game-over callbacks when a court unmounts.
- Fixed legacy Bronze rank lookup and normalized saved ranks from earned XP.
- Replaced invented global standings with the player's actual record and rank ladder.

## QA

Run `node --test scripts/arena-contract.test.cjs` and `pnpm typecheck`. Build the iPhone Release scheme, then inspect the app at phone width. Test entry, legal information, warm-up, pause/resume, restart, and returning to the unchanged player record. Verify the regular lobby and the remaining tabs separately.

Do not claim a measured tenfold improvement. Do not fabricate online players, leaderboard entries, testimonials, or purchase availability. Live service and Apple purchase QA are still required before launch.

## Reference credits

Design review adapted from **Unslop**, created by Damir Sokolovsky, licensed CC BY 4.0: https://github.com/heydamir/unslop. This project applies its review method with stricter square corners and the user's visual exclusions.

Development sequencing informed by **Claude Code Game Studios**, MIT licensed: https://github.com/Donchitos/Claude-Code-Game-Studios. This is a workflow reference, not an installed engine or an imported set of autonomous agents.
