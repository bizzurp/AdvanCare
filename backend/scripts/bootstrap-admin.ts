/**
 * Creates the first Super Admin (there is no public sign-up) and prints a one-time invite link.
 *
 *   npm run admin:bootstrap -- --email you@example.com --name "Your Name"
 *
 * Writes straight to the database in backend/.env (DATABASE_URL_UNPOOLED, else DATABASE_URL).
 * If an active Super Admin already exists, pass --additional to create another one anyway
 * (e.g. to recover from losing every Super Admin). Re-running for an email that never
 * finished setting up replaces its invite link. Everything is recorded in audit_logs.
 */
import { createHash, randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import pg from 'pg';

const INVITE_TTL_HOURS = 72;

try {
  process.loadEnvFile('.env');
} catch {
  // No .env: use variables exported in the shell.
}

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' }, additional: { type: 'boolean', default: false } },
});
const email = values.email?.trim().toLowerCase();
const fullName = values.name?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName) {
  console.error('Usage: npm run admin:bootstrap -- --email you@example.com --name "Your Name" [--additional]');
  process.exit(1);
}
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (backend/.env).');
  process.exit(1);
}

const token = randomBytes(32).toString('base64url');
const tokenHash = createHash('sha256').update(token).digest('hex');
const client = new pg.Client({ connectionString: url, ssl: !/localhost|127\.0\.0\.1/.test(url) });
await client.connect();
try {
  await client.query('BEGIN');
  const { rows: supers } = await client.query(
    `SELECT u.id FROM users u JOIN staff_credentials s ON s.user_id = u.id WHERE u.role = 'SUPER_ADMIN' AND s.status = 'ACTIVE'`,
  );
  if (supers.length && !values.additional) {
    throw new Error(`${supers.length} active Super Admin(s) already exist. Invite people from the admin console, or pass --additional.`);
  }
  const { rows: existing } = await client.query(
    `SELECT s.user_id, s.status, u.role FROM staff_credentials s JOIN users u ON u.id = s.user_id WHERE s.email = $1`,
    [email],
  );
  let userId: string;
  if (existing[0]) {
    if (existing[0].status !== 'INVITED' || existing[0].role !== 'SUPER_ADMIN') {
      throw new Error(`${email} already has a ${existing[0].role} account (${existing[0].status}). Manage it from the admin console.`);
    }
    userId = existing[0].user_id;
    await client.query(`UPDATE staff_invitations SET revoked_at = now() WHERE user_id = $1 AND accepted_at IS NULL AND revoked_at IS NULL`, [userId]);
  } else {
    const { rows } = await client.query(`INSERT INTO users (email, full_name, role, phone_number) VALUES ($1, $2, 'SUPER_ADMIN', NULL) RETURNING id`, [email, fullName]);
    userId = rows[0].id;
    await client.query(`INSERT INTO staff_credentials (user_id, email, status) VALUES ($1, $2, 'INVITED')`, [userId, email]);
  }
  const { rows: invite } = await client.query(
    `INSERT INTO staff_invitations (user_id, email, role, token_hash, expires_at) VALUES ($1, $2, 'SUPER_ADMIN', $3, now() + make_interval(hours => $4)) RETURNING id`,
    [userId, email, tokenHash, INVITE_TTL_HOURS],
  );
  await client.query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, metadata) VALUES (NULL, 'invite.created', 'staff', $1, $2)`,
    [userId, JSON.stringify({ role: 'SUPER_ADMIN', via: 'bootstrap-cli', invitationId: invite[0].id })],
  );
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await client.end();
}

if (!process.exitCode) {
  const base = (process.env.ADMIN_APP_URL ?? 'http://localhost:5176').replace(/\/$/, '');
  console.log(`\nSuper Admin invite for ${email} (valid ${INVITE_TTL_HOURS} hours, works once):\n\n  ${base}/accept-invite#token=${token}\n`);
  console.log('Open it, choose a password and set up your authenticator app. Treat the link like a password.');
}
