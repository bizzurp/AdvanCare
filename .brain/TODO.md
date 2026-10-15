# advanCARE: Project Roadmap & Action Items (Operational Brain)

## Working Prototype Roadmap (2026-10-16) — goal: one full care loop, online

Order = build order. ✅ done · ⬜ to do · 👤 needs the owner (account, decision or paperwork)

### P1 — Close the care loop (staff ↔ family ↔ caregiver)
- ✅ Staff: add caregivers (name, email, phone, municipality, barangay), accredit/suspend, badges, availability (2026-10-16).
- ✅ Staff: request actions — assign (ranked candidates with blockers/warnings), matching, unassign, cancel (reason, family emailed), escalate (reason); all audited (2026-10-16).
- ✅ Caregiver mode in the app: sign in by email → "My shifts" → clock in (from 2 h before) → care note (tasks, measured vitals only, notes, family message) → clock out (2026-10-16).
- ✅ Family sees care notes, caregiver first name and Paid on the request; email to the family on assignment and cancellation (2026-10-16).
- ✅ Payments: staff record cash/GCash/Maya/bank (reference required except cash), mark caregiver payout sent (2026-10-16).
- ✅ Server enforces the 12-hour booking lead time (2026-10-16). ⬜ Still to fix: "Shift in progress · current step" wording for confirmed requests in the app timeline.

### Demo environment (2026-10-16)
- ✅ Neon branch `demo-advancare` (Advancare project) seeded with fictional data; `backend/.env` currently points at it (production lines kept as comments). Switch back before real use; delete the branch to remove all demo data.
- ⬜ Demo Admin invites from the seed: Solana one used for testing (password set during testing, can be reset via console → Reset 2-step / new invite); Tuguegarao one unused (expires ~2026-10-18).

### P2 — Every service reaches staff
- ✅ `service_requests` table + API for TeleHealth, RHU services, Triage, Prescription (with uploaded photo), Transport (2026-10-16).
- ✅ App sends these instead of "Saved on device"; status, scheduled time and the care team's note shown back; family can withdraw before scheduling (2026-10-16).
- ✅ Staff console: Service requests inbox, detail (health requests audited on open), review / schedule (date-time + note) / complete / cancel (reason), audited file viewing; family emailed on schedule and cancel (2026-10-16).
- ✅ Uploads need sign-in, are checked for real JPEG/PNG/PDF content, recorded with their owner and linked to the request; `/storage/*` is owner-only (2026-10-16).

- ⬜ Families can cancel a sent caregiver booking only by calling the coordinator (no app endpoint yet).
- ⬜ Demo reviewer Super Admin (`demo.reviewer@demo.advancare.test`) exists only on the demo branch (made for testing).

### P3 — Online prototype
- 👤 Choose hosting (Cloudflare Pages recommended) and domain (optional).
- ⬜ Deploy API (`wrangler deploy --env production`) with secrets: DATABASE_URL, STAFF_ENCRYPTION_KEY (new), SMTP_USER/SMTP_PASSWORD, GEMINI_API_KEY, R2 keys.
- ⬜ Deploy the families' app (web) and the staff console; set ALLOWED_ORIGINS / ADMIN_ORIGINS / ADMIN_APP_URL / VITE_API_BASE_URL; production R2 CORS.
- 👤 Create the real Super Admin on production + a second Super Admin.
- ⬜ Smoke test on a real phone (web) and the iOS/Android builds pointed at the online API.

### P4 — Polish & cleanup
- ⬜ Remove the PWA's demo coordinator dashboard and "Coordinator" switch.
- ⬜ Plans (Silver/Gold/Platinum) stored on the server; LGU subsidy report (Table 4).
- ⬜ Staff "promote to Super Admin" with second-admin approval.
- ⬜ Offline: encrypted on-device storage (ADV-FE-001).

### Later (not needed for the prototype)
- ⬜ GCash/Maya online payments · SMS codes and SMS keyword booking · push notifications · n8n automations (matching, summaries, reports) · NEMT trip tracking/maps (PostGIS) · Tagalog/Ilocano/Ybanag translations.
- 👤 Non-code: LGU MOU, caregiver recruitment & 40-hour training, CVMC coordination letter, Data Privacy Act review of consent wording, care hotline number.

## Current Sprint: Phase 0 Setup & Infrastructure Validation

### 1. Product & Frontend
- [x] Initialize mobile app (React + Vite PWA in `frontend/`, design handoff applied).
- [x] Client registration (OTP, assisted/dependent, consent) & Silver/Gold/Platinum 50/50 plan selector with enrollment status (UI; no backend).
- [x] Client Profile & Family Profile screens incl. delegation scopes (UI; saved on device).
- [x] Service request UIs: TeleHealth (GP), RHU services (MD/DMD/nurse/midwife), Triage & referral, Prescription (photo/file), Transport (public/private), Home caregiver ₱300, CVMC caregiver ₱500.
- [x] Request tracking (status timeline, cancel, reschedule) and offline queue.
- [x] Reports: service records (filters, CSV, print-to-PDF), trends, coordinator dashboard (demo data).
- [ ] Tele-Consultation voice memo input (not built).
- [ ] Replace localStorage with encrypted Dexie/WebCrypto store (ADV-FE-001).
- [ ] Tagalog / Ilocano / Ybanag translations.
- [ ] Caregiver field execution UI and family peace-of-mind portal (ADV-FE-002).

### 1b. Open decisions & dependencies surfaced by the frontend
- [ ] Approve a clinical triage protocol and emergency danger-sign list (no urgency/routing logic exists until then).
- [ ] Define API contracts for TeleHealth, RHU appointments, Triage, Transport, Prescription.
- [ ] Confirm the pilot RHU service list and verified facility directory (district hospitals, private clinics).
- [ ] Resolve pilot financing: ADR-001 (50/50 LGU subsidy) vs prompt pack (100% out-of-pocket for the pilot). UI currently follows ADR-001.
- [ ] Decide whether the "Specialized caregiver ₱500 home" tier from the mockups is approved (shown disabled).
- [ ] Assign the care support hotline number (Help screen uses a placeholder).
- [ ] Legal review of the Data Privacy Act consent wording.

### 1c. Backend (ADV-CORE-001 done 2026-10-15)
- [x] Workers + Hono API skeleton, Drizzle schema + migration, health, R2 presigned storage.
- [x] Provision Neon project (Singapore), link with `neon init`, run `npm run db:migrate` (2026-10-15).
- [x] Create Hyperdrive `advancare-neon` (unpooled URL, caching off) and set its id in `backend/wrangler.toml` (2026-10-15).
- [x] Create R2 buckets `advancare-uploads-dev` / `advancare-uploads` (apac) and dev-bucket CORS (2026-10-15).
- [x] Create R2 API token `advancare-api` (Object Read & Write, both buckets) and put keys in `backend/.env`; real presigned upload/download verified against the dev bucket (2026-10-15).
- [ ] `wrangler secret put` R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY for `--env production` before first deploy.
- [ ] Set production bucket CORS and `ALLOWED_ORIGINS` once the frontend host is known.
- [ ] Set production `ALLOWED_ORIGINS`.
- [ ] Gate `/storage/*` behind auth and record file ownership (ADV-AUTH-001).
- [ ] Update the Obsidian data-model note: its DDL still shows CASCADE and default vitals (superseded by ADR-007).

### 1d. Care Assistant (ADR-010)
- [x] Guarded Gemini assistant endpoint + app wiring (2026-10-15).
- [ ] Replace the borrowed AI Studio key with an AdvanCare-owned, billing-enabled key before real client conversations; `wrangler secret put GEMINI_API_KEY --env production`.
- [x] `authenticatedUserId` now resolves the app session (ADV-AUTH-001, 2026-10-15); the assistant can read the user's own shift summaries.
- [ ] Keep `backend/src/assistant/knowledge.ts` in sync with price/service changes.

### 1f. Native apps (ADR-013)
- [x] Capacitor iOS + Android projects, icons, splash (2026-10-15); iOS verified in simulator.
- [x] JDK 21 installed; Android debug build verified on the Pixel_9 emulator (2026-10-15). `android/gradle/gradle-daemon-jvm.properties` pins Gradle to Java 21.
- [ ] Add `capacitor://localhost` and `https://localhost` to production `ALLOWED_ORIGINS` when the app talks to the API.
- [ ] Apple Developer + Google Play Console accounts, signing, privacy policy, store listings.
- [ ] Native plugins as needed: camera (prescriptions), push notifications, secure storage (replaces localStorage, ADV-FE-001).

### 1g. App sign-in & booking (ADR-014, 2026-10-15)
- [x] ADV-AUTH-001: email 6-digit code sign-in, 30-day app sessions, sign-out.
- [x] ADV-BOOK-001: `POST /api/v1/clients/sync` + `POST /api/v1/shifts/request` (idempotent) + `GET /api/v1/shifts/mine`; the app syncs the profile on registration and before each booking and refreshes statuses.
- [x] Migration `0002_client_sign_in` applied to Neon.
- [ ] Gmail sending: turn on 2-Step Verification on the sending Gmail, create an App Password, set `SMTP_USER` / `SMTP_PASSWORD` in `backend/.env` (and `wrangler secret put` for production). Until then codes only appear in the dev API log.
- [ ] SMS codes later (Semaphore/Twilio) when budget allows: only the delivery in `routes/auth.ts` changes.
- [ ] Server-side 12-hour minimum lead time (the app enforces it; the server only rejects past start times).
- [ ] App: the request timeline shows "Shift in progress · current step" while a request is only Confirmed (pre-existing progress mapping) — review wording.

### 1e. Admin dashboard (ADR-011/012; plan: `AdvanCare/Product/Admin Dashboard & Staff Accounts Plan.md`)
- [x] Phase A: staff accounts (invite, 2FA, sessions, lockout, scope, suspend/reactivate, 2FA reset), audit log, `admin/` shell with Overview, Admin accounts, Audit log, My account (2026-10-15).
- [ ] Bootstrap the real first Super Admin: `cd backend && npm run admin:bootstrap -- --email <you> --name "<name>"`, then open the printed link with `advancare-backend` + `advancare-admin` running.
- [ ] Production: `wrangler secret put STAFF_ENCRYPTION_KEY --env production` (new key, not the dev one), set `ADMIN_ORIGINS` / `ADMIN_APP_URL`, deploy `admin/` (static, own subdomain, optional Cloudflare Access), set `VITE_API_BASE_URL`.
- [ ] Email provider for invite links (they're copied from the UI for now).
- [ ] DB-backed integration tests for the role × endpoint matrix and lockout (needs a disposable Postgres/Neon branch in CI).
- [ ] Promote an existing Admin to Super Admin (needs second-Super-Admin approval; only invites exist now).
- [x] Phase B: Overview KPIs/charts, Requests (+ detail), Shifts board, Clients (+ detail, reason-gated clinical notes), Caregivers (+ detail), Payments, Reports/CSV exports, all municipality-scoped and audited (2026-10-15).
- [ ] Real data: app sign-in and booking now write to Neon (2026-10-15); the console fills as families book. Use `db:seed-demo` on a local DB to review with demo data.
- [ ] SLA deadlines and adherence on the Overview once plan tiers exist (`subscriptions`, phase D).
- [ ] Phase C: assign/confirm/cancel/escalate, caregiver accreditation, payment marking; remove the PWA demo coordinator dashboard. (`GET /shifts/mine` and the app's status refresh already exist.)
- [ ] Phase D: `subscriptions` + LGU subsidy reconciliation, System status page, scheduled exports.

### 2. AI & n8n Workflows
- [ ] Set up self-hosted n8n environment with PostgreSQL integration.
- [ ] Implement Workflow 1: Triage & Intake AI Agent (Gemini 1.5 Flash tool-calling).
- [ ] Implement Workflow 2: Smart Proximity Dispatch & Matching Agent with Honor-inspired ranking.
- [ ] Implement Workflow 3: Tele-Consult & Clinical Routing Agent.
- [ ] Implement Workflow 4: Prescription & DoH Yakap Logistics Agent.
- [ ] Implement Workflow 5: NEMT Transport Routing Agent.
- [ ] Implement Workflow 6: Care Note Summarizer & Family Dispatcher Agent.
- [ ] Implement Workflow 7: Automated Reporting & LGU Billing Agent (PDF/CSV generator).
- [ ] Configure SMS Gateway webhook (Twilio / Semaphore) for offline keyword fallback.

### 3. Community & Operations (Cagayan Fieldwork)
- [ ] Draft and execute Memorandum of Understanding (MOU) with pilot municipality (e.g., Solana or Tuguegarao) and 2–3 pilot barangays.
- [ ] Recruit first pilot cohort of 15–20 youth caregivers through Barangay Health Worker (BHW) partnerships.
- [ ] Conduct 40-hour Grassroots Caregiver Academy training & badge issuance (`BADGE_ADL`, `BADGE_CVMC_WATCHER`).
- [ ] Establish pharmacy liaison with Tuguegarao wholesale distributor for non-Yakap medicines.
- [ ] Finalize bedside watcher coordination protocol with Cagayan Valley Medical Center (CVMC) nursing administration.
