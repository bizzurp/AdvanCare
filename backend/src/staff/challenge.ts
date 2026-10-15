import { fromBase64Url, hmacSign, hmacVerify, toBase64Url, type StaffKeys } from './crypto';

/**
 * Short-lived signed token carried between sign-in steps (password → 2FA, invite → 2FA enrollment).
 * Stateless: it proves "this user passed the previous step in the last 10 minutes". Wrong 2FA
 * codes still count toward the account lockout, so a challenge can't be used to brute-force.
 */
export type ChallengePurpose = 'mfa' | 'enroll';
export const CHALLENGE_TTL_MS = 10 * 60 * 1000;

interface ChallengePayload {
  sub: string;
  purpose: ChallengePurpose;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function issueChallenge(keys: StaffKeys, userId: string, purpose: ChallengePurpose, nowMs = Date.now()): Promise<string> {
  const payload: ChallengePayload = { sub: userId, purpose, exp: nowMs + CHALLENGE_TTL_MS };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await hmacSign(keys.signer, body)}`;
}

/** The user id, or null when the token is malformed, tampered with, expired or for another purpose. */
export async function readChallenge(keys: StaffKeys, token: string, purpose: ChallengePurpose, nowMs = Date.now()): Promise<string | null> {
  const [body, signature] = token.split('.');
  if (!body || !signature || !(await hmacVerify(keys.signer, body, signature))) return null;
  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(body))) as ChallengePayload;
    if (payload.purpose !== purpose || typeof payload.sub !== 'string' || payload.exp < nowMs) return null;
    return payload.sub;
  } catch {
    return null;
  }
}
