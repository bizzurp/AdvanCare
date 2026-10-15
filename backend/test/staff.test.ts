import { describe, expect, it } from 'vitest';
import { issueChallenge, readChallenge, CHALLENGE_TTL_MS } from '../src/staff/challenge';
import { decryptString, deriveStaffKeys, encryptString } from '../src/staff/crypto';
import { hashPassword, passwordProblem, verifyPassword } from '../src/staff/password';
import { generateRecoveryCodes, normalizeRecoveryCode } from '../src/staff/recovery';
import { approvalProblem, reactivateProblem, scopeProblem, selfChangeProblem, suspendProblem, type TargetAccount } from '../src/staff/rules';
import { sessionCookieName, sessionCookieOptions } from '../src/staff/sessions';
import { base32Decode, base32Encode, hotp, otpauthUri, totpStep, verifyTotp } from '../src/staff/totp';

const MASTER = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => i + 1)));

describe('password hashing', () => {
  it('round-trips and rejects the wrong password', async () => {
    const stored = await hashPassword('correct horse battery staple', 1000);
    expect(stored).toMatch(/^pbkdf2-sha256\$1000\$[\w-]{22}\$[\w-]{43}$/);
    expect(await verifyPassword('correct horse battery staple', stored)).toBe(true);
    expect(await verifyPassword('correct horse battery stapler', stored)).toBe(false);
    expect(await verifyPassword('anything', 'garbage')).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same password here', 1000)).not.toBe(await hashPassword('same password here', 1000));
  });

  it('enforces the password policy', () => {
    expect(passwordProblem('short')).toMatch(/at least 12/);
    expect(passwordProblem('aaaaaaaaaaaaaaaa')).toMatch(/repetitive/);
    expect(passwordProblem('maria.santos-2026!', 'maria.santos@lgu.gov.ph')).toMatch(/email/);
    expect(passwordProblem('Tuguegarao river at dawn')).toBeNull();
  });
});

describe('TOTP (RFC 6238)', () => {
  // RFC 6238 Appendix B, SHA-1, 8 digits, secret "12345678901234567890".
  const rfcSecret = new TextEncoder().encode('12345678901234567890');
  it.each([
    [59, '94287082'],
    [1111111109, '07081804'],
    [1111111111, '14050471'],
    [1234567890, '89005924'],
    [2000000000, '69279037'],
    [20000000000, '65353130'],
  ])('matches the test vector at T=%i', async (seconds, expected) => {
    expect(await hotp(rfcSecret, totpStep(seconds * 1000), { digits: 8 })).toBe(expected);
  });

  it('base32 round-trips', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 9]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32Encode(rfcSecret)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  it('accepts ±1 step for clock drift and refuses replays', async () => {
    const secret = base32Encode(rfcSecret);
    const now = 1_700_000_000_000;
    const step = totpStep(now);
    const code = await hotp(rfcSecret, step);
    expect(await verifyTotp(secret, code, { nowMs: now })).toBe(step);
    expect(await verifyTotp(secret, await hotp(rfcSecret, step - 1), { nowMs: now })).toBe(step - 1);
    expect(await verifyTotp(secret, await hotp(rfcSecret, step - 2), { nowMs: now })).toBeNull();
    expect(await verifyTotp(secret, code, { nowMs: now, lastUsedStep: step })).toBeNull();
    expect(await verifyTotp(secret, '12345', { nowMs: now })).toBeNull();
  });

  it('builds an authenticator-app URI', () => {
    const uri = otpauthUri('GEZDGNBV', 'admin@advancare.ph');
    expect(uri).toMatch(/^otpauth:\/\/totp\/AdvanCare%20Admin%3Aadmin%40advancare\.ph\?/);
    expect(new URL(uri).searchParams.get('secret')).toBe('GEZDGNBV');
  });
});

describe('staff keys', () => {
  it('encrypts TOTP secrets with AES-GCM and detects tampering', async () => {
    const keys = await deriveStaffKeys(MASTER);
    const sealed = await encryptString(keys.cipher, 'GEZDGNBVGY3TQOJQ');
    expect(sealed).toMatch(/^v1\./);
    expect(sealed).not.toContain('GEZDGNBV');
    expect(await decryptString(keys.cipher, sealed)).toBe('GEZDGNBVGY3TQOJQ');
    const tampered = sealed.slice(0, -2) + (sealed.endsWith('A') ? 'BB' : 'AA');
    await expect(decryptString(keys.cipher, tampered)).rejects.toThrow();
  });

  it('refuses a missing or short master key', async () => {
    await expect(deriveStaffKeys(undefined)).rejects.toThrow(/not configured/);
    await expect(deriveStaffKeys(btoa('short'))).rejects.toThrow(/32 bytes/);
  });

  it('signs sign-in challenges bound to purpose and expiry', async () => {
    const keys = await deriveStaffKeys(MASTER);
    const now = Date.now();
    const token = await issueChallenge(keys, 'user-1', 'mfa', now);
    expect(await readChallenge(keys, token, 'mfa', now)).toBe('user-1');
    expect(await readChallenge(keys, token, 'enroll', now)).toBeNull();
    expect(await readChallenge(keys, token, 'mfa', now + CHALLENGE_TTL_MS + 1)).toBeNull();
    const [body, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ sub: 'user-2', purpose: 'mfa', exp: now + 60_000 })).replace(/=+$/, '');
    expect(await readChallenge(keys, `${forged}.${sig}`, 'mfa', now)).toBeNull();
    expect(await readChallenge(keys, `${body}.`, 'mfa', now)).toBeNull();
    const otherKeys = await deriveStaffKeys(btoa(String.fromCharCode(...new Uint8Array(32).fill(7))));
    expect(await readChallenge(otherKeys, token, 'mfa', now)).toBeNull();
  });
});

describe('recovery codes', () => {
  it('generates ten distinct, readable codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });

  it('normalises how people type them', () => {
    expect(normalizeRecoveryCode(' k7qm 4xtb ')).toBe('K7QM-4XTB');
    expect(normalizeRecoveryCode('K7QM-4XTB')).toBe('K7QM-4XTB');
    expect(normalizeRecoveryCode('123456')).toBeNull();
  });
});

describe('session cookie', () => {
  it('is __Host-, Secure, HttpOnly, SameSite=Strict outside development', () => {
    expect(sessionCookieName({ ENVIRONMENT: 'production' })).toBe('__Host-adv_staff');
    expect(sessionCookieOptions({ ENVIRONMENT: 'production' })).toEqual({ path: '/', httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 8 * 3600 });
  });

  it('drops Secure only for local development over http://localhost', () => {
    expect(sessionCookieName({ ENVIRONMENT: 'development' })).toBe('adv_staff');
    expect(sessionCookieOptions({ ENVIRONMENT: 'development' }).secure).toBe(false);
  });
});

describe('account rules', () => {
  const account = (over: Partial<TargetAccount> = {}): TargetAccount => ({ id: 'b', role: 'ADMIN', status: 'ACTIVE', hasPassword: true, mfaEnabled: true, ...over });

  it('stops staff changing their own role, scope or status', () => {
    expect(selfChangeProblem('a', { id: 'a' })).toMatch(/own/);
    expect(selfChangeProblem('a', { id: 'b' })).toBeNull();
  });

  it('never suspends the last active Super Admin', () => {
    expect(suspendProblem(account({ role: 'SUPER_ADMIN' }), 0)).toMatch(/last active Super Admin/);
    expect(suspendProblem(account({ role: 'SUPER_ADMIN' }), 1)).toBeNull();
    expect(suspendProblem(account(), 0)).toBeNull();
    expect(suspendProblem(account({ status: 'SUSPENDED' }), 3)).toMatch(/already/);
  });

  it('only reactivates suspended accounts that finished setup', () => {
    expect(reactivateProblem(account({ status: 'SUSPENDED' }))).toBeNull();
    expect(reactivateProblem(account({ status: 'SUSPENDED', mfaEnabled: false }))).toMatch(/new invite/);
    expect(reactivateProblem(account())).toMatch(/Only suspended/);
  });

  it('requires a valid municipality scope for Admins and none for Super Admins', () => {
    expect(scopeProblem('ADMIN', [])).toMatch(/at least one/);
    expect(scopeProblem('ADMIN', ['Solana', 'Atlantis'])).toMatch(/Atlantis/);
    expect(scopeProblem('ADMIN', ['Solana', 'Tuguegarao City'])).toBeNull();
    expect(scopeProblem('SUPER_ADMIN', [])).toBeNull();
    expect(scopeProblem('SUPER_ADMIN', ['Solana'])).toMatch(/every municipality/);
  });

  it('needs a second Super Admin to approve a Super Admin invite', () => {
    expect(approvalProblem('a', { role: 'SUPER_ADMIN', invitedByUserId: 'a', approvedByUserId: null })).toMatch(/different Super Admin/);
    expect(approvalProblem('b', { role: 'SUPER_ADMIN', invitedByUserId: 'a', approvedByUserId: null })).toBeNull();
    expect(approvalProblem('b', { role: 'SUPER_ADMIN', invitedByUserId: 'a', approvedByUserId: 'c' })).toMatch(/already/);
    expect(approvalProblem('b', { role: 'ADMIN', invitedByUserId: 'a', approvedByUserId: null })).toMatch(/Only Super Admin/);
  });
});

describe('scope helpers', () => {
  it('builds no condition for Super Admins and an empty one for Admins without municipalities', async () => {
    const { scopeCondition, inScope } = await import('../src/staff/scope');
    const { clientProfiles } = await import('../src/db/schema');
    expect(scopeCondition({ municipalities: 'ALL' }, clientProfiles.municipality)).toBeUndefined();
    expect(scopeCondition({ municipalities: [] }, clientProfiles.municipality)).toBeDefined();
    expect(inScope({ municipalities: ['Solana'] }, 'Solana')).toBe(true);
    expect(inScope({ municipalities: ['Solana'] }, 'Baggao')).toBe(false);
    expect(inScope({ municipalities: ['Solana'] }, null)).toBe(false);
    expect(inScope({ municipalities: 'ALL' }, null)).toBe(true);
  });

  it('masks phones and shortens names for ledgers', async () => {
    const { maskPhone, shortName, requestRef } = await import('../src/staff/scope');
    expect(maskPhone('09171234567')).toBe('0917•••4567');
    expect(maskPhone('+63 917 123 4567')).toBe('+639•••4567');
    expect(maskPhone(null)).toBeNull();
    expect(shortName('Juan Dela Cruz')).toBe('Juan C.');
    expect(shortName('Maria')).toBe('Maria');
    expect(requestRef('1a2b3c4d-0000-0000-0000-000000000000')).toBe('REQ-1A2B3C4D');
  });

  it('computes Asia/Manila day boundaries', async () => {
    const { manilaDayStart, manilaDate } = await import('../src/staff/scope');
    const now = Date.parse('2026-10-15T17:30:00Z'); // 01:30 on 16 Oct in Manila
    expect(manilaDayStart(0, now).toISOString()).toBe('2026-10-15T16:00:00.000Z');
    expect(manilaDayStart(-1, now).toISOString()).toBe('2026-10-14T16:00:00.000Z');
    expect(manilaDate(new Date(now))).toBe('2026-10-16');
  });

  it('writes Excel-safe CSV', async () => {
    const { toCsv } = await import('../src/staff/scope');
    const csv = toCsv(['A', 'B'], [['=HYPERLINK("x")', 'a,b'], [null, 'line\nbreak']]);
    expect(csv.startsWith('﻿A,B\r\n')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""x"")","a,b"`);
    expect(csv).toContain(',"line\nbreak"');
  });
});
