# AdvanCare deployment runbook

> **Current live data (2026-10-16):** the API uses the Neon **demo branch** through Hyperdrive `advancare-neon-demo`, so the live sites show fictional demo data. To serve the real production database, set `[[env.production.hyperdrive]] id` in `backend/wrangler.toml` back to `11c3b46c749a4eb8acbe2b7c7df8d5da` and redeploy the API. Test accounts and scripts: `TESTING.md`.

The online prototype uses Cloudflare Workers for the API and Cloudflare Pages Direct Upload for both web apps. App stores and native releases are deferred.

| Component | Production URL | Configuration |
| --- | --- | --- |
| API | https://advancare-api.mcleinonza0531.workers.dev | `backend/wrangler.toml`, environment `production` |
| Staff console | https://advancare-admin.pages.dev | `admin/wrangler.toml`, `admin/public/_worker.js` |
| Families’ web app | https://advancare-app.pages.dev | `frontend/wrangler.toml` |

Cloudflare account: `da540d8875bbbfb72853c034607292a6` (shared; change only `advancare-*`). Existing production bindings: Hyperdrive `advancare-neon` / `11c3b46c749a4eb8acbe2b7c7df8d5da`, R2 `advancare-uploads`, and three rate limiters. Hyperdrive targets Neon project `curly-voice-70911282`, branch `production`; caching is disabled.

Production already has an enrolled staff account. The existing staff encryption key was verified against that account and retained. Do not replace it as part of redeployment: doing so breaks enrolled authenticators. All seven required secret names were uploaded to the API; values stay private. No `DATABASE_URL` Worker secret is needed because Hyperdrive is bound. All five existing migrations (`0000` through `0004`) were verified by hash on production; no migration was needed for the first release. Local `backend/.env` remains on the demo branch and was not changed.

These projects use manual Direct Upload, with `main` as the production branch. Pushing Git alone does not publish a new web build. Keep source changes committed before normal future releases.

## Publish an update

Each code block contains one command. Start at the repository root. `backend/node_modules` supplies the pinned Wrangler version used for both Pages deployments.

1. **Check the intended source and credentials.**

   ```sh
   git status --short --branch
   ```

   If account access has expired, change into `backend/` and run `npx wrangler login` before continuing. Never print `.env`, put secrets into command arguments or commit them. No backend secret belongs in either web build or any `VITE_*` variable.

2. **Handle database changes only when a release adds migrations.** Privately obtain the production pooled/direct URLs and verify the Neon project and production branch before running a migration. Local `.env` currently points at `demo-advancare`, so do not run `db:migrate` against it expecting a production change. Use the direct production URL through private environment configuration and take a restore point first. From `backend/`, with the production URLs configured privately:

   ```sh
   npm run db:migrate
   ```

   Check that every migration in `backend/drizzle/` is applied to production. An API rollback does not undo database changes. Return to the repository root afterward.

3. **Build and deploy the API.**

   ```sh
   cd backend
   ```

   ```sh
   CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false npm run build
   ```

   ```sh
   CLOUDFLARE_ACCOUNT_ID=da540d8875bbbfb72853c034607292a6 CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false npm run deploy
   ```

   Disabling dotenv loading keeps local demo/development settings out of the deployment. Production secrets are already stored in Cloudflare separately. Confirm the target is `advancare-api` with the production Hyperdrive, bucket and rate limiters.

   ```sh
   curl --fail-with-body https://advancare-api.mcleinonza0531.workers.dev/api/v1/health
   ```

   Check HTTP 200, `status: "ok"`, `environment: "production"` and database source `hyperdrive`. A newly published route may need a short propagation interval.

4. **Build, test and publish the staff console.**

   ```sh
   cd ../admin
   ```

   ```sh
   VITE_API_BASE_URL='' npm run build
   ```

   ```sh
   node --test test/pages-proxy.test.mjs
   ```

   ```sh
   CLOUDFLARE_ACCOUNT_ID=da540d8875bbbfb72853c034607292a6 CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false ../backend/node_modules/.bin/wrangler pages deploy dist --project-name advancare-admin --branch main
   ```

   Check https://advancare-admin.pages.dev/login and a direct protected-page URL: they must return the app shell. Check https://advancare-admin.pages.dev/api/v1/health returns the API JSON with `status: "ok"`. `/api/v1/admin/me` must return JSON 401 when signed out. Sign in with an existing staff account and reload a protected page to check the live session cookie. Do not copy cookie values, passwords, authenticator secrets or recovery codes into logs or chat.

5. **Build and publish the families’ web app.**

   ```sh
   cd ../frontend
   ```

   ```sh
   VITE_API_BASE_URL=https://advancare-api.mcleinonza0531.workers.dev npm run build
   ```

   ```sh
   CLOUDFLARE_ACCOUNT_ID=da540d8875bbbfb72853c034607292a6 CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false ../backend/node_modules/.bin/wrangler pages deploy dist --project-name advancare-app --branch main
   ```

   Check https://advancare-app.pages.dev opens the app, its built JavaScript uses the production API URL, and `/sw.js` returns `Cache-Control: no-cache`. The app uses HashRouter and needs no additional SPA rewrite.

6. **Complete the authenticated smoke test with real account holders.** Request a family sign-in code, verify email delivery, complete a profile, and book a caregiver shift at least 12 hours ahead. Confirm it appears in the staff console, and that staff remain signed in after a reload. Submit a prescription photo and check staff can open it. These checks send email and create real production records: use agreed pilot accounts. Initial deployment verification covered public rendering, production database health, API forwarding, Origin/CORS enforcement, security headers and service worker caching; it did not send sign-in emails or create production bookings.

## Routing, headers and limitations

- The console keeps `VITE_API_BASE_URL` empty. `admin/public/_worker.js` forwards `/api` and `/api/*` to the fixed API origin, preserving methods, query strings, request bodies, Origin/Cookie and response Set-Cookie. Redirects are returned without following them. The unchanged `__Host-adv_staff` cookie therefore belongs to the console origin (HttpOnly, Secure, Path=/, SameSite=Strict, no Domain).
- `admin/public/_routes.json` invokes the Function only for API paths; Pages serves static assets and its default SPA fallback. The console Wrangler config enables `global_fetch_strictly_public` so public Worker-to-Worker fetch works. The proxy cannot accept a destination from callers.
- Both web apps apply nosniff, no-referrer, DENY framing and Permissions-Policy through their `_headers` files. Function responses receive the console headers explicitly because Pages static headers do not apply to Functions. API proxy responses use `Cache-Control: no-store`; family camera/geolocation are allowed only for self and microphone is disabled.
- API writes still require the console’s exact production Origin and `X-AdvanCare-Staff: 1`; no auth logic changed. Preview/deployment hostnames are outside `ADMIN_ORIGINS`, so staff sign-in/writes must use the stable production URL. Proxy infrastructure can affect per-IP limits; per-email limits and the five-strike lockout remain. Never trust caller-supplied IP headers.
- Families call the API directly using Bearer auth. `ALLOWED_ORIGINS` includes the family Pages origin and the existing Capacitor origins. Current prescription uploads go through the API to R2; no browser-to-bucket CORS change is required.
- Vercel configuration is retained as an alternative and its rewrite points at the real Worker. Vercel is not the active hosting provider. Moving there requires updating production `ALLOWED_ORIGINS`, `ADMIN_ORIGINS` and `ADMIN_APP_URL`, rebuilding the families’ app, and retaining the empty console API base.
- The installed Wrangler version can redirect creation of a new Pages project into a Worker deployment. Both named Pages projects now exist and ordinary `pages deploy` targets them directly. Do not recreate them from the backend directory. If a project must be recreated, use Cloudflare’s Pages dashboard/API and verify its resource type before uploading. The unintended `advancare-admin` Worker created while discovering this behavior was removed; the staff console is an actual Pages project.

See [Pages advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/), [Pages headers](https://developers.cloudflare.com/pages/configuration/headers/) and [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## Secrets and staff access

The API has these production secret names: `STAFF_ENCRYPTION_KEY`, `SMTP_USER`, `SMTP_PASSWORD`, `GEMINI_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. For an intentional update, use the interactive command from `backend/`, replacing `<NAME>` with the required name:

```sh
npx wrangler secret put <NAME> --env production
```

Email uses `advancare.noreply@gmail.com`, its Gmail App Password, implicit TLS at `smtp.gmail.com:465`, and sender name `AdvanCare`. Production refuses sign-in mail when SMTP credentials are absent. Keep the existing staff encryption key stable; the first deployment deliberately preserved it because production already had an enrolled account.

Sign in to the staff console with the existing staff account. Creating additional staff requires their intended email/name. To bootstrap a second real Super Admin, from `backend/` with the production database configured privately:

```sh
ADMIN_APP_URL=https://advancare-admin.pages.dev npm run admin:bootstrap -- --additional --email '<second admin email>' --name '<second admin name>'
```

Share the printed single-use invitation privately with that person, who sets their own password and authenticator. The initial pair needs bootstrap because a console-issued Super Admin invitation requires another active Super Admin’s approval. No additional accounts or password changes were made as part of deployment.

## Rollback

- **API:** from `backend/`, use the previous known-good version once one exists:

  ```sh
  npx wrangler rollback --env production
  ```

  Confirm the target is `advancare-api`. Check the selected version is application code, not the draft created during initial secret setup. Repeat health and the affected smoke checks. Rollback does not restore local source, database migrations or dependent resources.
- **Web apps:** Cloudflare dashboard → Workers & Pages → the actual `advancare-admin` or `advancare-app` Pages project → Deployments → an older successful production deployment → **Rollback to this deployment**. Then verify the stable production URL and API connectivity. If no earlier working release exists, rebuild the last known-good committed source and upload it using the commands above. See [Pages rollbacks](https://developers.cloudflare.com/pages/configuration/rollbacks/).
- **Database:** stop writes and review data impact before restoring through Neon’s dashboard. API or Pages rollback does not revert schema or bookings.
- **Source:** commit the correction or revert locally as well; cloud rollback alone does not change what the next manual build publishes.
