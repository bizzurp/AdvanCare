import { and, count, eq, isNull } from 'drizzle-orm';
import type { Executor } from '../db/client';
import { staffCredentials, staffRecoveryCodes, users } from '../db/schema';
import { activeMunicipalities, type StaffRole } from './sessions';

/** What the admin app knows about the signed-in person (`GET /admin/me`). */
export async function staffProfile(db: Executor, userId: string) {
  const [row] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, email: staffCredentials.email, mfaEnabled: staffCredentials.mfaEnabled, lastLoginAt: staffCredentials.lastLoginAt })
    .from(users)
    .innerJoin(staffCredentials, eq(staffCredentials.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  const [codes] = await db
    .select({ remaining: count() })
    .from(staffRecoveryCodes)
    .where(and(eq(staffRecoveryCodes.userId, userId), isNull(staffRecoveryCodes.usedAt)));
  return {
    ...row,
    role: row.role as StaffRole,
    municipalities: row.role === 'SUPER_ADMIN' ? ('ALL' as const) : await activeMunicipalities(db, userId),
    recoveryCodesRemaining: codes?.remaining ?? 0,
  };
}
