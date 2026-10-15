# AdvanCare — Refined care

Target file: [Advancare](https://www.figma.com/design/LTCdUXgSlGR87DwJm6QLiY/Advancare).

## Direction

Keep AdvanCare's teal and green identity, community-care language, Philippine peso pricing, and existing service journeys. Use deep teal for primary actions, warm white for reading surfaces, soft green for supporting areas, and restrained olive, blue, and amber for data and status. Use Inter, persistent field labels, generous touch areas, and a consistent Solar Linear icon family.

The reference image contains **16 distinct views**, despite being described as 15 screens. Preserve all 16:

| Baseline view | Redesigned frame |
|---|---|
| Welcome | Welcome |
| Login | Sign in |
| Home | Home |
| Subscription Plans | Plans |
| Client Profile | Profile |
| Request a Service | Services |
| Tele-Consultation | Tele-consultation |
| Request Medical Prescription | Prescription |
| Non-emergency Transport | Transport |
| Request Home-based Caregiver | Home caregiver |
| Request CVMC Institutional Caregiver | CVMC caregiver |
| Reports | Reports |
| Service Report (Table) | Service records |
| Service Utilization (Graph) | Service trends |
| Dashboard | Dashboard |
| AI Assistant | Assistant |

Supporting prototype views cover prescription review, family details, the More destination, submission confirmation, account support, editing a profile or visit, doctor selection, attachment options, and export options.

## Research applied

- [UIZZE](https://uizze.com/): cohesive screens and journeys; use references to establish a consistent product identity.
- [Taste Skill](https://www.tasteskill.dev/): audit before redesign, preserve product behavior, and establish explicit typography, spacing, color, and motion rules.
- [Impeccable](https://impeccable.style/slop/): avoid equal visual emphasis, unnecessary nested cards, vague actions, and decorative effects that weaken hierarchy.
- [Details](https://www.details.so/inspo): refine individual navigation, button, row, and transition details; adapt ideas to the product instead of copying a whole page.
- [Design Spells](https://designspells.com/spells/smooth-sheet-transitions-in-sudoku-a-day): use subtle transitions to maintain continuity. Healthcare task completion takes priority over novelty.
- [Solar Icons](https://solar-icons.vercel.app/): use one editable icon family, consistent sizing and strokes, and visible labels for navigation.

## Editable system

The local builder creates native Figma text, vectors, auto-layout containers, component instances, color and spacing variables, and type styles. The logo remains the user-supplied raster asset inside a reusable component. Shared component families include buttons, fields, navigation items, status badges, choice rows, service rows, status bars, and Solar icons. It creates a separate page and leaves the original page intact.

## Handoff details

- Phone frame: 390 × 844. Page gutters: 24. Body text: 16/24. Main actions: 52 high. Icon controls: 44 × 44. Navigation safe area: 84 high.
- Maintain visible text for statuses and a check mark for selected options. Do not rely on color alone.
- Use native authentication, camera/file picker, exports, keyboard handling, accessible announcements, and text scaling in the built application. The prototype does not submit real healthcare requests.
- The updated supplied AdvanCare_Logo.png is used in shared full-logo and emblem components, preserving its original transparency.
- The reference report includes an April 18 record under an April 20–26 filter. Treat that as a sample-data discrepancy. Dashboard totals and percentages retain the baseline values; trend bars are illustrative editable data.
- Final verification must include the rendered Figma screens, navigation links, scrolling, and text contrast. Source syntax checks alone do not establish that the Figma design is complete.

## Local builder

The `advancare-figma-builder` folder contains the local Figma development plugin. It requires no packages and has no network access. Figma desktop can import its `manifest.json` through **Plugins → Development → Import plugin from manifest**.

Icon attribution: Solar Icons by [480 Design](https://www.figma.com/@480design), CC BY 4.0. SVG sources distributed by [Iconify](https://github.com/iconify/icon-sets/tree/master/json).

## Animated onboarding

Three additional editable phone frames precede sign-in:

1. Connected care — family support and the official logo.
2. Care your way — doctor consultations, transport, and caregivers.
3. A clearer picture — records, reports, and the care assistant.

Next uses a 320 ms horizontal PUSH transition with ease-out timing; Back slides in the opposite direction. Skip and the sign-in shortcut lead directly to sign-in. Page indicators allow direct navigation, and the artwork supports dragging forward. Native implementation should respect the operating system’s reduced-motion setting.
