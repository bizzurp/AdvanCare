# AdvanCare online prototype — owner checklist

P3 prepares the configuration only. Nothing has been deployed by this change. Every login, secret, production database write, push and cloud change below is for the owner to run.

The API stays on Cloudflare Workers (`backend/`). Vercel hosts two Vite projects from `bizzurp/AdvanCare`: `advancare-app` (`frontend/`) and `advancare-admin` (`admin/`). The URLs in `backend/wrangler.toml` are placeholders based on those project names. Confirm the URLs Vercel actually assigns; a custom domain is optional.

Only manage Cloudflare resources named `advancare-*`; this account is shared. Keep secret values, connection strings, passwords, invitation links and recovery codes out of Git, screenshots, chat and logs. Use the interactive secret prompts below, never put secret values in commands. `DATABASE_URL` is **not** a Worker secret here: production already has Hyperdrive `11c3b46c749a4eb8acbe2b7c7df8d5da` (`advancare-neon`). The R2 bucket `advancare-uploads` and three rate limiters are already bound.

Run the numbered steps in order. Each code block contains one command. The steps say when to change folders. If a release fails, use the rollback instructions at the end and repeat its checks.

1. **Log in to Cloudflare.** Start in the backend folder:

   ```sh
   cd /Users/mclein/Documents/Developer/Personal_Projects/AdvanCare/backend
   ```

   ```sh
   npx wrangler login
   ```

   Check: the browser reports success and the selected account contains the existing `advancare-neon` and `advancare-uploads` resources. Subsequent Worker commands must target `advancare-api`. Do not create or change other projects' resources.

2. **Switch the local database configuration to production and apply every migration.** Privately edit `backend/.env`: deactivate the demo branch entries and activate the commented production entries for `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and `NEON_BRANCH`. Confirm in Neon that both URLs belong to project `curly-voice-70911282`, branch `production`, rather than `demo-advancare`. Clear any previously exported database variables that would override this file. Leave `.env` ignored and never print its contents. Take a production restore point using Neon's dashboard before migrating.

   Still in `backend/`:

   ```sh
   npm run db:migrate
   ```

   Check: Drizzle finishes without errors and every migration in `backend/drizzle/` is applied to production (currently `0000` through `0004`). Recheck the branch selection before any later bootstrap command. An API rollback does not undo migrations; see the database rollback note below.

3. **Set production secrets.** Still in `backend/`, generate a NEW staff encryption key. On this Mac, copy the generated value to the clipboard without printing it:

   ```sh
   openssl rand -base64 32 | pbcopy
   ```

   Save it privately in a password manager and paste it into the following prompt. Keep it stable after staff enroll: replacing it makes their authenticators unusable.

   ```sh
   npx wrangler secret put STAFF_ENCRYPTION_KEY --env production
   ```

   Use `advancare.noreply@gmail.com` for `SMTP_USER` and its Gmail App Password for `SMTP_PASSWORD`. Enable Gmail 2-Step Verification and create an App Password if needed. The mailer already defaults to `smtp.gmail.com:465` with TLS and uses `SMTP_USER` as the sender; production vars set the sender name to `AdvanCare`. Production refuses to send sign-in codes without both SMTP secrets.

   ```sh
   npx wrangler secret put SMTP_USER --env production
   ```

   ```sh
   npx wrangler secret put SMTP_PASSWORD --env production
   ```

   ```sh
   npx wrangler secret put GEMINI_API_KEY --env production
   ```

   Use R2 credentials scoped to `advancare-uploads` (and the existing `advancare-uploads-dev` bucket if reusing its scoped token).

   ```sh
   npx wrangler secret put R2_ACCOUNT_ID --env production
   ```

   ```sh
   npx wrangler secret put R2_ACCESS_KEY_ID --env production
   ```

   ```sh
   npx wrangler secret put R2_SECRET_ACCESS_KEY --env production
   ```

   Check: each command confirms the named secret on `advancare-api`; use the Cloudflare dashboard to check secret names only. Do not add `DATABASE_URL` as a secret or copy development settings into production. No secret belongs in a `VITE_*` variable.

4. **Deploy the API for the first time.** Still in `backend/`:

   ```sh
   npm run deploy
   ```

   Check: the deployed Worker is `advancare-api`, using the production Hyperdrive, R2 bucket and three rate limiters. Note the HTTPS URL printed by Wrangler: `https://advancare-api.<account-subdomain>.workers.dev`. This is the **API URL** for every remaining step; use it without a trailing slash or `/api` suffix.

   Replace `REPLACE_ME` in this health check with the real account subdomain:

   ```sh
   curl --fail-with-body https://advancare-api.REPLACE_ME.workers.dev/api/v1/health
   ```

   Check: HTTP 200 with `status: "ok"` and the database check `status: "ok"`. A 503 means database configuration or connectivity still needs attention.

5. **Put the real API URL into the console proxy and push the configuration.** Edit `admin/vercel.json`: replace `https://advancare-api.REPLACE_ME.workers.dev` with the API URL from step 4, leaving `/api/:path*` in place. This destination must be literal: `vercel.json` rewrites cannot read environment variables. Keep the API rewrite before the SPA fallback.

   Return to the repository root:

   ```sh
   cd ..
   ```

   ```sh
   git diff --check
   ```

   ```sh
   git diff -- admin/vercel.json
   ```

   ```sh
   git add admin/vercel.json
   ```

   ```sh
   git commit -m "Set API proxy URL"
   ```

   ```sh
   git push origin main
   ```

   Check: GitHub `bizzurp/AdvanCare` has the P3 configuration and the real proxy URL on `main`; no `REPLACE_ME` remains in the rewrite and no secret or `.env` was staged. If working on another branch, merge the reviewed changes into the Vercel production branch before continuing.

6. **Create the two Vercel projects.** On [vercel.com](https://vercel.com), import GitHub `bizzurp/AdvanCare` twice, using `main` as the production branch:

   | Setting | Families' app | Staff console |
   | --- | --- | --- |
   | Project name | `advancare-app` | `advancare-admin` |
   | Root Directory | `frontend` | `admin` |
   | Framework Preset | Vite | Vite |
   | Build Command | `npm run build` | `npm run build` |
   | Output Directory | `dist` | `dist` |
   | Production environment variables | `VITE_API_BASE_URL` = the API URL | None; leave `VITE_API_BASE_URL` unset/empty |
   | Expected production URL | `https://advancare-app.vercel.app` | `https://advancare-admin.vercel.app` |

   Set the families' build variable before deploying; changing it later requires a rebuild/redeploy. Remove any inherited non-empty `VITE_API_BASE_URL` from the console. No Cloudflare, Neon, Gmail or Gemini secret belongs in either Vercel project.

   Check: both builds succeed; the families' app opens; a direct visit to the console's `/login` returns the app. Open `<console URL>/api/v1/health`: it must return API JSON with `status: "ok"`, not the console HTML or a 404/502. Both apps should send `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `X-Frame-Options: DENY`. Check their configured `Permissions-Policy` too; the families' app allows its own camera/geolocation, while the console allows neither. `<families URL>/sw.js` must return `Cache-Control: no-cache`.

7. **Confirm actual Vercel origins.** If Vercel assigns different production URLs, edit only the production vars in `backend/wrangler.toml`: set `ALLOWED_ORIGINS` to the families' exact HTTPS origin plus `capacitor://localhost,https://localhost`; set both `ADMIN_ORIGINS` and `ADMIN_APP_URL` to the console's exact HTTPS origin. No trailing slash, path or wildcard. Commit and push this adjustment from the repository root:

   ```sh
   git add backend/wrangler.toml
   ```

   ```sh
   git commit -m "Set production app origins"
   ```

   ```sh
   git push origin main
   ```

   ```sh
   cd backend
   ```

   ```sh
   npm run deploy
   ```

   Check: health still returns `ok`; families' API calls receive CORS permission for their exact origin, and console writes pass the Origin check. If the expected URLs were assigned, skip the edits and redeploy, then change into `backend/` for step 8. Current prescription photos upload through `POST /api/v1/uploads`, which writes to the R2 binding: **no production bucket CORS change is needed for this flow**. If a future client directly uses presigned R2 PUTs, the owner must configure CORS on `advancare-uploads` for its exact origins before using that separate flow.

8. **Create the real Super Admin and a second Super Admin.** In `backend/`, confirm `.env` still selects production. Replace the email and name placeholders below; if Vercel assigned another console URL, use it in `ADMIN_APP_URL` too:

   ```sh
   ADMIN_APP_URL=https://advancare-admin.vercel.app npm run admin:bootstrap -- --email '<owner email>' --name '<name>'
   ```

   Privately open the printed single-use link (valid 72 hours). Set a password and enroll an authenticator; store recovery codes privately. The invite token is in the URL fragment and must stay private.

   To invite the second real Super Admin, use the existing bootstrap option:

   ```sh
   ADMIN_APP_URL=https://advancare-admin.vercel.app npm run admin:bootstrap -- --additional --email '<second admin email>' --name '<second admin name>'
   ```

   Share that invitation privately with its intended owner so they can finish enrollment. This is needed for the first pair because console-issued Super Admin invitations require a different active Super Admin's approval. Once two are active, use console invitations and their approval flow.

   Check: both accounts are active and can sign in. In the browser's cookie storage, verify `__Host-adv_staff` belongs to the **console's** hostname, is HttpOnly/Secure, has `Path=/` and `SameSite=Strict`, and has no Domain attribute. Never copy its value. Reload a protected console page and confirm the session persists.

9. **Optionally protect the console deployment.** In the `advancare-admin` Vercel project, enable Deployment Protection or password protection if your plan offers it.

   Check: permitted staff can pass the outer protection and still sign in, reload protected pages, and reach `/api`. If this blocks staff, disable the protection in the same dashboard and retest.

10. **Point native builds at the final API.** From `backend/`, change to the families' app:

    ```sh
    cd ../frontend
    ```

    Replace the placeholder origin with the real API URL:

    ```sh
    VITE_API_BASE_URL=https://advancare-api.REPLACE_ME.workers.dev npm run cap:sync
    ```

    Check: the build and sync finish for iOS and Android. Rebuild/install each native app using the existing Xcode/Android workflow and confirm it signs in against the online API. Repeat this environment-prefixed sync after future web changes so the native bundle retains the online API URL. To roll back a native build, sync with the previous working API URL/source and rebuild/reinstall.

11. **Run the online smoke test.** On a real phone, open the families' production Vercel URL, request an email code (check Spam), sign in, complete the profile and book a caregiver shift at least 12 hours ahead. Sign in to the production console and confirm the same booking appears. Reload a protected console page and confirm it stays signed in. Submit a prescription photo and confirm staff can open it. Repeat sign-in and booking on the iOS/Android builds after step 10.

    Check: health says `ok`, email delivery works, family requests reach staff, photo access works, and console sign-in survives reload. These online checks remain owner work until the deployments exist. If something fails, use the rollback steps below and repeat the affected checks.

## Why the console uses a proxy

`vercel.app` is on the Public Suffix List: each project hostname is a separate site. A `SameSite=Strict` cookie from `workers.dev` cannot authenticate cross-site console calls. The console therefore keeps `VITE_API_BASE_URL` empty and requests `/api` on its own hostname. Vercel rewrites those requests to the API, forwarding the method, headers (including Origin and Cookie), body and query, and returning the response including Set-Cookie. The host-only cookie is stored for the console. The following SPA fallback supports BrowserRouter links and reloads; the families' HashRouter needs no SPA rewrite. See [Vercel's rewrite configuration](https://vercel.com/docs/project-configuration/vercel-json#rewrites).

- The API sees Vercel's proxy IP. Per-IP sign-in limits apply to that proxy and may affect multiple staff together. Per-email limits and the five-strike lockout still work. Do not trust client-supplied IP headers or change the API to accept them.
- Console previews have different URLs outside `ADMIN_ORIGINS`; staff sign-in/writes work only on the configured production URL. Use that stable URL for invitations and smoke tests.
- Families call the API directly with a Bearer token; their build-time API URL and production CORS allowlist must agree.

## Rollback — owner only

- **API:** from `backend/`, roll back the production Worker to the previous uploaded version (available after there is a previous version):

  ```sh
  npx wrangler rollback --env production
  ```

  Confirm the target is `advancare-api`. Then repeat health, family booking and console reload checks. This changes the Worker deployment, not local Git or database migrations. Check production bindings and secret configuration too. See [Cloudflare's rollback documentation](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/).
- **Either web app:** Vercel dashboard → the relevant `advancare-app` or `advancare-admin` project → Deployments → choose an older working deployment → **Promote to Production**. Check the production alias, API destination/build variable, response headers and the affected smoke tests. Keep Git and the next build's settings aligned with the working version; promoting an older deployment does not revert source or environment settings.
- **Database:** do not delete data or reverse migrations blindly. A Worker rollback does not restore Neon. If a migration caused damage, stop writes and use the production restore point from step 2 through Neon's dashboard after reviewing the data impact. This is an owner cloud action.
- **First release:** if no previous working deployment exists, there is nothing to roll back to. Keep the prototype out of use, correct the configuration and redeploy; do not proceed with real bookings until the checks pass.
