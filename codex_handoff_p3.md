# Codex hand-off — P3: put the AdvanCare prototype online

**Owner:** McLein (the human) · **Prepared:** 2026-10-16 · **Scope:** deployment config only

You are preparing AdvanCare to run online so families (phone/web), caregivers and staff can use it
away from the developer's Mac. Do the **code/config work** below. Every step that needs the owner's
Cloudflare login, secrets or a decision is marked **👤 OWNER** — prepare it, then stop and tell the
owner exactly what to run. Do not run those yourself.

---

## 0. Before you start (stop if any fails)

1. **P2 must be committed.** Run `git status`. If there are uncommitted changes under `backend/`,
   `admin/` or `frontend/` (P2 — service requests and uploads — was in progress in another agent's
   session), **stop** and tell the owner. Do not edit, stash, reset or commit someone else's work.
2. **Read first:** `AGENTS.md` (workspace rules), `.brain/ARCHITECTURE.md`, `.brain/DECISIONS.md`
   (ADR-006, 011, 012, 013, 014), `.brain/TODO.md` (section "P3 — Online prototype").
3. **Database target.** `backend/.env` may currently point at the Neon **demo branch**
   (`NEON_BRANCH="demo-advancare"`, host `ep-orange-union-…`). Production is host
   `ep-silent-unit-azpc7kp8…` (its lines are kept as `#` comments). **Never print `.env` values.**
   Tell the owner to switch `.env` back to production before any migration step (👤 OWNER).

## 1. Ground rules

- Never read aloud, print, log, commit or paste secrets (`backend/.env`, tokens, passwords, keys).
- Do not run `wrangler login`, `wrangler secret put`, `wrangler deploy`, `wrangler pages deploy`,
  `npm run db:migrate` against Neon, or any command that changes the cloud — write them into the
  owner checklist instead.
- Do not change app features, database schema, auth logic or tests beyond what this file asks.
- Keep changes small and reviewable; match the existing code style and comment density.
- Cloudflare account is shared with other projects: only touch resources named `advancare-*`.
- Commit messages: one short, simple line (owner's preference), e.g. `Add production deploy config`.

## 2. What exists today (facts)

| Part | Location | Notes |
|---|---|---|
| API | `backend/` — Cloudflare Workers + Hono | `wrangler.toml` has `[env.production]` with Hyperdrive `11c3b46c749a4eb8acbe2b7c7df8d5da`, R2 `advancare-uploads`, 3 rate limiters; `vars` `ALLOWED_ORIGINS`, `ADMIN_ORIGINS`, `ADMIN_APP_URL` are **empty strings** (must be filled). `npm run deploy` = `wrangler deploy --env production`. |
| Families' app | `frontend/` — React + Vite PWA, also Capacitor iOS/Android | Talks to the API with a **Bearer token** (no cookies) → cross-origin is fine. API base = build-time `VITE_API_BASE_URL`. HashRouter (no SPA rewrites needed). |
| Staff console | `admin/` — React + Vite | Uses a **cookie session** (`__Host-adv_staff`, `SameSite=Strict`, `Secure` outside development) + `X-AdvanCare-Staff: 1` header + Origin check against `ADMIN_ORIGINS`. In dev, Vite proxies `/api` to the API. BrowserRouter → needs SPA fallback to `index.html`. API base = build-time `VITE_API_BASE_URL` (empty = same origin). |
| Database | Neon project `curly-voice-70911282` ("Advancare"), branch `production` | Production must have **all** migrations in `backend/drizzle/` (0000–0004 after P2). |
| Email | Gmail SMTP (`smtp.gmail.com:465`), sender `advancare.noreply@gmail.com` | Needs `SMTP_USER` + `SMTP_PASSWORD` (App Password) as secrets. Production refuses to send sign-in codes without them. |

## 3. The one real problem to solve: the staff console cookie

`SameSite=Strict` cookies are only sent when the page and the API are the **same site**.
`advancare-admin.pages.dev` and `advancare-api.<account>.workers.dev` are **different sites**, so the
console would sign in and then immediately look signed out. Pick one (ask the owner if unclear —
default to **A** when they have no domain):

- **A. No custom domain (default): proxy through Pages Functions.** Add
  `admin/functions/api/[[path]].ts` that forwards every `/api/*` request (method, headers, body,
  query) to the API's production URL from a Pages env var `API_ORIGIN`, and returns the response
  unchanged (including `Set-Cookie`). The console then calls `/api/...` on its own origin
  (`VITE_API_BASE_URL` stays empty), exactly like the dev Vite proxy. Keep the browser's `Origin`
  header as sent (the API checks it against `ADMIN_ORIGINS`). Known limitation to note in the docs:
  the API sees the proxy's IP in `CF-Connecting-IP`, so per-IP sign-in rate limits apply to the
  proxy; per-email limits and the 5-strike lockout still work. Do **not** "fix" this by trusting a
  client-supplied IP header.
- **B. Custom domain (if the owner has one, e.g. `advancare.ph`):** API on `api.<domain>` (Worker
  custom domain), console on `admin.<domain>`, app on `app.<domain>`. Same site → no proxy;
  `VITE_API_BASE_URL=https://api.<domain>` for both web apps.

## 4. Tasks

### 4.1 API (`backend/`)
1. In `wrangler.toml` `[env.production].vars`, fill (using placeholders the owner confirms):
   - `ALLOWED_ORIGINS` = families' web app origin + native app origins
     `capacitor://localhost,https://localhost` (ADR-013), comma-separated.
   - `ADMIN_ORIGINS` and `ADMIN_APP_URL` = staff console origin (e.g. `https://advancare-admin.pages.dev`).
   - Add `MAIL_FROM_NAME = "AdvanCare"` (and `SMTP_HOST`/`SMTP_PORT` if you prefer vars over the code defaults).
   If the real URLs aren't known yet, use the Pages default names below and say so in the checklist.
2. Do **not** add `remote = true` or any dev setting to production; keep secrets out of the file.
3. Make sure `npm run build` (typecheck + dry-run deploy) passes.

### 4.2 Staff console (`admin/`)
1. Implement option **A** (or **B**) from §3.
2. Add `admin/public/_redirects` with `/* /index.html 200` for BrowserRouter routes (keep `/api/*`
   handled by the Function — Functions take precedence over `_redirects`).
3. Add security headers via `admin/public/_headers` for `/*`: `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
   Optional: a strict Content-Security-Policy that still allows the app's own scripts/styles and
   `data:` images (the 2-step QR code is a data URL) — test it before keeping it.
4. `npm run build` must pass.

### 4.3 Families' app (`frontend/`)
1. Document/build with `VITE_API_BASE_URL=<API production URL>` (Pages build env var).
2. Add `frontend/public/_headers` with the same safe headers (no `X-Frame-Options` change needed
   beyond `DENY`; camera must stay **allowed** for prescription photos: `Permissions-Policy:
   camera=(self), microphone=(), geolocation=(self)`).
3. Note in the checklist: after the API URL is final, native builds need
   `VITE_API_BASE_URL=… npm run cap:sync` (and later store signing — out of scope).

### 4.4 Deploy guide
Write `DEPLOY.md` at the repo root: a numbered, copy-pasteable checklist for the owner covering
everything in §5, which values go where, how to verify each step, and how to roll back
(`wrangler rollback`, Pages "Rollback to this deployment"). Plain language; one command per code block.

### 4.5 Docs
Update `.brain/ARCHITECTURE.md` (new "Deployment" section), `.brain/TODO.md` (tick what you did in
"P3 — Online prototype", leave owner steps open) and `.brain/CHANGELOG.md`. Add an ADR to
`.brain/DECISIONS.md` only if you chose between A/B or made another real decision.

## 5. 👤 OWNER steps (put these in DEPLOY.md; do not run them)

1. `npx wrangler login` (once).
2. Switch `backend/.env` back to **production**, then apply migrations: `cd backend && npm run db:migrate`.
3. Secrets for the API (`cd backend`, each one prompts for the value — type it, don't paste into chat):
   - `npx wrangler secret put STAFF_ENCRYPTION_KEY --env production` → a **new** value from
     `openssl rand -base64 32` (never the local one).
   - `npx wrangler secret put SMTP_USER --env production` and `… SMTP_PASSWORD …` (Gmail App Password).
   - `npx wrangler secret put GEMINI_API_KEY --env production`.
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (only used by the presigned-upload route).
   - `DATABASE_URL` is **not** needed in production (Hyperdrive is bound).
4. Deploy the API: `cd backend && npm run deploy` → note the URL it prints.
5. Create two Cloudflare Pages projects from the GitHub repo (`bizzurp/AdvanCare`):
   - `advancare-app`: root `frontend`, build `npm run build`, output `dist`, env `VITE_API_BASE_URL=<API URL>`.
   - `advancare-admin`: root `admin`, build `npm run build`, output `dist`, env `API_ORIGIN=<API URL>`
     (option A) or `VITE_API_BASE_URL=https://api.<domain>` (option B).
6. Put the final Pages URLs into `wrangler.toml` production vars if they differ from the placeholders,
   redeploy the API.
7. Create the real Super Admin against production:
   `cd backend && ADMIN_APP_URL=<console URL> npm run admin:bootstrap -- --email <your email> --name "<Your Name>"`,
   open the printed link, set password + authenticator. Then invite a second Super Admin.
8. Optional: protect the console with Cloudflare Access (allow only staff emails).

## 6. Done when

- `npm run build` passes in `backend/`, `admin/` and `frontend/`; `npm test` passes in `backend/`.
- `DEPLOY.md` exists and the owner can follow it top to bottom without guessing.
- After the owner's steps: `GET <API URL>/api/v1/health` returns `"status":"ok"`; the families' app
  signs in by email code and books; the staff console signs in (password + 2-step) **and stays signed
  in** after a page reload (proves the cookie setup); the console shows the booking.
- Nothing secret is committed (`git diff` and `git log -p` contain no keys, passwords or connection strings).

## 7. Report back to the owner

A short summary: what you changed (files), which option (A/B) you implemented, the exact list of
👤 OWNER commands left, and anything you were unsure about. Don't claim anything is deployed — you
didn't deploy it.
