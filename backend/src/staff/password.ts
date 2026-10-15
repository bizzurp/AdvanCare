import { fromBase64Url, randomBytes, timingSafeEqual, toBase64Url } from './crypto';

/**
 * PBKDF2-SHA256. Cloudflare Workers caps PBKDF2 at 100,000 iterations (OWASP recommends
 * 600,000 for SHA-256), so this is the maximum the runtime allows; the 2FA requirement,
 * lockout and rate limits carry the rest. The iteration count is stored in each hash, so
 * it can be raised later without invalidating existing passwords.
 */
export const PBKDF2_ITERATIONS = 100_000;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const encoder = new TextEncoder();

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2-sha256' || !iterations || !salt || !hash) return false;
  const actual = await derive(password, fromBase64Url(salt), Number(iterations));
  return timingSafeEqual(actual, fromBase64Url(hash));
}

/** Spends the same time as a real check, so unknown emails can't be detected by timing. */
const DUMMY_HASH = `pbkdf2-sha256$${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
export async function burnPasswordCheck(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
}

/** Returns a reason the password is unacceptable, or null. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (new Set(password).size < 5) return 'Use a less repetitive password.';
  if (email && password.toLowerCase().includes(email.split('@')[0]!.toLowerCase())) return 'Don’t include your email name in the password.';
  return null;
}
