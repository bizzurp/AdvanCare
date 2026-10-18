# Implementation Brief

Build the AdvanCare app UI using /Users/mclein/Documents/Developer/Personal_Projects/AdvanCare/design-handoff as the visual reference folder. If it has not been moved there yet, the same package is available at /Users/mclein/Documents/Codex/2026-10-15/referenced-chatgpt-conversation-this-is-an/outputs/AdvanCare-design-handoff. Use the complete package. First read START-HERE.md, IMPLEMENTATION-NOTES.md, COMPONENTS.md, FLOWS-AND-MOTION.md, and design-system/tokens.json. Inspect the PNG screen renders and use spec/native-node-tree.json for exact text, spacing, layout, and component details. The local .fig file preserves the editable Figma source.

The active project is /Users/mclein/Documents/Developer/Personal_Projects/AdvanCare. Read its current .brain/PROJECT_CONTEXT.md, .brain/ARCHITECTURE.md, .brain/DECISIONS.md, and existing source before editing. Reuse the project's framework if one exists. The nested AdvanCare folder currently contains product/architecture documentation and an Obsidian vault; do not replace it or scaffold over it. If there is no app implementation, choose the smallest suitable mobile-first structure consistent with current requirements and clearly state the choice.

Implement real reusable UI components and routes for all 29 designed screens. Use the provided official transparent AdvanCare_Logo.png, Inter typography, refined teal/green tokens, consistent Solar Linear icons, 24px page gutters, 52px actions, and accessible 44px minimum touch targets. Preserve the screen hierarchy and visual detail; avoid generic template cards or invented visual styles.

Add the three onboarding screens before sign-in: Next and swipes slide left in 320ms with ease-out, Back slides right, pager dots navigate directly, Skip and Sign in go to authentication, and the last CTA opens sign-in. Honor reduced motion, support keyboard/focus behavior and accessible labels, and persist onboarding completion appropriately.

Complete the remaining product screens from the current specification using these same components and layouts: phone OTP sign-in, registration, assisted/dependent enrollment, membership/subsidy verification, payment selection/status, service request tracking/details, caregiver and transport updates, account preferences, and loading/empty/error/offline states. Do not assume these extra screens already exist in the Figma export. Use IMPLEMENTATION-NOTES.md to distinguish designed views from extensions.

Resolve the documented business-rule differences using current approved project requirements: Silver/Gold/Platinum and 50/50 subsidy rules take precedence over the screenshot's Basic/Family/Premium sample prices unless the user explicitly directs otherwise. Keep business content data-driven. Use the Philippine peso symbol ₱ for local currency.

Keep mock data clearly separated from real service calls. Build the UI and interaction states; integrate existing services where available and document any missing contracts. Do not claim that a consultation, prescription, payment, or request has been submitted if only local demonstration behavior exists. Do not invent clinical triage logic.

Verify the app at narrow mobile sizes and larger text, test onboarding, routing, form validation, fixed action safe areas, scrolling, and all five service request journeys. Compare rendered UI against the exported screens and fix meaningful visual mismatches. Continue until the UI and remaining required states are implemented and reviewable. Report completed work, verification, and any specific remaining backend dependencies.

## Additional required modules

Implement these modules as part of the app, extending the supplied AdvanCare design system for screens not yet represented in the 29-screen design package:

- **RHU services:** Support services provided by MDs (physicians), DMDs (dentists), nurses, and midwives. Provide clear provider/service selection and the relevant appointment or service-request journey.
- **Transport:** Support both public and private vehicles, with a clear choice of transport type within the booking journey.
- **Triage:** Support assessment and routing workflows involving RHUs, district hospitals, CVMC, and private clinics/hospitals. Use approved clinical requirements and clinician review; do not invent clinical decision rules or treat non-emergency transport as emergency dispatch.
- **TeleHealth:** Support consultations with physicians who are general practitioners, including provider selection, scheduling, and consultation status.

Integrate these modules into the existing Services navigation, relevant profiles, request status views, and reports. Reuse shared components, terminology, accessibility patterns, and visual tokens. Treat any missing clinical rules, provider data, transport contracts, or service integrations as explicit dependencies rather than fabricated working behavior.

