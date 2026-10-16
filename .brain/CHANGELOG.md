# advanCARE: Changelog (Operational Brain)

## [2026-10-16] - Vercel hosting allowed by the API
- Friend's Vercel projects (repo `bizzurp/AdvanCare`): families `https://advancare.vercel.app` (Root Directory `frontend`), staff `https://advancare-admin.vercel.app` (Root Directory `admin`). Added them to production `ALLOWED_ORIGINS` / `ADMIN_ORIGINS` and redeployed `advancare-api` (version a19c550e…), which also shipped today's new family endpoints. Verified health, console login via the Vercel proxy (no CSRF block) and families CORS. `advancare.vercel.app` was still serving the old demo-mode build at the time; its production deployment must be rebuilt from latest `main`.

## [2026-10-16] - App finished: no demo mode, editable profile/account, connected bookings

### Changed
- Families' app has no demo mode: it always calls the API (`VITE_API_BASE_URL`, else `http://localhost:8787` in dev and the hosted Worker in builds). Removed the demo code `999123`, "Demo"/"Sample" tags, demo controls and the coordinator role switch. Sample data is kept unlabelled: starter client Maria Santos, doctor roster, RHUs, facilities, barangays and two past records. Old on-phone "saved-demo" requests are re-queued and sent; offline-preview sessions must sign in again.
- Backend: `GET /clients/mine` (saved clients + family; the app loads them after sign-in), `PATCH /auth/me` (account name, mobile), `PATCH /service-requests/:id` (time/details until scheduled), `GET /service-requests/telehealth/taken` + 409 `SLOT_TAKEN` on double-booking a doctor, `PATCH /shifts/:id` + `POST /shifts/:id/cancel` (until a caregiver is assigned). No migration.
- App: Edit profile covers every field (DOB, gender, PhilHealth, conditions, mobility, allergies, address, language) and syncs to the server; family changes sync; new Account details screen (More → Account details); requests can be rescheduled, given a note for the care team, or cancelled while unconfirmed; TeleHealth greys out booked slots; Care assistant always uses the AI endpoint (with session), falling back to shortcuts only if unreachable.

### Verified
- Backend typecheck + tests (72 passed, DB tests skipped without local Postgres); frontend build. Against the Neon demo branch via the running API and app: profile edit persisted, account edit, TeleHealth booking from the app, booked slot greyed out, double-book refused, note + reschedule saved, shift move/cancel, AI assistant answer. Test bookings cancelled and the QA session revoked (QA user `qa.family@demo.advancare.test` remains on the demo branch). Hosted Worker/Pages not redeployed.

## [2026-10-16] - P3: Online Prototype Deployed

### Deployed / changed
- Workers API: `https://advancare-api.mcleinonza0531.workers.dev`; existing production Hyperdrive/R2/rate-limit bindings retained. Seven required secrets uploaded privately. All five production migrations verified by hash; no database migration needed. Preserved the existing staff key after checking compatibility with the enrolled account; local `.env` stays on demo.
- Actual Pages Direct Upload projects: families `https://advancare-app.pages.dev`, staff `https://advancare-admin.pages.dev`. Added Pages configs and header policies; staff `/api` Function preserves request/response cookies, Origin, methods, bodies and queries, prevents caller-selected upstreams and sets no-store/security headers. Enabled public Worker fetch and limited Function routing to API paths.
- Vercel fallback points at the real Worker. Deployment runbook, Architecture, ADR-016 and P3 checklist reflect current hosting. Native releases/app stores deferred.
- Installed Wrangler redirected the initial Pages-create command into a backend Worker deployment; removed that unintended `advancare-admin` Worker and created the real Pages projects via API. Future uploads target the existing Pages resources.

### Verified
- All three builds pass; three new proxy tests pass (cookie/header/body/query preservation, fixed destination and static fallback).
- Both apps render in the browser; live direct and proxied health return production/Hyperdrive `ok`; unauthenticated staff API returns JSON 401; staff POST forwarding and production/foreign/preview Origin checks pass. Family/native upload CORS, deep-link fallback, security headers and service worker no-cache pass.
- No sign-in email sent, production booking created, staff account added or password changed. Real account holders still need to verify authenticated booking and console reload. No app-store or native deployment.

## [2026-10-16] - P3: Online Prototype Configuration (Owner Deployment Pending)

### Added / changed
- Vercel configuration for the families' app and staff console: security headers, camera/geolocation policy for families, service worker revalidation, and a console `/api` rewrite before the BrowserRouter fallback. The API destination is deliberately `REPLACE_ME` until the owner's first Worker deploy; console API base stays empty.
- Worker production vars for the expected Vercel origins, Capacitor origins, console invitation URL and `AdvanCare` sender name; existing production bindings retained. Corrected the admin Vite deployment comment.
- Root `DEPLOY.md`: numbered owner checklist for login, production migrations, secrets, API deployment, literal proxy URL replacement, Vercel imports/origin confirmation, two Super Admins, optional protection, native sync, smoke checks and rollback. Records proxy-IP rate-limit and production-only console limitations; the second Super Admin uses existing bootstrap `--additional`.
- Architecture deployment section, ADR-015 and P3 roadmap updated. No app features, auth logic, schema or existing tests changed.

### Verified locally
- `npm test` in `backend/`: 111 passed, 2 conditional skips, across 11 files against temporary local PostgreSQL 17 with all five existing migrations applied. Temporary database stopped and removed; no Neon writes or real email.
- `npm run build` passed in `backend/`, `admin/` and `frontend/` (includes TypeScript checks; backend bundles with Wrangler dry-run). Dotenv loading into Wrangler disabled for verification so local secrets are not printed or bundled.
- Parsed both Vercel JSON files and Wrangler TOML; checked exact headers, rewrite order, service worker cache rule, production vars and retained bindings. Reviewed the diff for secrets.
- No login, secret upload, production migration, push or deployment performed. Online smoke tests remain owner-run.

## [2026-10-16] - P2: Every Service Reaches Staff

### Added
- TeleHealth, RHU, Triage, Prescription and Transport requests are saved on the server (no longer only on the phone); prescription photos are uploaded and checked.
- Staff console "Service requests": inbox, detail, review / schedule with a note / complete / cancel, audited file viewing; overview tile for new requests.
- Families see the status, scheduled time and the care team's note, and can withdraw a request before it is scheduled. Migration `0004_service_requests` (production + demo branch).

### Changed / fixed
- File storage now requires sign-in and is owner-only; uploads are recorded with their owner.
- CORS allowed the `X-File-Name` header (photo uploads were blocked by the browser).
- Stored files are returned whole instead of streamed (fixed a hanging test run).

### Verified
- Backend 111 tests pass (local Postgres), 72 without it; all three builds pass.
- Browser on the demo branch: registered a family → sent a prescription refill with a photo → it appeared in the staff inbox with the file → scheduled for 17 Oct 2:00 PM with a pickup note → the family app showed Confirmed, SVC reference, the note and the time; the photo downloaded intact for staff.

## [2026-10-16] - P1 Care Loop: Staff Actions, Caregiver Mode, Payments

### Added
- Staff console: add/manage caregivers; assign (ranked candidates), start matching, unassign, escalate, cancel; record payments and caregiver payouts; all audited.
- Caregiver mode in the app: email sign-in, My shifts, clock in/out, care notes (measured vitals only), availability switch.
- Families: care notes, caregiver name and Paid on the request; emails on assignment and cancellation.
- Server enforces the 12-hour booking lead time. Migration `0003_staff_actions` (production + demo branch).
- Neon `demo-advancare` branch seeded with fictional data; seed script can target only branches named like "demo".

### Fixed
- Tests could send real email once Gmail was configured (a few code emails went to made-up test addresses); tests now always run with SMTP blanked and use `.test` addresses.

### Verified
- Backend: 105 tests pass (local Postgres), builds pass for backend, app and console.
- Browser on the demo branch: added caregiver → accredited/available → assigned to a Solana booking (ranked first) → caregiver signed in, clocked in, saved a note, clocked out → staff recorded cash and payout → family API shows Completed, Paid, 1 note.

## [2026-10-15] - App Sign-in by Email Code & Real Bookings (ADV-AUTH-001, ADV-BOOK-001, ADR-014)

### Added
- Email 6-digit sign-in codes through Gmail (free) instead of SMS; 30-day app sessions; sign-out.
- Profile sync, caregiver booking (idempotent, server-set ₱300/₱500 rates) and booking status for the app; migration `0002_client_sign_in` applied to Neon.
- App: email sign-in/registration, mobile number collected for calls, profile sent on registration and before each booking, live status with REQ- reference and caregiver first name.

### Fixed
- Bookings accept the app's timestamp start time (was rejected as invalid).
- Stale "Not yet connected" note on caregiver booking now shows only in demo mode.

### Verified
- Backend: 96 tests pass with a local Postgres (80 without). Builds pass for backend, app and admin.
- Browser, local database: registered by email code → profile on the server (family contact, no invented clinical values) → booked a home caregiver → appeared in the staff console as REQ-062C177F → after a simulated staff confirmation the app showed "Confirmed" and the caregiver's first name.

## [2026-10-15] - Staff Console Phase B: Operations Dashboards

### Added
- Backend read APIs under `/api/v1/admin`: overview, requests ledger + detail, shifts board, clients + detail, reason-gated clinical notes, caregivers + detail, payments, CSV exports (requests, payouts, payments). All limited to the staff member's municipalities; out-of-scope records return 404; opening a client, viewing clinical notes and exporting are audited.
- Admin pages: Overview (KPI tiles, needs-attention list, requests by service/status, daily requests chart with tooltip and table view), Requests, Request detail, Shifts board, Clients, Client detail, Caregivers, Caregiver detail, Payments, Reports. Sidebar "Operations" group; narrow screens no longer scroll sideways.
- `npm run db:seed-demo` (local databases only) and an optional DB-backed scope test suite (`TEST_LOCAL_DATABASE_URL`).

### Verified
- Backend: 75 tests pass (9 skipped without a local DB); with a local Postgres, 82 pass including the role × scope matrix. Builds pass for backend and admin.
- Browser, against seeded local data as a Super Admin: overview figures, chart and drill-downs, waiting filter, request → client → clinical notes (reason required, audited), payments, caregivers, shifts board, payouts CSV (159 rows), audit entries for each.

## [2026-10-15] - Staff Console Phase A: Accounts, 2FA, Audit (ADR-011/012)

### Added
- Migration `0001_staff_accounts` (applied to Neon): `SUPER_ADMIN` role, staff credentials/sessions/invitations/recovery codes/municipality assignments, append-only `audit_logs`.
- Backend `/api/v1/admin/*`: password + TOTP sign-in with lockout and rate limit, invite → password → authenticator enrollment, cookie sessions (idle/absolute expiry, instant revocation), CSRF guard, Super Admin account management, scoped audit log. `npm run admin:bootstrap` for the first Super Admin.
- New `admin/` app (port 5176): sign-in, accept invite, 2FA setup with QR + recovery codes, Overview, Admin accounts, account detail with drill-down links, Audit log, My account.
- New `backend/test/staff.test.ts` and `test/admin.test.ts`; suite: 71 passed, 2 skipped (DB-variant tests).

### Verified (throwaway local Postgres, browser + API)
- Bootstrap → accept invite → enroll → sign in; invite an Admin scoped to Solana; Admin sees only their scope and own audit entries, gets 403 on account APIs and "Page not found" on Super Admin pages; replayed TOTP refused; invite links single-use; scope change, suspend (session ends on next request; correct password refused) and reactivate all audited; UPDATE/DELETE on `audit_logs` blocked on Neon.

## [2026-10-15] - Native iOS & Android Apps (ADR-013)

### Added
- Capacitor 8 iOS and Android projects (`ph.advancare.app`), app icons from the heart emblem, launch screen with the full logo, status bar and splash handling, bundled Inter font, npm scripts `cap:sync`, `ios`, `android`, `assets`.

### Verified
- iOS: built with Xcode 27 and launched on the iPhone 17 simulator as its own app (own icon in the app switcher, full screen, no Safari bar).
- Android: debug APK built with JDK 21 and launched on the Pixel 9 emulator (own launcher icon, full screen).

## [2026-10-15] - Care Assistant on Gemini (ADR-010)

### Added
- Backend `POST /api/v1/assistant/chat`: Gemini 3.5 Flash-Lite with 3.1 Flash-Lite fallback, AdvanCare-only scope, live caregiver availability from Neon, server-enforced refusal/emergency/redaction, rate limit, metadata-only logs. 21 security tests (mocked Gemini).
- Frontend assistant calls the API for general questions; emergencies and own-data questions stay on the device. Gemini settings in `backend/.env.example`.

### Verified (real Gemini, dev server)
- Correct answers for prices, plans, Tagalog, availability; refused off-topic, prompt-leak, fake-admin, other-person PhilHealth and connection-string probes; medicine-dose question redirected to Triage; stroke signs → fixed 911 text; 429 after the per-minute cap.

## [2026-10-15] - Frontend Navigation Consistency & QA Pass

### Changed
- One navigation rule for every screen (`Screen`/`BottomNav` in `frontend/src/components/ui.tsx`): main tabs show the bottom nav with no Back button; pages inside a section (requests, profile, plans, settings, help, report pages, request confirmation) show the nav with their parent tab active; forms with a sticky action button, the print view and signed-out screens hide it.

### Fixed
- `api.ts` now reads backend error messages from the `{ error: { message } }` envelope (was always showing a generic error).
- CSV export: human-readable status labels, UTF-8 BOM for Excel, CRLF, and formula-injection guard for cells starting with = + - @.

### Verified
- All 29 routes render without errors; sign-in (wrong/right OTP), caregiver booking ₱300/₱500 with 80/20 split, offline queue and reconnect, cancel request, form validation on every service form, plan enrollment, assistant, CSV export, text size, sign-out and auth redirect.

## [2026-10-15] - Backend Core (ADV-CORE-001, backend/)

### Added
- `backend/` Cloudflare Workers + Hono API: request-ID, CORS and error middleware; Valibot validation.
- Drizzle schema and first migration for users, client/family profiles, caregivers, shifts, care notes, payments, idempotency records. RESTRICT on every FK, no default vitals, DB-enforced ₱300/₱500 80/20 split.
- Hyperdrive binding with direct SSL Neon fallback; `GET /api/v1/health`; R2 presigned uploads and file streaming.
- Vitest suite (21 tests) running in workerd. Migration and health check also verified against a local PostgreSQL 17.
- ADR-006 (Workers/Hyperdrive/Neon system of record, n8n async only) and ADR-007 (no cascading deletes, no default clinical values).

## [2026-10-15] - Mobile App UI Implementation (frontend/)

### Added
- `frontend/` React + Vite PWA implementing all 29 handoff screens with shared components (buttons, fields, choice/service rows, badges, page header, bottom navigation, stepper, segmented control).
- Onboarding carousel (320ms ease-out slide, Next/Back/Skip, pager dots, swipe, keyboard, reduced motion).
- New modules: RHU services (MD, DMD, nurse, midwife), Triage & referral (RHU, district hospital, CVMC, private), public/private transport, TeleHealth with GP selection.
- Phone OTP sign-in, 7-step registration, plan enrollment status, request tracking, settings, offline queue, CSV/PDF export.
- ADR-009 (frontend demo-mode boundary).

## [2026-10-15] - Comprehensive Brain Architecture & Knowledge Expansion

### Added
- **Global & Regional Benchmark Synthesis:**
  - Added in-depth research on **Homage** (Malaysia/Singapore/Australia): On-demand care, medical escort, and remote family care notes.
  - Added in-depth research on **Honor Technology** (USA/Global): Centralized logistics platform, multi-dimensional smart matching algorithms, and dropping caregiver churn from 80% to 30%.
  - Added in-depth research on **Auxilio Care** (UK): Complex care, supported living for PWD, and blended public-private co-pay mechanisms.
  - Added in-depth research on **Centene Corporation** (USA): Managed care capitation (PMPM), addressing Social Determinants of Health (SDOH), and Non-Emergency Medical Transport (NEMT) as clinical risk prevention.
  - Created `Comparative Benchmark Matrix.md` comparing all four pioneers against advanCARE.
- **Product & System Specifications:**
  - Authored `Mobile App System Specification.md` covering Client Registration & 50/50 LGU Subscriptions, Client Profile & Family Profile (with remote OFW tracking), and the 5 service requests:
    1. Tele-Consultation
    2. Medical Prescription Request
    3. Non-Emergency Medical Transport (NEMT: time, source, destination)
    4. Home-Based Barangay Caregiver (₱300 / 8 hrs)
    5. CVMC Institutional Caregiver (₱500 / 8 hrs)
  - Authored `Service Catalog & Caregiver Operations.md` establishing unit economics (80/20 split), digital skill badges, and the Cagayan Valley Medical Center bedside watcher protocol.
  - Authored `Reporting Engine & Dashboard Specifications.md` detailing master tables, trend graphs, and role-based dashboards.
- **AI Automation & Architecture:**
  - Authored `Agentic AI & n8n Workflow Architecture.md` detailing the 7 specialized n8n agents, low-bandwidth SMS fallbacks, and human-in-the-loop escalation.
  - Authored `Data Models & Entity Schemas.md` defining PostgreSQL 16+ DDL, PostGIS spatial queries, ERD, and webhook JSON payloads.
  - Authored `Fishbone Root Cause Analysis.md` mapping the 7 spines to platform solutions.
  - Authored `AdvanCare Master MOC.md` as the unified Obsidian navigation hub.
- **Operational Brain Setup:**
  - Created `.brain/` directory with `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, `TODO.md`, `CHANGELOG.md`, and `NOTES.md`.

### Changed
- Updated `AdvanCare/Project Context.md` and `AdvanCare/Implementation Plan.md` with clarified flat shift rates (₱300/8hr Barangay, ₱500/8hr CVMC) and cross-links to all research, product, and AI architecture documents.
