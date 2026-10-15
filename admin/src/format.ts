import type { AuditEntry, PaymentMethod, PaymentStatus, Scope, ShiftStatus, ShiftTier, StaffRole, StaffStatus } from './api';

const TZ = 'Asia/Manila';

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
}

export function date(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', { timeZone: TZ, dateStyle: 'medium' });
}

export function relative(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const future = diff < 0;
  const mins = Math.round(Math.abs(diff) / 60000);
  const say = (n: number, unit: string) => (future ? `in ${n} ${unit}${n === 1 ? '' : 's'}` : `${n} ${unit}${n === 1 ? '' : 's'} ago`);
  if (mins < 1) return future ? 'in under a minute' : 'Just now';
  if (mins < 60) return say(mins, 'minute');
  const hours = Math.round(mins / 60);
  if (hours < 24) return say(hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return say(days, 'day');
  return date(iso);
}

export const ROLE_LABEL: Record<StaffRole, string> = { ADMIN: 'Admin', SUPER_ADMIN: 'Super Admin' };
export const STATUS_LABEL: Record<StaffStatus, string> = { INVITED: 'Invited', ACTIVE: 'Active', SUSPENDED: 'Suspended' };

export function scopeLabel(scope: Scope): string {
  if (scope === 'ALL') return 'All municipalities';
  if (scope.length === 0) return 'No municipalities';
  if (scope.length <= 2) return scope.join(', ');
  return `${scope.slice(0, 2).join(', ')} +${scope.length - 2}`;
}

export function personName(p: { fullName: string | null; email?: string | null } | null | undefined): string {
  if (!p) return 'System';
  return p.fullName || p.email || 'Unnamed';
}

/** Human wording for audit actions. Unknown actions fall back to the raw code. */
export const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.mfa_failed': 'Wrong 2-step code',
  'auth.locked': 'Account locked (too many attempts)',
  'auth.logout': 'Signed out',
  'auth.mfa_enrolled': 'Set up 2-step verification',
  'auth.recovery_code_used': 'Used a recovery code',
  'invite.created': 'Sent an invite',
  'invite.accepted': 'Accepted invite',
  'invite.approved': 'Approved a Super Admin invite',
  'invite.renewed': 'Sent a new invite link',
  'invite.revoked': 'Cancelled an invite',
  'account.suspended': 'Suspended an account',
  'account.reactivated': 'Reactivated an account',
  'account.scope_changed': 'Changed municipality access',
  'account.mfa_reset': 'Reset 2-step verification',
  'account.sessions_revoked': 'Signed someone out everywhere',
  'account.unlocked': 'Unlocked an account',
  'me.password_changed': 'Changed own password',
  'me.password_change_failed': 'Wrong current password',
  'me.session_revoked': 'Ended one of own sessions',
  'me.sessions_revoked': 'Signed out other sessions',
  'me.recovery_codes_regenerated': 'Made new recovery codes',
  'me.mfa_reset': 'Reset own 2-step verification',
  'client.viewed': 'Opened a client record',
  'client.clinical_viewed': 'Viewed clinical notes',
  'export.downloaded': 'Downloaded an export',
};

export const actionLabel = (action: string) => ACTION_LABEL[action] ?? action;

export const isFailureAction = (action: string) => /failed|locked/.test(action);

/** Short, safe summary of audit metadata (it never holds clinical content or secrets). */
export function metadataSummary(entry: AuditEntry): string {
  const m = entry.metadata ?? {};
  const parts: string[] = [];
  if (Array.isArray(m.added) && m.added.length) parts.push(`added ${m.added.join(', ')}`);
  if (Array.isArray(m.removed) && m.removed.length) parts.push(`removed ${m.removed.join(', ')}`);
  if (typeof m.role === 'string') parts.push(ROLE_LABEL[m.role as StaffRole] ?? m.role);
  if (Array.isArray(m.municipalities) && m.municipalities.length) parts.push(m.municipalities.join(', '));
  if (typeof m.method === 'string') parts.push(m.method === 'totp' ? 'authenticator app' : m.method === 'recovery' ? 'recovery code' : String(m.method));
  if (typeof m.reason === 'string' && m.reason) parts.push(m.reason.replace(/_/g, ' '));
  if (typeof m.sessionsEnded === 'number' && m.sessionsEnded) parts.push(`${m.sessionsEnded} session(s) ended`);
  if (typeof m.count === 'number') parts.push(`${m.count} session(s)`);
  if (typeof m.via === 'string') parts.push(`via ${m.via}`);
  if (typeof m.table === 'string') parts.push(`${m.table}${typeof m.rows === 'number' ? `, ${m.rows} rows` : ''}`);
  if (typeof m.notes === 'number') parts.push(`${m.notes} note(s)`);
  return parts.join(' · ');
}

// ---------- Operations ----------

export type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'deep';

export const TIER_LABEL: Record<ShiftTier, string> = { BGAY_HOME_300: 'Home caregiver ₱300', CVMC_INSTITUTIONAL_500: 'CVMC caregiver ₱500' };

/** Status always shows as words + tone, never colour alone. */
export const SHIFT_STATUS: Record<ShiftStatus, { label: string; tone: Tone }> = {
  REQUESTED: { label: 'New', tone: 'warn' },
  MATCHING: { label: 'Finding caregiver', tone: 'warn' },
  CONFIRMED: { label: 'Confirmed', tone: 'info' },
  IN_PROGRESS: { label: 'In progress', tone: 'deep' },
  COMPLETED: { label: 'Completed', tone: 'good' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  ESCALATED: { label: 'Escalated', tone: 'bad' },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'warn' },
  SUCCEEDED: { label: 'Paid', tone: 'good' },
  FAILED: { label: 'Failed', tone: 'bad' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
};

export const METHOD_LABEL: Record<PaymentMethod, string> = { GCASH: 'GCash', MAYA: 'Maya', CASH: 'Cash', BANK_TRANSFER: 'Bank transfer' };

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
export const money = (n: number) => peso.format(n);
export const num = (n: number) => n.toLocaleString('en-PH');

/** "08:00:00" → "8:00 AM". */
export function clock(time: string | null | undefined): string {
  if (!time) return '—';
  const [h = '0', m = '00'] = time.split(':');
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** "2026-10-15" → "Oct 15, 2026" without timezone drift. */
export function day(isoDate: string | null | undefined, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
  if (!isoDate) return '—';
  return new Date(`${isoDate}T12:00:00+08:00`).toLocaleDateString('en-PH', { timeZone: TZ, ...opts });
}

export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
}

/** "2 h 15 min" since a timestamp. */
export function waitedFor(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 48) return `${h} h ${mins % 60} min`;
  return `${Math.round(h / 24)} days`;
}

/** Today in Asia/Manila as YYYY-MM-DD. */
export function todayManila(offsetDays = 0): string {
  return new Date(Date.now() + 8 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
}
