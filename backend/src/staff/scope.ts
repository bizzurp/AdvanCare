import { inArray, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { ApiError } from '../lib/errors';
import type { StaffContext } from './sessions';

/**
 * Municipality scope (ADR-011). Every admin query over client, shift, payment or caregiver
 * data goes through these, so an Admin can never read outside their assigned municipalities.
 */

/** SQL condition limiting `column` (a municipality column) to the staff member's scope; undefined = no limit. */
export function scopeCondition(staff: Pick<StaffContext, 'municipalities'>, column: AnyColumn): SQL | undefined {
  if (staff.municipalities === 'ALL') return undefined;
  if (staff.municipalities.length === 0) return sql`false`;
  return inArray(column, staff.municipalities);
}

export function inScope(staff: Pick<StaffContext, 'municipalities'>, municipality: string | null | undefined): boolean {
  if (staff.municipalities === 'ALL') return true;
  return !!municipality && staff.municipalities.includes(municipality);
}

/** Out-of-scope records answer exactly like missing ones (404), so their existence isn't revealed. */
export function assertInScope(staff: Pick<StaffContext, 'municipalities'>, municipality: string | null | undefined, what = 'Record'): void {
  if (!inScope(staff, municipality)) throw new ApiError(404, 'NOT_FOUND', `${what} not found.`);
}

/** 09171234567 → 0917•••4567. Lists never show full phone numbers. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length < 8) return '•••';
  return `${digits.slice(0, 4)}•••${digits.slice(-4)}`;
}

/** "Juan Dela Cruz" → "Juan D." for ledgers; full names only on the (audited) detail pages. */
export function shortName(fullName: string | null | undefined): string {
  if (!fullName) return 'Unnamed';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

/** Human reference for a shift/request: REQ-1A2B3C4D (first 8 hex of the UUID). */
export const requestRef = (id: string) => `REQ-${id.slice(0, 8).toUpperCase()}`;
export const paymentRef = (id: string) => `PAY-${id.slice(0, 8).toUpperCase()}`;

/** Start of the given day offset in Asia/Manila (UTC+8, no DST), as a Date. 0 = today. */
export function manilaDayStart(offsetDays = 0, nowMs = Date.now()): Date {
  const manila = new Date(nowMs + 8 * 3600_000);
  const midnightUtc = Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate() + offsetDays);
  return new Date(midnightUtc - 8 * 3600_000);
}

/** YYYY-MM-DD of a Date in Asia/Manila. */
export function manilaDate(d: Date): string {
  return new Date(d.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
}

/** CSV cell: quotes when needed, and neutralises spreadsheet formulas (= + - @ tab CR). */
export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
