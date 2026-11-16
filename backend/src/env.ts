import type { Database } from './db/client';
import type { StaffContext } from './staff/sessions';

/** Worker bindings. Secrets come from backend/.env locally and `wrangler secret put` when deployed. */
export interface Bindings {
  ENVIRONMENT: string;
  /** Comma-separated list of browser origins allowed by CORS. */
  ALLOWED_ORIGINS: string;
  /** Present in deployed environments; preferred over DATABASE_URL. */
  HYPERDRIVE?: Hyperdrive;
  /** Direct Neon connection string (fallback). Must require SSL. */
  DATABASE_URL?: string;
  UPLOADS: R2Bucket;
  R2_BUCKET_NAME: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  /** Google AI Studio key for the Care Assistant (secret). */
  GEMINI_API_KEY?: string;
  /** Defaults: gemini-3.5-flash-lite, falling back to gemini-3.1-flash-lite. */
  GEMINI_MODEL?: string;
  GEMINI_FALLBACK_MODEL?: string;
  /** Per-caller request limit for the Care Assistant (wrangler.toml [[ratelimits]]). */
  ASSISTANT_LIMITER?: RateLimit;
  /** Admin console origins (comma-separated). Only these get credentialed CORS on /admin. */
  ADMIN_ORIGINS?: string;
  /** Base URL of the admin console, used to build invite links. */
  ADMIN_APP_URL?: string;
  /** 32+ random bytes, base64 (secret). Encrypts TOTP secrets and signs sign-in challenges. */
  STAFF_ENCRYPTION_KEY?: string;
  /** Staff sign-in attempts per email (wrangler.toml [[ratelimits]]). */
  ADMIN_LOGIN_LIMITER?: RateLimit;
  /** Staff sign-in attempts per IP; generous so a shared network isn't locked out. */
  ADMIN_LOGIN_IP_LIMITER?: RateLimit;
  /** App sign-in code requests/attempts per email (wrangler.toml [[ratelimits]]). */
  CLIENT_AUTH_LIMITER?: RateLimit;
  /** App sign-in requests per IP; generous so many phones on one Wi-Fi can sign in together. */
  CLIENT_AUTH_IP_LIMITER?: RateLimit;
  /** Outgoing email (sign-in codes). Gmail: smtp.gmail.com, 465, the address, and an App Password (secret). */
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  /** Defaults to SMTP_USER / "AdvanCare". */
  MAIL_FROM?: string;
  MAIL_FROM_NAME?: string;
}

export interface Variables {
  requestId: string;
  /** Set by `withDb` on admin routes. */
  db: Database;
  /** Set by `requireStaff` on signed-in admin routes. */
  staff: StaffContext;
  /** Set by `requireClient` on signed-in app routes. */
  clientUserId: string;
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };
