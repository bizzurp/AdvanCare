---
status: in-progress (phase A done 2026-10-15)
date: 2026-10-15
---

# AdvanCare Admin Dashboard + Admin / Super Admin Accounts

## Context
AdvanCare has a client PWA (`frontend/`) and a Workers + Hono API on Neon (`backend/`), but no way for staff to run operations: nobody can see incoming requests, assign caregivers, reconcile payments, or manage who has access. The vault spec (`AdvanCare/Product/Reporting Engine & Dashboard Specifications.md`) defines an **LGU/RHU portal** and an **Operations Command Center**; the PWA only has a demo "coordinator" dashboard with sample data (`frontend/src/screens/Reports.tsx` → `Dashboard`).

Decisions (from you):
- **Separate desktop web app** `admin/` calling `backend` at `/api/v1/admin/*`.
- **Admin** is scoped to municipalities a Super Admin assigns; **Super Admin** sees everything.
- **Email + password + authenticator-app 2FA (TOTP)** for both staff roles.
- **Linked three ways:** Super Admin manages Admins (and who manages whom is recorded); every dashboard page drills down to its details; admin actions show up as status changes in the client app.

Outcome: a secure staff console where a Super Admin onboards and audits Admins, and Admins run day-to-day operations for their LGU, with every action audited.

---

## 1. Roles and permissions

| Capability | Admin (scoped) | Super Admin |
|---|---|---|
| Overview, Requests, Shifts, Clients, Caregivers, Payments, LGU subsidy, Reports | Own municipalities only | All |
| Assign caregiver / confirm / cancel / escalate request | ✓ (in scope) | ✓ |
| Accredit caregiver, set availability, edit badges | ✓ (in scope) | ✓ |
| Mark cash payment collected / payout disbursed | ✓ (in scope) | ✓ |
| View clinical data (care notes, vitals) | ✓, logged with a reason | ✓, logged with a reason |
| Export CSV/PDF | ✓ (in scope, logged) | ✓ |
| **Admin accounts**: invite, assign municipalities, suspend, reset 2FA, end sessions | ✗ | ✓ |
| **Audit log** (everyone's actions) | Own actions only | ✓ |
| **System**: pilot municipalities, integrations status, read-only rates | ✗ | ✓ |
| Create or promote a Super Admin | ✗ | ✓ (needs a 2nd Super Admin to confirm; the last one can't be removed) |

Rules enforced on the server, never just hidden in the UI:
- An out-of-scope record returns **404, not 403**, so Admins can't tell it exists.
- Admins can't change their own role or scope.
- Prices stay as database CHECK constraints (ADR-002). The dashboard shows them read-only; changing them means a migration plus an ADR.

## 2. Account system (backend)

**Migration `0001_staff_accounts`** (Drizzle, `backend/src/db/schema.ts`; every foreign key RESTRICT, per ADR-007):
- `user_role` enum: add `SUPER_ADMIN` (`ADMIN` already exists).
- `staff_credentials`: user_id (PK/FK) · email (unique, lowercased) · password_hash · totp_secret_enc · mfa_enabled · status (INVITED / ACTIVE / SUSPENDED) · failed_attempts · locked_until · created_by_user_id (FK users, the **"linked to who created them"** record) · last_login_at.
- `staff_municipality_assignments`: user_id · municipality · assigned_by · assigned_at · revoked_at (Admin scope; history kept).
- `staff_sessions`: id · user_id · token_hash · created_at · last_seen_at · expires_at · revoked_at · ip · user_agent.
- `staff_invitations`: email · role · municipalities · token_hash · invited_by · expires_at (72 h) · accepted_at.
- `staff_recovery_codes`: user_id · code_hash · used_at.
- `audit_logs` (append-only; a trigger blocks UPDATE/DELETE): actor_user_id · action · entity_type · entity_id · municipality · metadata jsonb (no clinical content) · ip · request_id · created_at.

**Auth flow** (new `backend/src/routes/admin/auth.ts`; helpers in `backend/src/staff/`):
1. `POST /admin/auth/login` {email, password}: PBKDF2-SHA256 (WebCrypto, OWASP iteration count). Returns a short-lived MFA challenge. Generic error message; lockout after 5 failures for 15 min; rate-limited per IP and per email (new `ADMIN_LOGIN_LIMITER`, same pattern as `ASSISTANT_LIMITER` in `wrangler.toml`).
2. `POST /admin/auth/mfa` {challenge, code}: TOTP per RFC 6238 (WebCrypto HMAC; secret AES-GCM-encrypted with the new secret `STAFF_ENCRYPTION_KEY`), or a one-time recovery code. Sets the session cookie.
3. **Session cookie:** `__Host-adv_staff`, a random opaque token stored only as a hash. HttpOnly, Secure, SameSite=Strict, 8 h absolute and 30 min idle. Revocable per session or per user.
4. **CSRF:** SameSite=Strict, an Origin check against the admin origin, and a required `X-AdvanCare-Staff: 1` header on every write.
5. `POST /admin/auth/logout` · `GET /admin/me` (role, scope, MFA state).
6. **Invite flow:**
   - A Super Admin sends `POST /admin/accounts/invite`. Until an email provider is connected, the invite link is shown once in the UI to copy.
   - The invitee sets a password at `POST /admin/auth/accept-invite` and enrolls 2FA at `POST /admin/auth/mfa/enroll`, which shows a QR code and 10 recovery codes.
   - Only then does the account become ACTIVE.
7. **Bootstrap:** the first Super Admin comes from a local CLI (`npm run admin:bootstrap -- --email you@…`) that writes directly to Neon and prints an invite link. There's **no public sign-up endpoint**.

**Authorization middleware** (`backend/src/middleware/staff.ts`):
- `requireStaff('ADMIN' | 'SUPER_ADMIN')` loads the session, rejects suspended or locked accounts, and sets `c.var.staff = { userId, role, municipalities | 'ALL' }`.
- One helper, `scopedClients(db, staff)`, which every admin query joins through `client_profiles.municipality IN (...)`, so scoping can't be forgotten per query.
- `audit(c, action, entity, metadata)` runs on every write and every sensitive read (opening a client, viewing clinical notes, exports, failed or successful logins).

**Reuse:**
- `validate()` (`src/lib/validation.ts`) and `ApiError` (`src/lib/errors.ts`).
- `connectDb()` (`src/db/client.ts`) and the CORS middleware (`src/middleware/cors.ts`). CORS needs `credentials: true` for the admin origin only, via a new var `ADMIN_ORIGINS`.
- Request-ID middleware.
- `authenticatedUserId` in `src/middleware/auth.ts` stays for clients (ADV-AUTH-001). Staff use a separate session system.

## 3. Dashboard contents (`admin/` app)

Desktop layout: left sidebar, a top bar with a **scope chip** (e.g. "Solana" or "All municipalities") and the user menu. Same design tokens as the PWA (copy `frontend/src/styles/tokens.css`).

| # | Page (route) | Contents | Links to (drill-down) |
|---|---|---|---|
| 1 | **Overview** `/` | KPIs: active clients, requests today, waiting for a caregiver, shifts in progress, SLA adherence, completed-shift revenue / payouts / margin, households by plan. Alerts: requests near their SLA deadline, escalations, caregivers with no availability. Charts: requests by service (donut), daily volume (7/30/90 days), SLA by zone. | Each KPI → **Requests** pre-filtered; each alert → that **Request**; chart segment → filtered **Requests** |
| 2 | **Requests** `/requests` | Service request ledger (spec Table 1): ID, time, client (masked), barangay, service, SLA deadline, assigned caregiver, status. Filters in the URL so views can be shared. | Row → **Request detail** |
| 2a | **Request detail** `/requests/:id` | Status timeline, client summary, schedule and location, rate split. Actions: **assign caregiver** (eligible = accredited, available, right badge, same municipality), confirm, cancel or escalate with a reason. | → **Client**, → **Caregiver**, → **Payment**, → its **audit entries** |
| 3 | **Shifts board** `/shifts` | Today's shifts by column: Requested → Matching → Confirmed → In progress → Completed; clock-in/out times. A map comes later (needs PostGIS). | Card → **Request detail** |
| 4 | **Clients** `/clients` | Registry: name, barangay, plan, active requests. Phone numbers masked (0917•••4567); PhilHealth hidden. | Row → **Client detail** |
| 4a | **Client detail** `/clients/:id` | Profile, family members and their permissions, plan and subsidy, request history. "View clinical notes" asks for a reason and writes an audit entry. | → **Requests** (this client), → **Payments**, → **Caregiver** per shift |
| 5 | **Caregivers** `/caregivers` | Roster: accreditation, badges, availability, rating, shifts completed, municipality. | Row → **Caregiver detail** |
| 5a | **Caregiver detail** `/caregivers/:id` | Shifts, payouts, ratings. Actions: accredit/suspend, set availability, badges. | → **Shifts**, → **Payments** (payouts) |
| 6 | **Payments** `/payments` | Shift and payout ledger (spec Table 2): gross / caregiver / platform, payment status, method, reference. Actions: mark cash collected, mark payout sent. | Row → **Request** and **Caregiver** |
| 7 | **LGU subsidy** `/subsidy` | Spec Table 4 per barangay: enrolled households, plan mix, billed, 50% LGU due, 50% household collected, SLA adherence. Quarterly export. | Barangay → **Clients** filtered |
| 8 | **Reports** `/reports` | CSV/PDF exports of tables 1, 2 and 4 within scope (reuse the Excel-safe `csvCell` from the PWA's `Reports.tsx`); every export is logged. | → source pages |
| 9 | **My account** `/account` | Change password, re-enroll 2FA, recovery codes, active sessions (sign out the others). | — |
| **Super Admin only** | | | |
| 10 | **Admin accounts** `/admins` | List: name, email, role, municipalities, status, 2FA on, last login, **invited by**. Actions: invite, assign or revoke municipalities, suspend/reactivate, reset 2FA, end all sessions, promote (needs a 2nd Super Admin). | Row → **Admin detail** → **Audit** filtered by that admin; "Invited by" → that Super Admin |
| 11 | **Audit log** `/audit` | Search by person, action, record, municipality or date. | Each entry → the **record** and the **person who did it** |
| 12 | **System** `/system` | Pilot municipalities; integration health (Neon, Hyperdrive, R2, Gemini, SMS) from a new `GET /admin/system/status`; read-only rates and plans (ADR-001/002). | → `/api/v1/health` details |

Not shown until their backend modules exist (no empty pages): NEMT trips, TeleHealth, RHU appointments, prescriptions. They're listed in TODO.

**Admin API** (`backend/src/routes/admin/*.ts`, all behind `requireStaff`, scoped and audited):
- `GET /admin/overview?range=` · `GET /admin/requests` · `GET|PATCH /admin/requests/:id` · `POST /admin/requests/:id/assign`
- `GET /admin/clients(/:id)` · `POST /admin/clients/:id/clinical-access`
- `GET /admin/caregivers(/:id)` · `PATCH /admin/caregivers/:id`
- `GET /admin/payments` · `PATCH /admin/payments/:id` · `GET /admin/subsidy` · `GET /admin/exports/:table`
- Super Admin: `GET|POST|PATCH /admin/accounts(/:id)` · `/admin/accounts/:id/sessions` · `GET /admin/audit` · `GET /admin/system/status`

## 4. Link to the client app
- Admin actions change real rows: `shifts.status` (REQUESTED → MATCHING → CONFIRMED with `caregiver_id` → IN_PROGRESS → COMPLETED / CANCELLED / ESCALATED) and payments.
- The PWA already models these statuses (`frontend/src/components/ui.tsx` `STATUS_META`, `screens/Requests.tsx` timeline). It needs a server read path: `GET /api/v1/shifts/mine`, which depends on **ADV-AUTH-001** (client login) and **ADV-BOOK-001** (requests reaching the database). `AppState` would refresh request statuses from it.
- **Notifications** (SMS or push when a caregiver is assigned) run later through n8n (ADR-006 async), triggered by the same audit events.
- The PWA's demo coordinator dashboard and the "Coordinator" demo switch in Settings are removed. The Reports tab keeps household records only. Staff use `admin/`.

## 5. Phases (each phase ships working)
- **A. Accounts foundation:** migration 0001, staff auth (login, 2FA, sessions, lockout), RBAC and scope middleware, audit writer, bootstrap CLI, `admin/` shell (login, 2FA enrollment, layout, My account), **Admin accounts + Audit pages**. *Result: Super Admin can onboard, scope, suspend and audit Admins.*
- **B. Read dashboards:** Overview, Requests (+ detail), Shifts board, Clients, Caregivers, Payments, Reports/exports, all on existing tables, scoped and with drill-down links.
- **C. Operations actions + client link:** assign/confirm/cancel/escalate, caregiver accreditation and availability, payment marking. Client `GET /shifts/mine` once ADV-AUTH-001/BOOK-001 land, so status changes appear in the PWA.
- **D. LGU subsidy & system:** `subscriptions` table (from the vault data model) + subsidy reconciliation, System status page, scheduled exports via n8n.

## 6. Files
- **New:**
  - Admin app: `admin/` (package.json, vite.config.ts, `src/` pages above, `src/api.ts` with `credentials: 'include'`)
  - Backend routes and logic: `backend/src/routes/admin/`, `backend/src/staff/` (password, totp, sessions, crypto), `backend/src/middleware/staff.ts`, `backend/src/audit.ts`
  - CLI and migration: `backend/scripts/bootstrap-admin.ts`, `backend/drizzle/0001_*.sql`
- **Modified:**
  - Backend: `backend/src/db/schema.ts`, `backend/src/env.ts`, `backend/src/index.ts` (mount `/admin`), `backend/src/middleware/cors.ts` (credentials for `ADMIN_ORIGINS`), `backend/wrangler.toml` (`ADMIN_LOGIN_LIMITER`, `ADMIN_ORIGINS`), `backend/.env.example` (`STAFF_ENCRYPTION_KEY`)
  - Frontend: `frontend/src/screens/Reports.tsx` + `Account.tsx` (remove the demo coordinator dashboard and role switch), local `advancare-admin` launch configuration
  - Brain docs: ADR-011 (staff accounts, RBAC, municipality scope, audit) and ADR-012 (separate admin app) in `.brain/DECISIONS.md`; update ARCHITECTURE, TODO and CHANGELOG
- **Deployment:** `admin/` as a Cloudflare static site on its own subdomain; optionally Cloudflare Access in front as a second lock in production.

## 7. Verification
- **Backend Vitest:**
  - **Auth basics:** password hashing round-trip; TOTP against RFC 6238 test vectors; lockout after 5 failures; generic login errors; cookie flags.
  - **Sessions:** idle and absolute expiry; CSRF (missing header or wrong Origin → 403).
  - **Permissions (role × endpoint):** an Admin gets 403 on Super Admin routes; an out-of-scope record gets 404; Admins can't escalate themselves; the last Super Admin can't be suspended.
  - **Audit log:** a row is written for every write and sensitive read, and UPDATE/DELETE on `audit_logs` fails.
- **Manual browser check against Neon:**
  1. Bootstrap a Super Admin, sign in with password + 2FA.
  2. Invite an Admin scoped to Solana; accept the invite in a second browser and enroll 2FA.
  3. The Admin sees only Solana data; a Tuguegarao request URL returns "not found".
  4. Assign a caregiver; the action appears in the Audit log and links to the record and the person.
  5. Suspend the Admin: their open session ends immediately.
- `npm run build` passes in `admin/`, `backend/` and `frontend/`; `npm test` passes in `backend/`. In phase C, the PWA shows the status change after the Admin confirms.
