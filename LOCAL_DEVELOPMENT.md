# Run on your Mac without internet

Both Safari apps share PostgreSQL on this Mac. No internet or Wi-Fi is needed for
sign-in, profiles, bookings, or staff operations. Online data stays separate.

## Current setup

- PWA: http://localhost:5174
- Admin: http://localhost:5176
- API: http://localhost:8787/api/v1/health
- PostgreSQL database: `advancare_local`, port 5432 (Homebrew PostgreSQL 17).
  The database session timezone is UTC, matching the hosted environment.
- API settings: `backend/.env.local` (ignored by Git). `.env` retains Neon settings.
- Fictional demo records are loaded. A local Super Admin invitation was created for
  `admin@advancare.test`; choose a password and enroll an authenticator using the invite.
  Online accounts and existing browser sessions do not sign into this separate database.

## Start

Run each command in its own terminal from the project directory:

```sh
cd backend
npm run dev:local
```

```sh
cd frontend
npm run dev
```

```sh
cd admin
npm run dev
```

If PostgreSQL has stopped, start it with `brew services start postgresql@17`.
Keep Safari online in its developer settings: disconnecting the Mac from the internet
is fine, but browser simulated offline mode blocks localhost requests too.

## Sign-in and bookings

PWA sign-in accepts an email address, but no email is sent: read the six-digit code
in the backend terminal. Admin passwords and authenticator codes work locally.
Bookings save immediately to the shared local database. Refresh the relevant admin
page to load a new booking; this setup does not add automatic live updates.

To generate another local Super Admin invite:

```sh
cd backend
npm run admin:bootstrap:local -- --email another@advancare.test --name "Local Admin" --additional
```

AI chat and real email delivery need internet and are unconfigured in local mode.
The R2 binding is simulated locally; the presigned cloud upload endpoint is
unconfigured. This setup does not synchronize local records to Neon.

## Recreate on another Mac

Install PostgreSQL and project dependencies first. Copy `backend/local.env.example`
to `backend/.env.local`, set the Mac's PostgreSQL role and generate the encryption
key as described in that template. Create `advancare_local` with `createdb`, then
run `npm run db:migrate:local` from `backend/`. Keep the encryption key stable.
Set the database timezone with `psql -d postgres -c "ALTER DATABASE advancare_local SET timezone TO 'UTC'"`.
After future schema changes, run the same migration command against the local database.

Use `npm run dev` in `backend/` to return to the existing online development settings;
stop the local backend first because both use port 8787.
