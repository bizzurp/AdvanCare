/**
 * Account-management rules (ADR-011), kept free of I/O so they can be unit tested.
 * Each returns a user-facing reason the change is refused, or null when it's allowed.
 */
import { isKnownMunicipality } from './municipalities';
import type { StaffRole } from './sessions';

type Status = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export interface TargetAccount {
  id: string;
  role: StaffRole;
  status: Status;
  hasPassword: boolean;
  mfaEnabled: boolean;
}

export function selfChangeProblem(actorId: string, target: Pick<TargetAccount, 'id'>): string | null {
  return actorId === target.id ? 'You can’t change your own role, scope or status. Ask another Super Admin.' : null;
}

/** `otherActiveSuperAdmins` excludes the target. */
export function suspendProblem(target: TargetAccount, otherActiveSuperAdmins: number): string | null {
  if (target.status === 'SUSPENDED') return 'This account is already suspended.';
  if (target.role === 'SUPER_ADMIN' && target.status === 'ACTIVE' && otherActiveSuperAdmins < 1) {
    return 'This is the last active Super Admin. Add another Super Admin before suspending this one.';
  }
  return null;
}

export function reactivateProblem(target: TargetAccount): string | null {
  if (target.status !== 'SUSPENDED') return 'Only suspended accounts can be reactivated.';
  if (!target.hasPassword || !target.mfaEnabled) return 'This person never finished setting up. Send them a new invite instead.';
  return null;
}

export function scopeProblem(role: StaffRole, municipalities: string[]): string | null {
  if (role === 'SUPER_ADMIN') return municipalities.length ? 'Super Admins see every municipality; they have no scope to set.' : null;
  if (municipalities.length === 0) return 'Choose at least one municipality for an Admin.';
  const unknown = municipalities.filter((m) => !isKnownMunicipality(m));
  if (unknown.length) return `Unknown municipality: ${unknown.join(', ')}.`;
  return null;
}

/** The person who sent a Super Admin invite can't also approve it. */
export function approvalProblem(actorId: string, invite: { role: StaffRole; invitedByUserId: string | null; approvedByUserId: string | null }): string | null {
  if (invite.role !== 'SUPER_ADMIN') return 'Only Super Admin invites need approval.';
  if (invite.approvedByUserId) return 'This invite is already approved.';
  if (invite.invitedByUserId === actorId) return 'A different Super Admin must approve an invite you sent.';
  return null;
}
