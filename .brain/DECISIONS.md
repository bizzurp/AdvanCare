# advanCARE: Architectural & Strategic Decisions (Operational Brain)

## ADR-001: 50% LGU Subsidy + 50% Household Out-of-Pocket Co-Pay Model
- **Status:** Accepted
- **Context:** Relying solely on municipal government subsidies creates vulnerability to election cycles and fiscal freezes; relying solely on impoverished farmers/fishers (31.6% poverty rate) causes churn.
- **Decision:** Adopt Auxilio Care's multi-payer blended model. Total annual cost is capped below PhilHealth's minimum floor (₱500/mo), split equally between LGU and household.
- **Consequences:** If an LGU delays payment, households drop to lower tiers or shift to pay-per-shift instead of suffering abrupt service termination.

## ADR-002: Fixed Flat Rates for Caregiver Shifts (₱300 / ₱500)
- **Status:** Accepted
- **Context:** Variable hourly pricing causes confusion and friction in rural grassroots communities.
- **Decision:**
  - Standardize **Home-Based Barangay Caregiver at ₱300 for an 8-hour shift** (₱240 net caregiver pay / ₱60 platform margin).
  - Standardize **CVMC Institutional Caregiver at ₱500 for an 8-hour shift** (₱400 net caregiver pay / ₱100 platform margin) for dedicated hospital bedside watcher duties at Cagayan Valley Medical Center.
- **Consequences:** Predictable budgeting for households and guaranteed dignified local income for youth caregivers.

## ADR-003: Agentic AI Orchestration via n8n Over Monolithic Custom Backends
- **Status:** Accepted
- **Context:** Building custom microservices for every dispatch, triage, SMS routing, and reporting workflow introduces high development overhead and fragile codebases during early pilot stages.
- **Decision:** Deploy **n8n** as the central event-driven orchestration engine, leveraging visual workflow graphs, native LLM tool-calling (Gemini), and pre-built SMS/Postgres/Webhook nodes.
- **Consequences:** Rapid iteration of business logic, low infrastructure footprint, and transparent visual monitoring of active workflows.

## ADR-004: Dual-Channel Ingress (Mobile App PWA + SMS Fallback)
- **Status:** Accepted
- **Context:** Cellular data connectivity in remote Cagayan sitios (e.g., Peñablanca, Baggao) can be intermittent, and some elderly clients rely on 2G feature phones.
- **Decision:** The primary client interface is a low-bandwidth, offline-tolerant PWA, backed by an SMS Gateway parsing structured keywords (`CARE 300`, `CARE CVMC`, `DOC`, `TRANS CVMC`) directly into the n8n request queue.
- **Consequences:** Ensures zero exclusion for non-smartphone households and uninterrupted operations during adverse weather.

## ADR-005: Dedicated NEMT Module as Clinical Risk Prevention
- **Status:** Accepted
- **Context:** 56.3% of deaths in Cagayan in 2020 occurred without medical attendance, driven primarily by physical transit barriers.
- **Decision:** Adopt Centene Corporation's model of treating Non-Emergency Medical Transport (NEMT) as a core clinical benefit rather than an incidental taxi service.
- **Consequences:** Closes the distance gap between remote sitios and CVMC/RHUs, directly reducing preventable emergency hospitalizations.

## ADR-006: Workers + Hyperdrive + Neon as the System of Record; n8n Is Async Only
- **Status:** Accepted (2026-10-15, ADV-CORE-001)
- **Context:** ADR-003 put n8n at the centre of orchestration. Bookings, payments and care notes need transactional writes, idempotent retries, input validation and one place that enforces the ₱300/₱500 rules. A visual workflow engine is the wrong owner for that.
- **Decision:** `backend/` is a Cloudflare Workers + Hono API (`/api/v1`) and the only writer to PostgreSQL (Neon). Deployed Workers reach Neon through a Hyperdrive binding; when no binding exists (local dev, tests) they connect directly with `DATABASE_URL` over SSL with a 10 s connect timeout. Schema and migrations are owned by Drizzle (`backend/src/db/schema.ts`, `backend/drizzle/`). n8n stays for asynchronous work only (SMS, matching suggestions, summaries, reports), triggered by API events, and writes back through the API, never straight to the database. Files go to R2 through 15-minute presigned PUTs (JPEG/PNG ≤ 5 MB, PDF ≤ 10 MB).
- **Consequences:** ADR-003 is narrowed: n8n no longer decides or stores the outcome of a request. Every client write path, including SMS ingress, goes through the API, so validation and idempotency (`Idempotency-Key`, `idempotency_records`) live in one place.

## ADR-007: No Cascading Deletes and No Default Clinical Values
- **Status:** Accepted (2026-10-15, ADV-CORE-001)
- **Context:** The draft DDL in `AdvanCare/Architecture/Data Models & Entity Schemas.md` used `ON DELETE CASCADE` and defaulted `care_notes.vitals_recorded` to "normal" readings (120/80, 72 bpm, 36.5 °C). Deleting a user would silently erase shifts, care notes and payments, and an unmeasured patient would look healthy.
- **Decision:** Every foreign key is `ON DELETE RESTRICT ON UPDATE RESTRICT`. Clinical fields have no defaults: `vitals_recorded` and `clinical_baseline` are NULL until someone records them, and an unmeasured vital is null, never a placeholder. Caregivers get no badges or rating by default. ADR-002 is enforced in the database: a CHECK constraint allows only 8 h shifts at 300/240/60 or 500/400/100.
- **Consequences:** Records are retired (`is_active`, status, `cancelled_at`), never hard-deleted through a parent. Removing data (e.g. a Data Privacy Act erasure request) needs an explicit, audited procedure. The DDL in the Obsidian data-model note is superseded by `backend/src/db/schema.ts`.

## ADR-010: Care Assistant — Scoped, Server-Guarded Gemini With Local-First Personal Data
- **Status:** Accepted (2026-10-15)
- **Context:** The Care Assistant should answer real questions using AdvanCare data, but it handles health-adjacent conversations, the Gemini key belongs to a shared AI Studio project, and no server-side sign-in exists yet (ADV-AUTH-001).
- **Decision:** `POST /api/v1/assistant/chat` (backend) calls Gemini (`gemini-3.5-flash-lite`, fallback `gemini-3.1-flash-lite`) with structured JSON output. The model only sees approved public facts (`backend/src/assistant/knowledge.ts`), aggregate caregiver availability counts from Neon, and — once auth exists — the signed-in user's own shift summaries with whitelisted fields (user id from the server session only). The server, not the model, enforces: fixed off-topic refusal, fixed 911 text for emergencies, link whitelist, output redaction (phones, emails, PhilHealth numbers, keys, connection strings), 500-char/12-turn input caps, 16 KB body limit, 10 requests/min per caller, metadata-only logging. In the app, emergencies and questions about the user's own requests/profile/reports are answered on the device and never sent to the AI.
- **Consequences:** No clinical advice, no cross-user data and no secrets can come from the model even under prompt injection, because it never receives them. Free-tier Gemini may train on prompts: before real client conversations, switch to an AdvanCare-owned, billing-enabled key. `knowledge.ts` must be updated whenever ADR-001/002 prices or services change.

## ADR-011: Staff Accounts — Email + Password + TOTP, Municipality Scope, Append-Only Audit
- **Status:** Accepted (2026-10-15; phase A built)
- **Context:** Operations staff need a console, but nobody could see requests, manage access or prove who did what. Staff handle personal and clinical data across LGUs, so access must be narrow, revocable and traceable.
- **Decision:** Two staff roles in `users.role`: `ADMIN` (sees only the municipalities a Super Admin assigns, `staff_municipality_assignments`) and `SUPER_ADMIN` (everything, plus staff accounts and the full audit log). Sign-in is email + password (PBKDF2-SHA256 at 100,000 iterations, the Workers maximum) + an authenticator app (RFC 6238 TOTP; secret AES-GCM-encrypted with a key derived from `STAFF_ENCRYPTION_KEY`; replayed codes refused; 10 single-use recovery codes). Five wrong passwords or codes lock the account for 15 minutes; `ADMIN_LOGIN_LIMITER` adds 10 attempts/min per IP and per email. Sessions are opaque cookies stored as SHA-256 hashes (`__Host-adv_staff`, HttpOnly, Secure, SameSite=Strict; 30 min idle, 8 h absolute) and are re-checked on every request, so suspension, a 2FA reset or a revoked session takes effect immediately. Writes also need an admin `Origin` and the `X-AdvanCare-Staff: 1` header. No public sign-up: the first Super Admin comes from `npm run admin:bootstrap`; everyone else is invited (72 h single-use link, token in the URL fragment). A Super Admin invite sent from the console needs a second Super Admin's approval; the last active Super Admin can't be suspended; nobody can change their own role, scope or status. Every write and sensitive read goes to `audit_logs`, which a trigger makes append-only (no UPDATE/DELETE/TRUNCATE) and which never stores clinical content or secrets.
- **Consequences:** Losing `STAFF_ENCRYPTION_KEY` forces every staff member to re-enroll 2FA. Because `audit_logs` and its user rows can't be deleted, test staff accounts should go in a throwaway database or Neon branch, not the shared one. Phase B queries must filter through the Admin's municipalities on the server (out-of-scope records → 404). Phase B (built 2026-10-15) applies this through `backend/src/staff/scope.ts` and adds privacy defaults: ledgers show short names ("Juan C.") and masked phones; government ID numbers never leave the server (only "on file"); clinical notes need a typed reason each time (`client.clinical_viewed`, reason stored); opening a client and every CSV export are audited. DB-backed tests and demo data run only against a local throwaway Postgres (`TEST_LOCAL_DATABASE_URL`, `db:seed-demo` refuses non-local hosts).

## ADR-012: Separate Staff Console App (`admin/`)
- **Status:** Accepted (2026-10-15)
- **Context:** The PWA is a mobile, offline-first client app that ships to app stores. A staff console has different users, a desktop layout, and stricter session rules.
- **Decision:** `admin/` is its own React + Vite app calling `backend` at `/api/v1/admin/*`. Credentialed CORS is allowed only for `ADMIN_ORIGINS`; in development Vite proxies `/api` so the cookie is first-party. It reuses the PWA's design tokens but none of its code. Deploy as a static site on its own subdomain (optionally behind Cloudflare Access).
- **Consequences:** No staff code or data ships inside the client apps. Two frontends to build and deploy. The PWA's demo coordinator dashboard is to be removed once phase B lands.

## ADR-013: Native iOS and Android Apps via Capacitor
- **Status:** Accepted (2026-10-15)
- **Context:** The PWA works, but families expect an installable app from the App Store / Play Store, and native access (camera, push, secure storage, SMS-code autofill) will matter.
- **Decision:** Wrap the existing React app with Capacitor 8 (app ID `ph.advancare.app`, name AdvanCare). `frontend/ios` (Xcode, Swift Package Manager) and `frontend/android` (Gradle) are generated projects that load the bundled `dist/` build; the PWA keeps working on the web from the same code. Inter is bundled (`@fontsource/inter`) so text renders offline; the service worker is skipped inside the native apps. Icons/splash are generated from `frontend/assets/` (heart emblem from the master logo) with `npm run assets`.
- **Consequences:** One codebase for web, iOS and Android. After any web change: `npm run cap:sync`. When the API is connected, add the native origins `capacitor://localhost` (iOS) and `https://localhost` (Android) to `ALLOWED_ORIGINS`. Store release needs an Apple Developer account, a Play Console account, signing keys and a privacy policy. The app ID is permanent once published.

## ADR-009: Mobile PWA Frontend With an Explicit Demo-Mode Boundary
- **Status:** Accepted (2026-10-15)
- **Context:** The design handoff (29 screens) arrived before any backend existed. Most service journeys (TeleHealth, RHU, Triage, Transport, Prescription) have no API contract, and clinical triage rules are not approved.
- **Decision:** Build `frontend/` as a React + Vite PWA. All network calls go through `src/services/api.ts`; requests without a deployed contract are stored on the device as "Saved on device" with a visible dependency note, never as sent or confirmed. Demo fixtures are isolated in `src/data/demo.ts`. Triage collects information for clinician review only and assigns no urgency or destination.
- **Consequences:** The UI is reviewable end-to-end now. Removing demo mode means setting `VITE_API_BASE_URL` and adding contracts per service in `api.ts`.
