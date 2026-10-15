import type { AuditEntry, Scope, StaffRole, StaffStatus } from './api';

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
  return parts.join(' · ');
}
