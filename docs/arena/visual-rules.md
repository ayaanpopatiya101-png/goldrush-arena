# Visual rules

## Enforceable direction
- Flat graphite surfaces; off-white body text; ochre marks the primary action.
- Barlow Condensed 600/700 for scoreboard/display; Source Sans 3 for body. Native font loading must resolve, fail to a usable system font, or provide retry rather than hang.
- Panel/control radius 0 to 4. Circular balls, life indicators and necessary game geometry are not panels.
- Preserve real cosmetic identity with restrained colors, not decorative multicolor UI.
- Human seat and local bot roles must be readable without color alone.
- Use native vector icons or bespoke existing artwork. Persist legacy avatar strings but map their presentation to icons.
- Keep touch controls labeled and tappable; use 44-point targets for primary controls, allow text wrapping and respect safe areas.
- No indefinite decorative loops. Respect the OS reduced-motion setting; gameplay motion remains essential and the home demo must be pausable/opt-in when reduced motion is enabled.
- Fetched content needs honest skeleton/loading, empty/error and retry states. Do not show a success state merely because a checkout/share window opened.

## Avoidance list
No decorative gradients, blue side icons, pure-white page backgrounds, rainbow schemes, ubiquitous shadows, three-feature-card rows, UI emojis, liquid glass, em dashes, Inter/Geist/Space Grotesk, arbitrary colored stripes, fake testimonials, bento layouts, fake terminal windows, “It's not X, it's Y” copy, checkmark bullets, three pricing tiers, soft panel corners, purple-and-black schemes, radial orbs, dot grids, sparkle icons, animated arrows, indiscriminate hover effects, neon or basic pastels.

The negative phrases “no real product demos”, “no skeleton loaders”, “no TOS” and “no privacy policy” name omissions to avoid. Include functional product previews, suitable skeletons, Terms and Privacy.

## Audit procedure
Adapted from [unslop, Damir Sokolovsky](https://github.com/heydamir/unslop), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes: mobile game scope, explicit avoidance rules and evidence gates.

Inspect spacing, color, icons, copy, typography, layout, detail, visuals and motion in that order. Do not count a global palette substitution as proof of a successful screen: inspect onboarding, tabs, lobby, HUD, results, shop, both passes, progression, inventory, events, clips, settings, profile and policies. Use phone and wider web viewports. Document what was inspected, not what was assumed.
