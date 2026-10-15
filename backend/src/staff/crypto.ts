/** WebCrypto helpers shared by staff auth. Nothing here touches the database. */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
}

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** URL-safe random token (default 32 bytes = 256 bits). */
export function randomToken(bytes = 32): string {
  return toBase64Url(randomBytes(bytes));
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time comparison for equal-length secrets. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

/**
 * Keys derived from STAFF_ENCRYPTION_KEY (32 random bytes, base64) with HKDF, one per purpose,
 * so the TOTP-secret cipher and the challenge signer never share a key.
 */
export async function deriveStaffKeys(masterBase64: string | undefined) {
  if (!masterBase64) throw new Error('STAFF_ENCRYPTION_KEY is not configured.');
  const master = Uint8Array.from(atob(masterBase64.trim()), (ch) => ch.charCodeAt(0));
  if (master.length < 32) throw new Error('STAFF_ENCRYPTION_KEY must be at least 32 bytes (base64).');
  const hkdf = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
  const params = (info: string) => ({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encoder.encode(info) });
  const [cipher, signer] = await Promise.all([
    crypto.subtle.deriveKey(params('advancare/staff/totp-secret'), hkdf, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    crypto.subtle.deriveKey(params('advancare/staff/challenge'), hkdf, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign', 'verify']),
  ]);
  return { cipher, signer };
}

export type StaffKeys = Awaited<ReturnType<typeof deriveStaffKeys>>;

/** AES-GCM; output `v1.<iv>.<ciphertext>` (base64url). */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext));
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`;
}

export async function decryptString(key: CryptoKey, value: string): Promise<string> {
  const [version, iv, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !ciphertext) throw new Error('Unsupported ciphertext format.');
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(iv) }, key, fromBase64Url(ciphertext));
  return decoder.decode(plaintext);
}

export async function hmacSign(key: CryptoKey, data: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(data))));
}

export async function hmacVerify(key: CryptoKey, data: string, signature: string): Promise<boolean> {
  try {
    return await crypto.subtle.verify('HMAC', key, fromBase64Url(signature), encoder.encode(data));
  } catch {
    return false;
  }
}
