import { and, desc, eq, sql } from 'drizzle-orm';
import type { Database } from '../db/client';
import { caregivers, shifts } from '../db/schema';

/**
 * Live data the assistant may see. Everything here is either an aggregate with no
 * personal data, or the signed-in user's OWN records with whitelisted fields only.
 */

/** Accredited, available caregivers per municipality. Counts only — no names, phones or locations. */
export async function caregiverAvailability(db: Database): Promise<string> {
  const rows = await db
    .select({ municipality: caregivers.municipality, available: sql<number>`count(*)::int` })
    .from(caregivers)
    .where(and(eq(caregivers.isAccredited, true), eq(caregivers.isAvailable, true)))
    .groupBy(caregivers.municipality);
  if (rows.length === 0) return 'No accredited caregivers are listed as available right now.';
  return rows.map((r) => `${r.municipality ?? 'Unspecified area'}: ${r.available} available`).join('; ');
}

const TIER_LABEL = { BGAY_HOME_300: 'Home-based caregiver (PHP 300)', CVMC_INSTITUTIONAL_500: 'CVMC caregiver (PHP 500)' } as const;

/**
 * The signed-in user's own caregiver requests. `userId` must come from the server-side
 * session, never from the request body or the model. Fields are whitelisted: no notes,
 * vitals, locations, caregiver identities or payment details.
 */
export async function ownShiftSummaries(db: Database, userId: string): Promise<string> {
  const rows = await db
    .select({ tier: shifts.shiftTier, status: shifts.status, date: shifts.scheduledDate, start: shifts.scheduledStartTime })
    .from(shifts)
    .where(eq(shifts.requestedByUserId, userId))
    .orderBy(desc(shifts.scheduledDate))
    .limit(10);
  if (rows.length === 0) return 'The user has no caregiver requests on record.';
  return rows.map((r) => `${TIER_LABEL[r.tier]} on ${r.date} at ${r.start.slice(0, 5)}: ${r.status}`).join('\n');
}
