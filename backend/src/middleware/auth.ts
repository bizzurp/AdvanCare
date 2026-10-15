import type { Context } from 'hono';
import type { AppEnv } from '../env';

/**
 * The authenticated user's id, or null.
 *
 * TODO(ADV-AUTH-001): verify the access token issued by /auth/verify-otp and return its
 * subject. Until then this always returns null, so no endpoint can read personal data.
 * Never derive the user from a header, query or body field a client can set.
 */
export function authenticatedUserId(_c: Context<AppEnv>): string | null {
  return null;
}
