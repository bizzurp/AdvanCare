# AdvanCare design handoff

Start with `IMPLEMENTATION-BRIEF.md`. This package contains the completed AdvanCare visual direction, 29 screen designs, shared components, official updated transparent logo, and implementation guidance.

## Where to look

- `AdvanCare-editable-design.fig` — complete local Figma source, including editable frames, components, variables, text, and prototype links. Import into Figma to edit.
- `screens/png/` — exact screen renders for visual implementation.
- `screens/svg/` — vector exports with text retained where supported; useful for inspecting shapes. Build real UI controls rather than placing these as the app.
- `spec/native-node-tree.json` — native Figma layout tree, text, colors, sizing, component properties, and prototype reactions.
- `spec/manifest.json` — screen IDs, dimensions, and flow starting points.
- `design-system/tokens.json` and `tokens.css` — portable design tokens.
- `COMPONENTS.md` — reusable component rules.
- `FLOWS-AND-MOTION.md` — routing and onboarding animation behavior.
- `IMPLEMENTATION-NOTES.md` — guidance for remaining screens and known product differences.
- `assets/` — official updated PNG and 32 Solar Linear SVGs with attribution.
- `reference/` — design rationale and snapshot of existing project requirements.
- `source/figma-construction-reference.js` — native construction reference for exact composition. It contains a file-specific maintenance entry point; read it for implementation details, do not execute it against another Figma file.

## Canonical Figma

[Advancare design](https://www.figma.com/design/LTCdUXgSlGR87DwJm6QLiY/Advancare?node-id=2-2647)

Page: **AdvanCare · Refined care / 16 core views**. The source image called “15 screens” contains 16 baseline views. The design includes all 16, 10 supporting states, and 3 onboarding screens.

## Review status

Native Figma audit: 29 editable screens, 49 component masters, 5 variant families, 320 instances, 124 prototype connections, zero invalid destinations. All three onboarding layouts and the core overview were visually inspected. Interactive playback was interrupted during export preparation; test animation in the built application.

Text contrast measured: primary on paper 11.13:1; secondary on white 5.61:1; white on teal 6.43:1. These measurements do not replace app accessibility testing.

## Product authority

These designs preserve the original screenshot's content. The current project requirements describe newer Silver/Gold/Platinum memberships, SMS OTP, assisted enrollment, offline use, and role-specific screens. Read `IMPLEMENTATION-NOTES.md` before implementing pricing or account flows. Use the supplied visual system for those remaining screens, while treating current approved product requirements as the authority for business rules.
