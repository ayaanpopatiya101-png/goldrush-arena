# GoldRush Arena: current game brief

## Identity
Four-seat, last-player-standing paddle sport. Competitive, tactile, quick to understand. Sports scoreboards and physical arcade controls supply the visual language. The real ball/paddle simulation is the product demonstration.

## Loop and boundaries
Select a mode, configure a match in the lobby, deflect balls, survive elimination, receive the existing XP/coin result, then equip earned cosmetics or claim progression rewards. The first five games retain the existing training difficulty. Keep every variant and rank gate, Gauntlet, quests, passes, existing prices and multiplier/reward values.

Bank lives remain inventory: select 0 to the bank/cap in the lobby; Champion+ cap is 2, other ranks cap is 3. Consume once at actual match start, never for the home practice preview.

## What is actually multiplayer?
The API can coordinate party members, mode launches and matchmaking seats. GameArena initializes AI opponents and simulates physics locally. No authoritative network match loop, shared inputs, shared collision state or four-human reconciliation exists. Server-supplied player names do not make the paddles human-controlled. Label arena opponents as bots, and distinguish party membership from arena participation.

An authoritative multiplayer engine, authenticated player identities and per-player YouTube OAuth/upload are outside this upgrade. They are not implied by a successful party join or a connected publisher integration.

## Product decisions
Home emphasizes the real practice arena, selected mode, party state and one primary Play control. Practice grants nothing. The scoreboard identifies seat positions and local human/bot roles. Skin previews use the same catalog appearance as gameplay. Broken placeholder purchases must not deduct coins or claim an equip succeeded.

Hidden Relics/Forge structures, old avatar strings, owned items and profile storage keys survive presentation changes. Do not use a restyle to reset migration-sensitive data.

## Research applied
- [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios): use a compact brief, architecture boundaries, evidence and release gates. It is an automation/workflow repository, not a game engine. No Unity/Godot/Unreal hooks installed.
- [unslop by Damir Sokolovsky](https://github.com/heydamir/unslop), CC BY 4.0: adapted the audit-first direction and passes over spacing, color, icons, copy, typography, layout, detail, visuals and motion. This is a product-specific adaptation, not a verbatim skill installation.
- [Brawl Stars UI gallery](https://interfaceingame.com/games/brawl-stars/): learn from focus on Play and real product.
- [Pass Royale](https://support.supercell.com/clash-royale/en/articles/pass-royale-11.html): distinguish free/premium and earned/claimable/locked rewards.
- Rocket League Sideswipe: gameplay-focused competitive sports hierarchy.

No reference artwork or branded layout is copied. See [third-party notices](third-party-notices.md).

## Scope reconciliation
This upgrade includes countdown cancellation, overlapping the intent of the earlier suggested lobby-leave fix; do not implement it a second time. The earlier suggestions were not silently accepted as additional work. Match HITS reporting/restart persistence, party reactions/summary, party restart persistence, ceremony replay/history/haptics, separate sound volumes and expanded transitions remain separate suggestions. No extra READY pulse was added: the legible countdown and motion restraint take priority here.
