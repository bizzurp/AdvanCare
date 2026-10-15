# advanCARE: System Architecture (Operational Brain)

## 1. High-Level Architecture Overview

advanCARE connects grassroots rural households in Cagayan to accredited local caregivers, transport operators, and clinicians via a three-tier architecture:

```
[ Grassroots Clients / Family Sponsors / BHWs ]
                      │  (HTTPS PWA / SMS Gateway / WhatsApp)
                      ▼
[ n8n Agentic Automation Engine (Self-Hosted / Cloud) ]
  ├── Triage & Intake AI Agent (Gemini 1.5 Flash Tool-Calling)
  ├── Smart Proximity Matching & Dispatch Agent (Honor-Inspired)
  ├── Tele-Consult & Clinical Routing Agent
  ├── Prescription & DoH Yakap Logistics Agent
  ├── Non-Emergency Medical Transport (NEMT) Logistics Agent
  ├── Care Note Summarizer & Family Dispatcher (Homage-Inspired)
  └── Automated Reporting & LGU Billing Agent
                      │
                      ▼
[ Core Data & Spatial Layer: PostgreSQL 16+ / PostGIS ]
  ├── Users, Client Profiles, & Family Profiles (OFW Sponsors)
  ├── Service Requests & Shift Ledgers (₱300 / ₱500 rates)
  ├── Care Notes & Vitals Checklists
  └── NEMT Trip Manifests & LGU Subsidy Accounts
```

## 2. Core Subsystems

### A. Mobile App Front-End
- **Framework:** React / React Native / PWA (lightweight bundle, offline sync via IndexedDB).
- **Core User Journeys:**
  1. *Subscription Onboarding:* Selection of Platinum, Gold, or Silver tier with LGU subsidy verification.
  2. *Client & Family Profile:* Address with sitio/barangay landmarks, clinical baseline, and remote OFW sponsor configuration.
  3. *Five Service Request Triggers:*
     - Tele-Consultation
     - Medical Prescription Request
     - Non-Emergency Medical Transport (NEMT: time, source, destination)
     - Home-Based Barangay Caregiver (₱300 for 8 hours)
     - CVMC Institutional Caregiver (₱500 for 8 hours)
  4. *Reporting & Dashboards:* Live shift status, vitals feed, caregiver ratings, and historical ledgers.

### B. Agentic AI & n8n Orchestrator
- **Workflow Ingress:** Webhook endpoints receive structured app events or unstructured SMS keywords (`CARE 300`, `CARE CVMC`, `DOC`, `TRANS CVMC`).
- **Matching Logic:** Proximity radius (<3 km for rural barangay clusters), valid digital badges (`BADGE_ADL`, `BADGE_CVMC_WATCHER`), and historical family satisfaction score.
- **Fail-Safe & Escalation:** Automated timeout triggers escalate unaccepted shifts to the human coordinator on-call.

### C. Database & Spatial Engine
- PostgreSQL 16+ schema with relational integrity and PostGIS geometry.
- Append-only audit logs for all financial transactions, GCash references, and clinical triage interactions.

### D. Reporting & Analytics Engine
- Real-time generation of tabular ledgers (Service Requests, Caregiver Shifts, NEMT Trips, LGU Subsidy Reconciliation).
- Visual charts: SLA response adherence by zone, service utilization distribution, and medically attended episode ratio.

## 3. Frontend Implementation (as built, 2026-10-15)

- **Location:** `frontend/` — React 18 + Vite + TypeScript PWA, plain CSS tokens from `AdvanCare/AdvanCare-design-handoff/design-system/tokens.json`. HashRouter; ~100 KB gzip JS.
- **Layers:** `src/data/catalog.ts` (approved business rules + `DEPENDENCIES`), `src/data/demo.ts` (fixtures only), `src/services/api.ts` (the only network boundary), `src/state/AppState.tsx` (session, profile, requests, drafts, offline queue; localStorage `advancare.v1`).
- **Service modules in Services navigation:** TeleHealth (GP), RHU services (MD, DMD, nurse, midwife), Triage & referral (RHU, district hospital, CVMC, private), Medical prescription, Non-emergency transport (public/private vehicles), Home caregiver (₱300), CVMC caregiver (₱500).
- **Request lifecycle shown to users:** `saved-demo` (on device, not sent) → `queued` (offline) → `submitted` (API accepted) → `confirmed` → `in-progress` → `completed` / `cancelled`. Nothing is shown as sent unless the API accepted it.
- **Native apps (ADR-013):** Capacitor 8 shells in `frontend/ios` and `frontend/android` (app ID `ph.advancare.app`). Scripts: `npm run cap:sync` (build + copy web into both), `npm run ios` / `npm run android` (open in Xcode / Android Studio), `npm run assets` (icons + splash from `frontend/assets/`). `npm run ios:run` / `npm run android:run` build and install on a simulator/emulator without opening an IDE. Android builds need JDK 21 (Gradle 8.14 does not run on Java 25); `android/gradle/gradle-daemon-jvm.properties` makes Gradle pick an installed JDK 21 automatically.
- **Navigation rule:** main tabs = bottom nav, no Back; section pages = bottom nav with parent tab active (pass `nav="more"` etc. when the URL doesn't start with the tab); forms with a sticky ActionBar, print and signed-out screens = no nav.
- **Wired contracts:** ADV-AUTH-001 OTP endpoints and ADV-BOOK-001 `POST /api/v1/shifts/request`. All other services have no backend contract yet.

## 4. Backend Implementation (as built, 2026-10-15 — ADV-CORE-001)

- **Location:** `backend/` — Cloudflare Workers + Hono + TypeScript. System of record per ADR-006; integrity rules per ADR-007.
- **Database:** Neon project `curly-voice-70911282` (AWS ap-southeast-1 Singapore, Postgres 17, branch `production`, db `neondb`), linked via `backend/.neon` + `backend/neon.ts`; `neon deploy` pulls `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct) and `NEON_BRANCH` into `backend/.env`. Drizzle ORM over node-postgres (`pg`), Neon's recommended driver for Workers + Hyperdrive. `src/db/client.ts` prefers the `HYPERDRIVE` binding (production: Hyperdrive `advancare-neon` `11c3b46c749a4eb8acbe2b7c7df8d5da`, built from the **unpooled** URL since Hyperdrive pools itself, query caching disabled so clinical data is never stale) and falls back to pooled `DATABASE_URL` over SSL with a 10 s connect timeout. One client per request, closed before responding. Migrations (`db:migrate`) use the unpooled URL; `0000_core_schema` is applied to `production` (2026-10-15).
- **Schema (`src/db/schema.ts`, migration `drizzle/0000_core_schema.sql`):** `users`, `client_profiles`, `family_profiles`, `caregivers`, `shifts`, `care_notes`, `payments`, `idempotency_records`. All 12 foreign keys are RESTRICT. `shifts_rate_matches_tier` CHECK enforces ₱300/240/60 and ₱500/400/100 per 8 h. `vitals_recorded` is nullable with no default. Location is latitude/longitude for the pilot (PostGIS not yet enabled). Earlier DDL in the Obsidian data-model note is superseded.
- **Middleware:** request ID (`X-Request-Id`, reused if well-formed, logged as JSON per request), CORS restricted to `ALLOWED_ORIGINS` (allows the `Idempotency-Key` header), and a single error envelope `{ error: { code, message, requestId, details? } }`. Valibot validates every payload (422 `VALIDATION_FAILED`).
- **Endpoints:** `GET /api/v1/health` (200 only when `select 1` succeeds, else 503 with `database: unconfigured|error`), `POST /api/v1/storage/upload-url` (presigned R2 PUT signed over Content-Type and Content-Length, 15 min, keys `uploads/YYYY/MM/<uuid>.<ext>`), `GET /api/v1/storage/file/:key` (streams from the `UPLOADS` R2 binding, `Cache-Control: private, no-store`). Storage routes are not yet authenticated; ADV-AUTH-001 must gate them.
- **Cloudflare (account da540d8875bbbfb72853c034607292a6, shared with other projects; touch only `advancare-*`):** R2 buckets `advancare-uploads-dev` / `advancare-uploads` (location apac). `wrangler dev` binds the dev bucket remotely (`remote = true`) so presigned uploads and `/storage/file` hit the same bucket; Vitest sets `remoteBindings: false` and stays local. Dev bucket CORS (`backend/r2/cors.dev.json`) allows browser PUT from `localhost:5174`; the production bucket needs its own CORS once the frontend origin is known.
- **Care Assistant (ADR-010):** `POST /api/v1/assistant/chat` → `src/routes/assistant.ts` (validation, rate limit `ASSISTANT_LIMITER` 10/min, context loading) + `src/assistant/` (`knowledge.ts` approved facts and link whitelist, `prompt.ts` rules, `gemini.ts` structured-output client with fallback, `guard.ts` refusal/emergency text and redaction, `context.ts` availability counts and own-records query). `src/middleware/auth.ts` returns no user until ADV-AUTH-001, so no personal data reaches the model yet. Frontend `Assistant.tsx` answers emergencies and own-data questions locally; only general questions call the API (demo mode keeps on-device replies). Dev CORS also allows any `http://localhost:<port>`.
- **Secrets:** `backend/.env` locally (template `backend/.env.example` says where each key comes from; git-ignored), read by wrangler, drizzle-kit and Vitest. `wrangler secret put` when deployed. Do not also create `backend/.dev.vars`: wrangler ignores `.env` when it exists.
- **Commands:** `npm run build` (tsc + `wrangler deploy --dry-run`), `npm run db:generate`, `npm run db:migrate`, `npm test` (Vitest in workerd via `@cloudflare/vitest-plugin`; `vitest.config.ts` aliases `pg-protocol`/`pg-cloudflare` to their CommonJS builds, the renamed `vitest-pool-workers`; pinned to Vitest 4 because Vitest 5 fails under the plugin). When `backend/.env` has `DATABASE_URL`, the suite also runs the health test against that database.

## 5. Staff Console (as built, 2026-10-15 — ADR-011/012, phase A)

- **Plan:** `AdvanCare/Product/Admin Dashboard & Staff Accounts Plan.md`. Phases A (accounts foundation) and B (read-only operations dashboards) are done; C (actions + client link) and D (LGU subsidy/system) are not started.
- **Schema (migration `drizzle/0001_staff_accounts.sql`, applied to Neon `production` 2026-10-15):** `user_role` gains `SUPER_ADMIN`; `users.phone_number` is nullable only for staff (CHECK `users_phone_required_for_non_staff`); new `staff_credentials`, `staff_municipality_assignments` (history kept via `revoked_at`), `staff_sessions`, `staff_invitations` (`approved_by_user_id` for Super Admin invites), `staff_recovery_codes`, `audit_logs` (append-only trigger `audit_logs_append_only`). All FKs RESTRICT.
- **Backend:** `src/staff/` (crypto/HKDF keys, password, totp, challenge, recovery, sessions, factors, rules, profile, municipalities = the 29 Cagayan LGUs), `src/middleware/staff.ts` (`staffCsrf`, `withDb`, `requireStaff(role?)`), `src/audit.ts`, `src/routes/admin/` mounted at `/api/v1/admin`: `auth/*` (login → `mfa` | `mfa/setup` + `mfa/enroll`, `invitation`, `accept-invite`, `logout`), `me*` (profile, password, sessions, recovery codes, 2FA reset), `municipalities`, `audit` (Admins forced to their own entries; cursor paging), `accounts*` (Super Admin: list/detail, invite, renew/approve/revoke invite, PATCH status/scope, reset-mfa, unlock, sessions/revoke). Route guards are attached by path in `routes/admin/index.ts` (a sub-app `use('*')` would leak onto sign-in routes). Config: `ADMIN_ORIGINS`, `ADMIN_APP_URL`, `ADMIN_LOGIN_LIMITER` (wrangler.toml), secret `STAFF_ENCRYPTION_KEY`. CLI: `npm run admin:bootstrap -- --email … --name "…"` (Node type-stripping, writes to `DATABASE_URL_UNPOOLED`).
- **Admin app (`admin/`, port 5176, launch config `advancare-admin`):** React 18 + Vite + react-router 6 + `qrcode`; BrowserRouter; `src/api.ts` is the only network boundary (cookie + CSRF header). Pages: Login (password → code / enrollment), Accept invite, Overview (staff KPIs for Super Admins, attention list, recent activity), Admin accounts (+ invite modal), Admin detail (status, scope editor + history, invited-by and people-they-invited links, actions, audit by/about them), Audit log (filters in the URL), My account. Admins don't see Super Admin pages (route shows "Page not found"; API returns 403).
- **Tests:** `backend/test/staff.test.ts` (RFC 6238 vectors, password, AES-GCM, challenge tampering, cookie flags, account rules) and `test/admin.test.ts` (CSRF, credentialed CORS, 401s). Role × endpoint behaviour, lockout, suspension and audit were verified end to end against a throwaway local Postgres; there are no DB-backed integration tests in the suite yet.
- **Phase B (2026-10-15):** read-only dashboards on the existing tables, every query scoped by `scopeCondition()` / `assertInScope()` (`src/staff/scope.ts`; clients, shifts and payments by `client_profiles.municipality`, caregivers by `caregivers.municipality`). Routes: `routes/admin/operations.ts` (`GET /overview?range=7|30|90` KPIs, daily series in Asia/Manila days, by-service/by-status, waiting/escalated alerts; `GET /requests` ledger with filters `status` (incl. `WAITING`, `OPEN`), `tier`, `municipality`, `barangay`, `clientId`, `caregiverId`, `from`, `to`, `q` (name or REQ- ref), 50/page; `GET /requests/:id`; `GET /shifts?date=`), `routes/admin/people.ts` (`GET /clients`, `GET /clients/:id` audited, `POST /clients/:id/clinical-access {reason}` audited, `GET /caregivers`, `GET /caregivers/:id`), `routes/admin/money.ts` (`GET /payments`, `GET /exports/requests|payouts|payments` CSV, Excel-safe, audited, max 10,000 rows). References are derived from UUIDs (`REQ-xxxxxxxx`, `PAY-xxxxxxxx`). Admin app pages: Overview (KPI tiles, needs-attention list, bar lists, daily column chart with tooltip + table view; components in `admin/src/components/charts.tsx`), Requests (+ detail with progress, money split, payments, staff actions), Shifts board (by stage per day), Clients (+ detail with family, history, reason-gated clinical notes), Caregivers (+ detail), Payments, Reports. Filters live in the URL (`useUrlFilters` in `components/ops.tsx`). No SLA deadline yet (needs plan tiers from `subscriptions`, phase D); "waiting" shows time since request.
- **Local dev data & DB tests:** `SEED_DATABASE_URL=postgres://…localhost…/db npm run db:seed-demo` fills a local DB with fictional clients/caregivers/requests in Solana, Tuguegarao City, Peñablanca and Baggao (refuses non-local hosts). `TEST_LOCAL_DATABASE_URL=postgres://…localhost…/db npx vitest run` adds `test/admin-scope.test.ts` (role × scope matrix: out-of-scope → 404, municipality filter can't widen scope, no ID numbers/full phones, audited client view, clinical reason, scoped CSV export, suspended → 401). Homebrew Postgres 17 needs `LC_ALL=en_US.UTF-8` and a short socket dir (`-k /tmp/...`).
