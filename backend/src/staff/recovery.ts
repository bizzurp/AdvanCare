import { randomBytes } from './crypto';

export const RECOVERY_CODE_COUNT = 10;
// No 0/O/1/I/L, so codes read back clearly from paper.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Ten codes like `K7QM-4XTB`. Shown once; only their SHA-256 is stored. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const chars = [...randomBytes(8)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
    return `${chars.slice(0, 4)}-${chars.slice(4)}`;
  });
}

/** Uppercase, strip spaces, re-insert the dash, so "k7qm 4xtb" matches "K7QM-4XTB". */
export function normalizeRecoveryCode(input: string): string | null {
  const clean = input.toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z0-9]{8}$/.test(clean)) return null;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}
