# advanCARE: Project Roadmap & Action Items (Operational Brain)

Legend: ⬜ to do · 👤 needs the owner (account, decision or paperwork) · ✅ done. Last verified against the code: 2026-11-15.

## Open — blockers

- ✅ **Resolve committed merge-conflict markers.** Merge `8eb7e1f` (2026-11-04) left `<<<<<<<`/`>>>>>>>` blocks in ~23 source files (e.g. `backend/wrangler.toml`, `backend/src/db/schema.ts`, `backend/src/env.ts`, `backend/src/assistant/knowledge.ts`, `backend/drizzle/meta/_journal.json`, `frontend/src/App.tsx`, `frontend/src/data/catalog.ts`, `admin/src/pages/Services.tsx`, `admin/src/pages/Home.tsx`, `admin/src/components/RequestActions.tsx`). The backend, families' app and console cannot build from `main` until these are resolved (the `72d5a43` side carries the 2026-10-28 supplies / per-IP rate-limit work). Find them with `grep -rln '^<<<<<<< ' backend frontend/src admin/src`. — done 2026-11-16: resolved all 67 conflict blocks across all 31 conflicted files in favor of parent `72d5a43` (preserving 2026-10-28 supplies/staff-flow/per-IP-limiter changes, 2026-10-29 password toggle, and 2026-10-30 handoff updates) and verified backend, frontend, and admin builds, typechecks, and tests.
- ⬜ Deploy the 2026-10-28 changes (migration `0007_discounted_supplies` on the demo branch, API, app and console Pages) once the conflicts are resolved; see CHANGELOG.

## Open — prototype

- ✅ App timeline: a request that is only Confirmed shows "Shift in progress · current step" (progress mapping in `frontend/src/screens/Requests.tsx`) — review wording. — done 2026-11-16: mapped `saved-demo`/`queued`/`submitted` to step 0, `confirmed` to step 1, `in-progress` to step 2, and `completed` to 4 with status-specific step captions (`STEP_CAPTION`) and `aria-current="step"`.
- ⬜ Plans (Silver/Gold/Platinum) stored on the server (`subscriptions`, console phase D); LGU subsidy report (Table 4); SLA deadlines and adherence on the Overview once tiers exist; System status page; scheduled exports.
- ⬜ Staff "promote to Super Admin" with second-Super-Admin approval (only invites exist now).
- ⬜ Offline: encrypted on-device storage (Dexie + WebCrypto or native secure storage) replacing `localStorage` `advancare.v1` (ADV-FE-001).
- ⬜ Email provider for staff invite links (they are copied from the UI for now).
- ⬜ DB-backed integration tests for the role × endpoint matrix and lockout in CI (needs a disposable Postgres/Neon branch).
- ⬜ Tele-Consultation voice memo input (not built).
- ⬜ Keep `backend/src/assistant/knowledge.ts` in sync with price/service changes.
- ✅ Update the Obsidian data-model note (`AdvanCare_Vault/Architecture/Data Models & Entity Schemas.md`): its DDL still shows CASCADE and default vitals (superseded by ADR-007). — done 2026-11-16: updated ERD, DDL (all 19 tables, enums, indexes, CHECK constraints, and triggers across migrations `0000`–`0007` with `ON DELETE RESTRICT ON UPDATE RESTRICT` and nullable `clinical_baseline`/`vitals_recorded`/`average_rating`), and API payload examples to match `backend/src/db/schema.ts`.
- ⬜ Demo reviewer Super Admin (`demo.reviewer@demo.advancare.test`) and QA family `qa.family@demo.advancare.test` exist only on the demo branch; remove with the branch.

## Open — before real use

- 👤 Switch the live API's production Hyperdrive back from `advancare-neon-demo` to `advancare-neon` (see `DEPLOY.md` / `TESTING-DASHBOARD.md`); `backend/.env` also points at the Neon `demo-advancare` branch. Delete the branch to remove all demo data.
- 👤 Replace the borrowed AI Studio Gemini key with an AdvanCare-owned, billing-enabled key (`wrangler secret put GEMINI_API_KEY --env production`).
- 👤 Add a second real Super Admin via `npm run admin:bootstrap -- --additional` once the email/name are provided.
- 👤 Real account holders: verify email sign-in/booking, console session after reload, booking appearing in staff, and prescription photo upload/viewing.
- 👤 Confirm real partner-pharmacy prices and member discount (pilot estimates: 20% off, `frontend/src/data/catalog.ts`).
- 👤 Native releases: Apple Developer + Google Play Console accounts, signing keys, privacy policy, store listings; native plugins as needed (camera, push, secure storage).

## Open — program decisions (ADR-017)

- 👤 Confirm with Fernando Jaminola Jr.: caregiver revenue model (5% commission per `/Docs` vs ADR-002 80/20 enforced in DB); Gold transport SLA (deck says urban 2 h / rural 1 h); real donation channels before any payment details go on the site.
- ⬜ Align app-side copy with `/Docs` once confirmed: `backend/src/assistant/knowledge.ts` (plan SLAs, stats), frontend plan screens.
- ⬜ Resolve pilot financing: ADR-001 (50/50 LGU subsidy) vs prompt pack (100% out-of-pocket for the pilot). UI currently follows ADR-001.
- 👤 Approve a clinical triage protocol and emergency danger-sign list (no urgency/routing logic exists until then).
- 👤 Confirm the pilot RHU service list and verified facility directory (district hospitals, private clinics).
- 👤 Decide whether the "Specialized caregiver ₱500 home" tier from the mockups is approved (shown disabled).
- 👤 Assign the care support hotline number (Help screen uses a placeholder).
- 👤 Legal review of the Data Privacy Act consent wording.

## Open — website

- ⬜ Deploy the updated `website/` (`npm run build`, then publish `dist/`; `website/wrangler.toml` names Pages project `advancare-website`). The contact form is still not wired to any backend.
- ✅ `website/node_modules` is committed with Windows-only esbuild/rollup binaries, so `npm run dev` fails on macOS; untrack it and reinstall. — done 2026-11-16: untracked with `git rm -r --cached website/node_modules`, added `website/node_modules/` to `.gitignore`, reinstalled macOS dependencies with `npm install`, and verified `npm run build` in `website/`.

## Later (not needed for the prototype)

- ⬜ GCash/Maya online payments · SMS codes (Semaphore/Twilio; only the delivery in `routes/auth.ts` changes) and SMS keyword booking · push notifications · NEMT trip tracking/maps (PostGIS) · Tagalog/Ilocano/Ybanag screen translations.
- ⬜ n8n (ADR-006: async only, writes back through the API): self-hosted n8n with PostgreSQL; workflows for triage & intake, proximity matching (Honor-inspired ranking), tele-consult routing, prescription & DoH Yakap logistics, NEMT routing, care-note summaries to families, automated LGU reporting/billing; SMS gateway webhook for offline keyword fallback.

### Community & operations (Cagayan fieldwork)
- 👤 Draft and execute an MOU with the pilot municipality and barangays (`/Docs`: 2 remote barangays in Peñablanca, 30–50 households; earlier internal plan named Solana or Tuguegarao with 2–3 barangays).
- 👤 Recruit the first pilot cohort of 15–20 youth caregivers through Barangay Health Worker (BHW) partnerships.
- 👤 Conduct the 40-hour Grassroots Caregiver Academy training & badge issuance (`BADGE_ADL`, `BADGE_CVMC_WATCHER`).
- 👤 Establish a pharmacy liaison with a Tuguegarao wholesale distributor for non-Yakap medicines.
- 👤 Finalise the bedside watcher coordination protocol with CVMC nursing administration (coordination letter).

## Done

### Prototype roadmap P1–P4 (2026-10-16 to 2026-10-22)
- ✅ P1 care loop: staff add/accredit/suspend caregivers, badges, availability; assign (ranked candidates with blockers/warnings), unassign, cancel, escalate, all audited; caregiver mode in the app (My shifts, clock in/out, care notes with measured vitals only); family sees care notes, caregiver first name and Paid; emails on assignment/cancellation; staff record cash/GCash/Maya/bank payments and payouts; server enforces the 12-hour booking lead time (2026-10-16). This also completed console phase C and ADV-FE-002 (caregiver field UI).
- ✅ Demo environment: Neon branch `demo-advancare` seeded with fictional data (2026-10-16). The two seeded demo Admin invites (Solana, Tuguegarao) expired ~2026-10-18; reset via console → Reset 2-step / new invite if needed.
- ✅ P2: `service_requests` + uploads for TeleHealth, RHU, Triage, Prescription, Transport; staff inbox/detail/schedule/complete/cancel with audited file viewing; families withdraw/edit until scheduled; uploads signed-in, content-checked, owner-only `/storage/*` (2026-10-16).
- ✅ Multi-provider: doctors & transport drivers roster, candidate ranking, assignment to TeleHealth & Transport (2026-10-16/17); universal TeleHealth across 29 LGUs; service ratings and unfulfilled-service reports (2026-10-17).
- ✅ P3 online prototype: API on Workers (`advancare-api.mcleinonza0531.workers.dev`), families' app and console on Cloudflare Pages (ADR-016); production origins incl. Capacitor (`capacitor://localhost`, `https://localhost`) in `ALLOWED_ORIGINS`; seven production secrets (incl. R2 keys, Gmail SMTP) uploaded; migrations `0000`–`0004` verified by hash; production bucket CORS not needed for API-mediated uploads; `DEPLOY.md` runbook (2026-10-16).
- ✅ P4: PWA demo mode, demo labels and coordinator switch removed (2026-10-16); live API, Pages and Vercel sites on the Neon demo branch (2026-10-16); public website built (2026-10-17) and realigned to `/Docs` (2026-10-22, ADR-017).

### Phase 0 setup (2026-10-15)
- ✅ Mobile app (React + Vite PWA in `frontend/`, design handoff applied): registration, plan selector, client/family profiles, all service request UIs, request tracking, offline queue, reports/CSV.
- ✅ Backend ADV-CORE-001: Workers + Hono API, Drizzle schema + migrations, Neon project (Singapore), Hyperdrive `advancare-neon`, R2 buckets + dev CORS + API token, presigned upload/download verified.
- ✅ Care Assistant on Gemini (ADR-010); `authenticatedUserId` resolves the app session.
- ✅ Native apps (ADR-013): Capacitor iOS + Android, icons, splash; iOS simulator and Android (JDK 21, Pixel 9 emulator) verified.
- ✅ App sign-in & booking (ADR-014): email 6-digit codes via Gmail SMTP, 30-day sessions, `/clients/sync`, idempotent `/shifts/request`, `/shifts/mine`; migration `0002` applied.
- ✅ Staff console phase A (accounts, 2FA, audit) and phase B (operations dashboards); first production Super Admin enrolled; real bookings flow into the console.
- ✅ API contracts for TeleHealth, RHU, Triage, Transport, Prescription (delivered in P2).
- ✅ 2026-10-28: discounted pharmacy & supplies service, simpler staff actions, per-IP sign-in limits (code on the `72d5a43` side of the conflicted merge; not yet deployed).
