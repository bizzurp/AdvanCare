# advanCARE: Technical Notes & Operational Knowledge (Operational Brain)

## 1. Local Clinical & Geographic Dynamics (Cagayan Province)
- **Hospital Anchor:** Cagayan Valley Medical Center (CVMC) in Carig Sur, Tuguegarao City is the regional referral center. Bedside watcher duty is a mandatory cultural and practical requirement in public wards. The ₱500/8hr CVMC caregiver offering directly solves the dilemma of farming/fishing families needing to work while a relative is hospitalized.
- **Health Coverage Reality:** 56% of deaths in Cagayan in 2020 had no medical attendant (PSA 2020; earlier notes said 56.3% — public material uses the `/Docs` figure). Non-emergency transport barriers and lack of out-of-hospital triage are the primary culprits.
- **Language Considerations:** While Tagalog and English are understood, older farmers and fishers in Cagayan predominantly speak **Ilocano** or **Ybanag**. Audio prompts, SMS templates, and caregiver matching must accommodate these dialects.

## 2. Payer & Financial Calibration
- **PhilHealth Anchor:** The legal floor for PhilHealth premiums is ₱500/month (₱6,000/year). advanCARE's pricing (Platinum ₱350/mo, Gold ₱250/mo, Silver ₱150/mo) is strategically positioned below this statutory cost.
- **50% LGU Subsidy:** Local Government Units in the Philippines have dedicated Local Health Board and GAD (Gender and Development) / Senior Citizen / PWD funds that can legally co-finance these community subscriptions.
- **OFW Remittance Channel:** Cagayan has a high proportion of families with members working overseas (Hong Kong, Singapore, Middle East, Canada). Targeting these diaspora family members with the Mobile App's real-time care notes unlocks sustainable private willingness-to-pay.

## 3. n8n Automation Best Practices
- Keep n8n workflow executions lean by using Webhook responses immediately (`200 OK`) and processing heavy LLM prompts or SMS notifications asynchronously in sub-workflows.
- Use PostgreSQL as the single source of truth; never store state solely in n8n memory.
- Enforce dead-letter queues on SMS and webhook nodes to catch transient network failures in rural cell towers.

## 4. Phone Assistant Rollout (2026-10-19)
- New native builds sent `language` to an older deployed strict API schema, producing HTTP 422 and the unavailable-AI reply. Deploy the matching backend whenever the assistant request contract changes.
- The assistant client timeout is now 35 seconds for two 12-second provider attempts plus context loading. Other requests retain 15 seconds. The iOS web assets were rebuilt and synchronized.
- Production testing also exposed intermittent provider HTTP 400 responses from the primary model. The server now attempts the configured fallback for model/region rejection (400/404), with sanitized failure-category logging only.
- Verified deployed version `558a45e6-4d46-4d37-ad69-74612d395128`: native-origin English, Tagalog and Ilocano chat requests each returned HTTP 200 with matching-language replies (~1.8 seconds). All 44 assistant tests and both type checks pass. Provider failure diagnostics do not log response bodies or conversation content.

## 5. Reading `/Docs` (2026-10-22)
- `Docs/AdvanCare.pdf` (~18 slides, ~31 MB; replaced with an updated version 2026-11-04) is image-only: text extraction returns nothing. Render pages (e.g. PyMuPDF in a scratch venv) and read the images. The brochure and Gantt PDFs have extractable text; the budget is a PNG.
- The deck's illustrations show a typical rural persona, not identified patients (brochure footnote). Keep that caveat when reusing them.

## 6. Git History Rewrite (2026-11-09)
- `main` was rewritten and force-pushed to remove 11 `Co-Authored-By: Claude` trailers from commits dated 2026-10-16. Authors, dates and file contents are unchanged, but 35 commit IDs changed (old tip `413ea7d` → new `0e8adb9` before this note).
- Any clone made before 2026-11-09 has diverged. Re-sync with `git fetch && git reset --hard origin/main` (after saving local work), not `git pull`, or the old commits come back.
- A full pre-rewrite backup is on the owner's Mac: `~/git-backups/2026-11-09/AdvanCare-before-history-rewrite.bundle`.
- `Docs/Advancare.mp4` (205 MB) is git-ignored because it is over GitHub's 100 MB file limit. It exists only locally.
- Commit rule: no AI co-author trailers or AI mentions in commit messages.

## 7. Repository & Tooling Gotchas (verified 2026-11-15)
- **Conflicted merge on `main`:** merge `8eb7e1f` (2026-11-04) joined two parallel histories (the `716314f` line and the `72d5a43` line, which repeat most 2026-10-16 to 10-26 commits under different IDs) and committed unresolved conflict markers in ~23 source files and in `backend/wrangler.toml`. Builds and deploys from `main` fail until resolved; the brain files' own markers were cleaned 2026-11-15. Tracked in TODO.md (blockers).
- **Live API is on demo data:** `[env.production]` in `backend/wrangler.toml` binds Hyperdrive `advancare-neon-demo`; `backend/.env` points at the Neon `demo-advancare` branch (production lines kept as comments). Switch both before real use.
- **Releases are manual:** Cloudflare Pages projects are Direct Upload; Git pushes do not deploy. The installed Wrangler can turn a Pages-create command into a Worker deployment; verify the target type (ARCHITECTURE section 9).
- **`website/node_modules` is committed** with Windows-only esbuild/rollup binaries, so `npm run dev` fails on macOS until it is untracked and reinstalled.
- **Backend tests:** pinned to Vitest 4 (Vitest 5 fails under `@cloudflare/vitest-plugin`); `vitest.config.ts` blanks SMTP so tests never send real email. DB-backed suites need `TEST_LOCAL_DATABASE_URL` on a local Postgres; Homebrew Postgres 17 needs `LC_ALL=en_US.UTF-8` and a short socket dir.
- **Android builds need JDK 21** (Gradle 8.14 does not run on Java 25); after any web change run `npm run cap:sync` in `frontend/`.
- **Brochure generation** reads fonts from `ADVANCARE_FONT_DIR` (default `tmp/pdfs/brochure/fonts`).

## 8. Merge Conflict Resolution for `8eb7e1f` (2026-11-16)
Merge `8eb7e1f` (2026-11-04) joined `716314f` (`HEAD`, stopping at the 2026-10-26 team-photos state) and `72d5a43` (which started from the matching 2026-10-26 `4afff82` state and added commits `3808717`, `8b3844d`, `986ec42`, and `72d5a43`). Because the two branches had parallel rewritten commit IDs back to `86a2578`, Git produced 67 conflict blocks across 31 files even though `716314f` had no post-2026-10-26 changes in any of those 31 files. Per-file resolution (kept the `72d5a43` side in every block):

- `AdvanCare_Vault/.obsidian/app.json` — kept `72d5a43` (`8b3844d`): retains `userIgnoreFilters` for design-handoff reference docs and assets instead of `{}`.
- `AdvanCare_Vault/.obsidian/graph.json` — kept `72d5a43` (`8b3844d`): retains the 6 Obsidian graph `colorGroups` instead of an empty array.
- `AdvanCare_Vault/.obsidian/workspace.json` — kept `72d5a43`: references `AdvanCare-design-handoff/IMPLEMENTATION-BRIEF.md` instead of the old `CLAUDE-PROMPT.md` name.
- `AdvanCare_Vault/AdvanCare-design-handoff/SHA256SUMS.txt` — kept `72d5a43` (`72d5a43`): retains checksums for `IMPLEMENTATION-BRIEF.md`, `START-HERE.md`, `index.html`, and `reference/Implementation Plan.md` (`shasum -a 256 -c` verified).
- `AdvanCare_Vault/AdvanCare-design-handoff/START-HERE.md` — kept `72d5a43` (`72d5a43`): points readers to `IMPLEMENTATION-BRIEF.md`.
- `AdvanCare_Vault/AdvanCare-design-handoff/index.html` — kept `72d5a43` (`72d5a43`): links to `IMPLEMENTATION-BRIEF.md` ("UI implementation brief") matching its checksum in `SHA256SUMS.txt`.
- `AdvanCare_Vault/Product/Admin Dashboard & Staff Accounts Plan.md` — kept `72d5a43` (`72d5a43`): removes the obsolete `.claude/launch.json` reference.
- `admin/src/api.ts` — kept `72d5a43` (`3808717`): includes `'supplies'` in `ServiceKind`.
- `admin/src/components/Icon.tsx` — kept `72d5a43` (`986ec42`): includes `'eye-closed'` in `IconName` for the password reveal toggle.
- `admin/src/components/Layout.tsx` — kept `72d5a43` (`3808717`): lists "Pharmacy & supplies orders" in the sidebar note.
- `admin/src/components/RequestActions.tsx` — kept `72d5a43` (`3808717`): uses the single highlighted "Next step" flow (`next`), removes the "Start matching" button, and renames "Unassign" / "Escalate" to "Remove caregiver" / "Flag for coordinator".
- `admin/src/components/ui.tsx` — kept `72d5a43` (`986ec42`): imports `Icon` and adds the show/hide password toggle (`input-wrap` / `input-reveal`) to `Field`.
- `admin/src/format.ts` — kept `72d5a43` (`3808717`): adds `supplies: 'Pharmacy & supplies'` to `SERVICE_KIND_LABEL`.
- `admin/src/pages/Home.tsx` — kept `72d5a43` (`3808717`): loads open service requests, adds the "Service requests waiting for staff" card (`WaitingServices`), clarifies the caregiver attention heading, refreshes `services` on reload/assign, and uses `SERVICE_STATUS` labels in the Telehealth queue.
- `admin/src/pages/Services.tsx` — kept `72d5a43` (`3808717`): adds "Pharmacy & supplies" to the subtitle, parses `"Label: value"` lines in `DetailsList`, drives actions and `StatusModal` copy from `SERVICE_FLOW`, and hides the Assigned Provider block for service kinds without providers unless one is assigned.
- `admin/src/styles/app.css` — kept `72d5a43` (`986ec42`): keeps `.input-wrap` and `.input-reveal` styles for password fields.
- `backend/drizzle/meta/_journal.json` — kept `72d5a43` (`3808717`): keeps journal entry `idx: 7` (`0007_discounted_supplies`).
- `backend/src/assistant/knowledge.ts` — kept `72d5a43` (`3808717`): adds `/services/supplies` link and Pharmacy & supplies description, updates sign-in copy to email 6-digit codes, and states that bookings reach the care team while online payments and SMS remain unintegrated.
- `backend/src/db/schema.ts` — kept `72d5a43` (`3808717`): includes `'supplies'` in `SERVICE_KINDS` and in the `service_requests_kind` CHECK constraint.
- `backend/src/env.ts` — kept `72d5a43` (`3808717`): adds `ADMIN_LOGIN_IP_LIMITER` and `CLIENT_AUTH_IP_LIMITER` bindings alongside per-email limiters.
- `backend/src/routes/admin/services.ts` — kept `72d5a43` (`3808717`): adds `supplies: 'Pharmacy & supplies'` to `KIND_LABEL`.
- `backend/src/routes/auth.ts` — kept `72d5a43` (`3808717`): checks `CLIENT_AUTH_IP_LIMITER` for IP and `CLIENT_AUTH_LIMITER` for email separately in `limit()`.
- `backend/src/staff/factors.ts` — kept `72d5a43` (`3808717`): checks `ADMIN_LOGIN_IP_LIMITER` for IP and `ADMIN_LOGIN_LIMITER` for email separately in `limitSignIn()`.
- `backend/wrangler.toml` — kept `72d5a43` (`3808717`): defines `CLIENT_AUTH_IP_LIMITER` (`1004`, 200/min) and `ADMIN_LOGIN_IP_LIMITER` (`1005`, 100/min) in default and `[env.production]` environments.
- `frontend/src/App.tsx` — kept `72d5a43` (`3808717`): imports `Supplies` and mounts `/services/supplies`.
- `frontend/src/data/catalog.ts` — kept `72d5a43` (`3808717`): adds the `supplies` entry in `SERVICES`, the `SUPPLIES` catalogue (`MEMBER_DISCOUNT = 0.2`), and `DEPENDENCIES.supplies`.
- `frontend/src/data/types.ts` — kept `72d5a43` (`3808717`): adds `'supplies'` to `ServiceKind`.
- `frontend/src/screens/Reports.tsx` — kept `72d5a43` (`3808717`): groups `['prescription', 'supplies']` under `'Pharmacy'` in `DONUT`.
- `frontend/src/screens/Requests.tsx` — kept `72d5a43` (`3808717`): adds the `supplies` status timeline steps in `STEPS`.
- `frontend/src/services/api.ts` — kept `72d5a43` (`3808717`): adds `'supplies'` to `SERVICE_KINDS`.
- `tmp/pdfs/brochure/build_brochure.py` — kept `72d5a43` (`72d5a43`): reads `ADVANCARE_FONT_DIR` from `os.environ` (defaulting to `tmp/pdfs/brochure/fonts`) instead of a machine-specific plugin cache path.
