# advanCARE: Changelog (Operational Brain)

Newest first. Entries from 2026-10-15 to 2026-10-16 (backend core, staff console phases A/B, sign-in, native apps, P1–P3, multi-provider) are in [archive/CHANGELOG_ARCHIVE.md](archive/CHANGELOG_ARCHIVE.md).

## [2026-11-16] - Resolve merge-conflict markers from `8eb7e1f`
- Resolved all 67 committed `<<<<<<<` / `=======` / `>>>>>>>` conflict blocks across 31 tracked files (`backend/`, `frontend/`, `admin/`, `AdvanCare_Vault/`, `tmp/pdfs/brochure/build_brochure.py`), keeping the `72d5a43` parent changes (2026-10-28 discounted pharmacy & supplies service, simplified staff next-step actions, split per-IP/per-email sign-in rate limiters; 2026-10-29 password reveal toggle; 2026-10-30 provider-neutral design handoff and font path updates).
- Verified typecheck, build, and test suites across `backend/`, `frontend/`, and `admin/`, plus `AdvanCare_Vault/AdvanCare-design-handoff/SHA256SUMS.txt`. Recorded per-file resolution notes in `NOTES.md`.
- Untracked `website/node_modules` (`git rm -r --cached website/node_modules`), added `website/node_modules/` to `.gitignore`, reinstalled macOS dependencies, and verified `npm --prefix website run build`.
- Fixed request timeline step mapping in `frontend/src/screens/Requests.tsx` (`progress()` and `STEP_CAPTION`) so `submitted` highlights step 0 ("Awaiting confirmation from your care team."), `confirmed` highlights step 1 ("Confirmed by your care team."), and `in-progress` highlights step 2 ("In progress").
- Updated `AdvanCare_Vault/Architecture/Data Models & Entity Schemas.md` (ERD, DDL for migrations `0000`–`0007`, and API contracts) to match `backend/src/db/schema.ts` and ADR-006/007/011 (`ON DELETE RESTRICT ON UPDATE RESTRICT`, no default clinical/vital values, append-only `audit_logs` triggers).

## [2026-11-15] - Brain cleanup
- Resolved leftover merge-conflict markers in `CHANGELOG.md` and `TODO.md` (both sides kept; neutral wording chosen), put entries in newest-first order, and moved the 2026-10-15/16 entries verbatim to `archive/CHANGELOG_ARCHIVE.md`.
- `TODO.md` reorganised into Open / Later / Done; items the code shows as finished (storage auth, server 12 h lead time, production origins/secrets, caregiver mode, Phase C, Gmail sign-in) moved to Done; duplicates merged. Added the open blocker: committed conflict markers in app/console/backend source since merge `8eb7e1f` (2026-11-04).
- `DECISIONS.md`: duplicate ADR-011 (assistant language) renumbered ADR-018; ADRs in numeric order; status notes on ADR-003, ADR-009, ADR-012, ADR-010/011/014 updates.
- `PROJECT_CONTEXT.md` stack and status rewritten from the code; `ARCHITECTURE.md` stale facts fixed (vault paths, storage auth, demo mode, demo-branch Hyperdrive, migrations 0000–0007, rate limiters); `NOTES.md` gained repository gotchas. `FLOW.json` validated, unchanged.

## [2026-11-09] - History rewrite, promo video, project map
- `main` history rewritten and force-pushed to drop AI co-author trailers; re-sync instructions in `NOTES.md` (Git history rewrite).
- Added the 30 s promo video (`promo_video/AdvanCare-promo-30s.mp4`); `Docs/Advancare.mp4` (205 MB) and Playwright logs git-ignored.
- 2026-11-11: added `.brain/FLOW.json` project map with decision points.

## [2026-11-04] - Website motion & UI polish (no content changes)
- Preloader (inline in `website/index.html`, hidden from `src/main.tsx` after app + fonts + load; 0.8 s min, 4 s max).
- `src/components/MotionLayer.tsx`: scroll-reveal fade-up on shared layout classes (staggered, fires once), scroll progress bar, back-to-top button. Route fade via `RouteView` in `App.tsx`; route changes jump to top instantly.
- `src/styles/motion.css`: easing tokens, hover-gated card/button states, animated nav underline, header shadow on scroll, animated mobile drawer and FAQ accordion, form focus rings, anchor offset for the sticky header, reduced-motion and print fallbacks. Inter 700/800 now loaded (headings were faux-bold).
- Note: `website/node_modules` is committed with Windows-only esbuild/rollup binaries, so `npm run dev` fails on macOS.
- Design pass (impeccable + taste skills, text unchanged except labels): removed 17 redundant kicker labels (page-hero labels, labels repeating their heading); kept ones restyled as plain teal labels with a short marker. Card grids replaced by varied layouts in `main.css` (`stat-row`, `panel-cols`, `step-flow`, `rule-cols`, `stack-list`, `loop-split`, `value-band`); cards use a tone step instead of 1px outlines; section dividers and resting shadows removed; text below 13px raised. Team photos centred per person via `photoCrop` in `storyData.ts` (`.team-photo`).
- Hallmark audit + polish: Inter replaced by self-hosted Bricolage Grotesque (display) and Instrument Sans (text), the brochure faces (`src/styles/fonts.css`, `src/assets/fonts/`, OFL). Services pillar cards stack below 900px (`.service-pillar`); small-phone header shows an icon-only Donate under 380px; Contact tabs wrap. Colours, spacing and shadows go through tokens; no tracked-caps labels; reveal hiding scoped to `html.js`. Sloplint 58 FAIL to 9 (the nine kept section labels, waived in the `main.css` stamp). Checked at 320/360/375/390/430/768 px with no overflow.

## [2026-10-30] - Provider-neutral repository handoff

- Renamed the UI implementation brief to `IMPLEMENTATION-BRIEF.md`, refreshed handoff links and checksums, and removed obsolete assistant-specific references from project notes.
- Brochure generation reads fonts from `ADVANCARE_FONT_DIR` (defaults to `tmp/pdfs/brochure/fonts`) instead of a machine-specific plugin installation. Required files: `InstrumentSans-Regular.ttf`, `InstrumentSans-Bold.ttf`, `BricolageGrotesque-Bold.ttf`, and `Lora-Italic.ttf`.

## [2026-10-28] - Discounted pharmacy & supplies, simpler staff actions, shared-network sign-in

- New service `supplies` (app: Services → "Discounted pharmacy & supplies", `/services/supplies`): vitamins, generic maintenance medicines (Rx) and care supplies at a 20% member price, quantities, pickup/delivery, optional prescription photo for Rx items. Goes through the service-request inbox. Prices are pilot estimates in `frontend/src/data/catalog.ts` (`SUPPLIES`, `MEMBER_DISCOUNT`); staff confirm the final price. Migration `0007_discounted_supplies` widens the `service_requests_kind` CHECK.
- Staff console: service requests show one next step per service (e.g. "Assign driver & pickup time" → "Mark trip done"; "Confirm order & delivery date" → "Mark delivered / picked up"); "Start review" removed (server still accepts IN_REVIEW). Caregiver bookings: "Start matching" removed, "Escalate"/"Unassign" renamed "Flag for coordinator"/"Remove caregiver". Provider card hidden for services without providers. Overview lists service requests waiting for staff. Fixed: console ignored the app's "Label: value" detail lines.
- Sign-in rate limits split: strict per email (10/min, unchanged) and generous per IP (app 200/min, staff 100/min; new bindings `CLIENT_AUTH_IP_LIMITER` 1004, `ADMIN_LOGIN_IP_LIMITER` 1005) so many phones on one Wi-Fi don't lock each other out. Sessions were never IP- or device-bound.
- Care Assistant knowledge: added supplies, email sign-in, and that bookings do reach the care team.

## [2026-10-22] - Website realigned to `/Docs`
- Website content now comes from the proposal deck, brochure, two-year Gantt and budget in `/Docs` (ADR-017). Content data: `website/src/data/{storyData,roadmapData,plansData,servicesData,faqData}.ts`.
- Home: brochure hero ("Care closer to every community"), lived patient experience, problem (56% / 57 yrs / 31% with sources), four-step solution, five-part closed care loop, process map, target market, plans, FAQ.
- About: project team, "what makes us different", competitive analysis vs PhilHealth, Maxicare and Metrobank. International benchmarks removed from the site.
- Plans: deck tier table (transport and caregiver SLAs, funding sources, unemployed 65+), proposed 50% LGU subsidy note. PhilHealth-floor framing and "annual savings" figure removed.
- New `/program` page: phases, 24-month Gantt with research track and decision gates, TAM/SAM/SOM, business model canvas, ₱21,640,319 budget.
- Services follow the care loop plus caregivers and supplies; revenue streams replace the 80/20 explorer; SMS keyword table removed.
- Donate: fake payment accounts, decorative QR and fabricated transparency ledger removed; pledges go to the program leader by email. Contact uses the brochure contact and address.
- Pilot shown as 2 remote barangays in Peñablanca (30-50 households); municipality directory removed. `MASTER_PROMPT.md` marked superseded. Build and type check pass.

## [2026-10-18] - Non-emergency transport vehicle choices

- Demo driver vehicles and the admin registration dropdown now match the six mobile booking options: tricycle, multicab/jeepney, shared van, private car, wheelchair-accessible van, and non-emergency stretcher vehicle. Driver-only seed refreshes existing fixture vehicles while preserving assignments.

## [2026-10-18] - Provider display names

- Seeded driver names now use varied first/last names without Demo labels, numbering, or municipality suffixes. Doctor names omit the title because the console supplies “Dr.”. Re-running provider-only seeds refreshes names on matching fixture accounts without replacing assignments or provider records.

## [2026-10-18] - Demo transport drivers and mobile booking label

- Demo seed adds two available, accredited transport drivers per Cagayan LGU, with fictional contacts and vehicles. `npm run db:seed-demo -- --neon-demo-branch --drivers-only` adds only drivers and can be repeated without duplicating them; existing database safety checks remain.
- Added four available, accredited fictional TeleHealth doctors (general practice, family medicine, internal medicine). `--doctors-only` adds these without other fixtures and skips duplicates.
- Mobile service catalogue and booking header now say “Hospital institutional caregiver”; existing service IDs and booking rules are retained.

## [2026-10-17] - Standalone Public Marketing & Social-Impact Website (`website/`)
- **Standalone Marketing & Donation Website Built (`website/`)**:
  - Implemented completely isolated Vite + React 18 + TypeScript web app in `/Users/mclein/Documents/Developer/Personal_Projects/AdvanCare/website/` (no interference with `frontend/`, `admin/`, or `backend/`).
  - **Hero Section (Split-Screen)**: Left column contains the official AdvanCare logo emblem, brand wordmark, tagline ("No Farmer, Fisher, and Barangay Left Behind"), operational gist (56.3% unattended death baseline, ₱300 home & ₱500 CVMC bedside watcher shifts), primary CTAs, and micro-stats ticker; Right column features the interactive **People's Care Fund** donation QR code module (scannable QR Ph, GCash, Maya, and Landbank channels, 1-click account copy, and impact tier switching: ₱300, ₱500, ₱900, ₱1,800, and custom).
  - **Full Multi-Page Architecture**: Implemented `Navbar` (with links, external app shortcuts, and mobile drawer), `Footer` (with 911 clinical emergency disclaimer and RA 10173 notice), `HomePage`, `AboutPage` (CVMC watcher protocol & international benchmark synthesis), `ServicesPage` (all 6 pillars & 2G SMS keyword reference), `PlansPage` (50/50 LGU subsidy calculator vs. PhilHealth statutory floor), `DonatePage` (audited public ledger), and `ContactPage` (LGU mayor MOU and Caregiver Academy intake).
  - **Design & Anti-AI-Slop Craft**: Strictly adhered to `tokens.css` (`#F7F9F5` Paper, `#173E37` Ink, `#086B5B` Teal, `#E3F0E8` Mint, `#CBE49C` Lime), local Inter fonts, and inlined Solar Linear vector SVG icons (CC BY 4.0).
  - Verified production build via `npm run build` (`dist/` generated with zero errors).

## [2026-10-17] - Service Rating, Unfulfilled Booking Reporting, and Caregiver Booking Flexibility
- **Completed Service Rating & Feedback**:
  - Added interactive `StarRating` component (1-5 stars with hover/touch scaling, accessible radio group semantics, and rating labels: Needs improvement, Fair, Good, Very good, Excellent).
  - Integrated Service Rating card into `RequestDetail` for completed shifts and service requests with comments textarea and submission states.
  - Implemented rating review cards showing past submitted score, review text, and "Edit rating" functionality.
  - Updated `RequestsList` to surface completed ratings (e.g. `★ 5.0`) or `★ Rate service` prompt badges.
  - Added backend endpoints `POST /api/v1/shifts/:id/rate` (updates `caregivers.averageRating`) and `POST /api/v1/service-requests/:id/rate` (persists rating/review in request details).
- **Unfulfilled Service & Problem Reporting Flow**:
  - Implemented "Report unfulfilled service" button and collapsible report form on all active, confirmed, and completed requests.
  - Support categorized reporting reasons: Caregiver/Provider no-show, Service unfulfilled/incomplete, Late arrival, Cancellation without notice, Safety/quality concerns, Billing discrepancies, or Other.
  - Added status tracking banner displaying reported issue, timestamp, and "Under Review by Care Coordinators" badge.
  - Added backend endpoints `POST /api/v1/shifts/:id/report` (escalates shift to `ESCALATED` with reason) and `POST /api/v1/service-requests/:id/report` (records report in details and updates staff note).
- **Caregiver & Doctor Booking Flexibility**:
  - Solved locked provider selection: Caregiver booking (`CaregiverRequest` in `Care.tsx`) now offers "Caregiver assignment preference" defaulting to "Any available (Fastest - auto-dispatched by coordination team)", with optional "Preferred caregiver" name field.
  - TeleHealth doctor selection in `demo.ts` and `Modules.tsx` now supports "Any available doctor (Next available)" so clients are not forced to choose a specific physician to book.
- **Bug Fixes & Hardening**:
  - Safe date/time formatting helpers in `requestUtils.ts` (`formatWhen`, `formatDay`, `formatTime`) guarding against empty/invalid dates and NaN rendering.
  - Fixed Vite build PostCSS parent directory traversal error by explicitly configuring `css.postcss: {}` in `frontend/vite.config.ts`.

- **Universal TeleHealth Booking (De-regionalized across all 29 LGUs)**:
  - Teleconsultation physicians are now universal across all 29 Cagayan LGUs and municipalities without regional locking; any patient/client can book any accredited telehealth doctor.
  - Added public client endpoint `GET /api/v1/service-requests/telehealth/doctors` returning active accredited doctors across the province.
  - Mobile app (`frontend`): Dynamically fetches accredited telehealth physicians; automatically syncs choice to available doctors; surfaces "Universal TeleHealth · Open to all municipalities" badge; marks unavailable doctors as unselectable. Fixed ISO timestamp conversion with explicit `+08:00` offset (`Asia/Manila`) so overseas OFW sponsors book accurate appointment slots.
  - Server-side slot reservation (`backend/src/routes/services.ts`): Updated `slotTaken` and `GET /service-requests/telehealth/taken` to inspect both `serviceRequests.assignedProviderId` and JSON details `doctorId`; prevented `'gp-any'` from creating global slot lockouts.
  - Assignment & Roster: Both Super Admins and local staff can view universal telehealth doctor profiles and assign doctors to requests. Candidate provider lookup checks for existing appointment slot overlaps across all LGUs.
- **Super Admin Transport Driver Restriction**:
  - Removed "Add driver" button and actions from the Super Admin dashboard, candidate selection dialogs, and driver roster pages.
  - Transport driver onboarding and management is strictly reserved for local municipal admins with local jurisdiction.
  - Backend validation in `POST /api/v1/admin/providers` and `PATCH /api/v1/admin/providers/:id` enforces `403 FORBIDDEN` when Super Admins attempt to create or edit transport driver profiles.
- **Code Review Hardening & A11y**:
  - Fixed doctor update vulnerability ensuring only Super Admins can alter doctor credentials (`DOCTOR`).
  - Pass trimmed empty strings when clearing optional provider fields in admin forms to ensure `null` persistence.
  - Added keyboard navigation and ARIA radiogroup/radio semantics to candidate provider list.
  - Added request loading spinners and error modal dialogs for Telehealth assignment queue in admin console.
