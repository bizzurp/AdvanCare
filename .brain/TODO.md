# advanCARE: Project Roadmap & Action Items (Operational Brain)

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
- [ ] After ADV-AUTH-001: implement `authenticatedUserId` so the assistant can read the user's own shift summaries.
- [ ] Keep `backend/src/assistant/knowledge.ts` in sync with price/service changes.

### 1f. Native apps (ADR-013)
- [x] Capacitor iOS + Android projects, icons, splash (2026-10-15); iOS verified in simulator.
- [x] JDK 21 installed; Android debug build verified on the Pixel_9 emulator (2026-10-15). `android/gradle/gradle-daemon-jvm.properties` pins Gradle to Java 21.
- [ ] Add `capacitor://localhost` and `https://localhost` to production `ALLOWED_ORIGINS` when the app talks to the API.
- [ ] Apple Developer + Google Play Console accounts, signing, privacy policy, store listings.
- [ ] Native plugins as needed: camera (prescriptions), push notifications, secure storage (replaces localStorage, ADV-FE-001).

### 1e. Admin dashboard (ADR-011/012; plan: `AdvanCare/Product/Admin Dashboard & Staff Accounts Plan.md`)
- [x] Phase A: staff accounts (invite, 2FA, sessions, lockout, scope, suspend/reactivate, 2FA reset), audit log, `admin/` shell with Overview, Admin accounts, Audit log, My account (2026-10-15).
- [ ] Bootstrap the real first Super Admin: `cd backend && npm run admin:bootstrap -- --email <you> --name "<name>"`, then open the printed link with `advancare-backend` + `advancare-admin` running.
- [ ] Production: `wrangler secret put STAFF_ENCRYPTION_KEY --env production` (new key, not the dev one), set `ADMIN_ORIGINS` / `ADMIN_APP_URL`, deploy `admin/` (static, own subdomain, optional Cloudflare Access), set `VITE_API_BASE_URL`.
- [ ] Email provider for invite links (they're copied from the UI for now).
- [ ] DB-backed integration tests for the role × endpoint matrix and lockout (needs a disposable Postgres/Neon branch in CI).
- [ ] Promote an existing Admin to Super Admin (needs second-Super-Admin approval; only invites exist now).
- [x] Phase B: Overview KPIs/charts, Requests (+ detail), Shifts board, Clients (+ detail, reason-gated clinical notes), Caregivers (+ detail), Payments, Reports/CSV exports, all municipality-scoped and audited (2026-10-15).
- [ ] Real data: the Neon database has no clients/requests yet, so the live console is empty until ADV-AUTH-001/ADV-BOOK-001 send real bookings (use `db:seed-demo` on a local DB to review).
- [ ] SLA deadlines and adherence on the Overview once plan tiers exist (`subscriptions`, phase D).
- [ ] Phase C: assign/confirm/cancel/escalate, caregiver accreditation, payment marking; client `GET /shifts/mine`; remove the PWA demo coordinator dashboard.
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
