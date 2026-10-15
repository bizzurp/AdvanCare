import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import * as v from 'valibot';
import { clientProfiles, familyProfiles } from '../db/schema';
import type { AppEnv } from '../env';
import { ApiError } from '../lib/errors';
import { validate } from '../lib/validation';
import { requireClient } from '../middleware/auth';
import { withDb } from '../middleware/staff';
import { isKnownMunicipality } from '../staff/municipalities';

const Text = (max: number) => v.optional(v.pipe(v.string(), v.trim(), v.maxLength(max)));

export const ClientSync = v.strictObject({
  /** The profile's id on the phone. */
  deviceRef: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{6,64}$/, 'Invalid profile reference.')),
  fullName: v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter the client’s full name.'), v.maxLength(255)),
  dateOfBirth: v.optional(v.union([v.literal(''), v.pipe(v.string(), v.isoDate())])),
  gender: Text(20),
  municipality: v.pipe(v.string(), v.trim(), v.check(isKnownMunicipality, 'Choose a municipality in Cagayan.')),
  barangay: v.pipe(v.string(), v.trim(), v.minLength(2, 'Enter the barangay.'), v.maxLength(100)),
  sitio: Text(100),
  landmarkNotes: Text(500),
  philhealthId: Text(50),
  /** As the family entered them. Never defaulted (ADR-007). */
  clinical: v.optional(
    v.strictObject({
      conditions: v.optional(v.pipe(v.array(v.pipe(v.string(), v.trim(), v.maxLength(80))), v.maxLength(20))),
      mobility: Text(80),
      allergies: Text(300),
    }),
  ),
  family: v.optional(
    v.pipe(
      v.array(
        v.strictObject({
          name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
          relationship: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(50)),
          phone: v.pipe(v.string(), v.trim(), v.regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number.')),
          isPrimary: v.optional(v.boolean(), false),
          isRemoteSponsor: v.optional(v.boolean(), false),
          location: Text(150),
        }),
      ),
      v.maxLength(10),
    ),
  ),
});

/** Profiles the family keeps on the phone, copied to the server so bookings and staff can use them. */
export const clients = new Hono<AppEnv>();
clients.use('/clients/*', withDb, requireClient);

clients.post('/clients/sync', validate('json', ClientSync), async (c) => {
  const db = c.get('db');
  const userId = c.get('clientUserId');
  const p = c.req.valid('json');
  const clinical = p.clinical
    ? Object.fromEntries(
        Object.entries({ conditions: p.clinical.conditions?.filter(Boolean), mobility: p.clinical.mobility, allergies: p.clinical.allergies }).filter(([, val]) =>
          Array.isArray(val) ? val.length > 0 : !!val,
        ),
      )
    : {};
  const fields = {
    fullName: p.fullName,
    dateOfBirth: p.dateOfBirth || null,
    gender: p.gender || null,
    municipality: p.municipality,
    barangay: p.barangay,
    sitio: p.sitio || null,
    landmarkNotes: p.landmarkNotes || null,
    philhealthId: p.philhealthId || null,
    clinicalBaseline: Object.keys(clinical).length ? { source: 'family', ...clinical } : null,
  };
  const clientId = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: clientProfiles.id })
      .from(clientProfiles)
      .where(and(eq(clientProfiles.userId, userId), eq(clientProfiles.deviceRef, p.deviceRef)))
      .limit(1);
    const id = existing
      ? (await tx.update(clientProfiles).set(fields).where(eq(clientProfiles.id, existing.id)).returning({ id: clientProfiles.id }))[0]!.id
      : (await tx.insert(clientProfiles).values({ ...fields, userId, deviceRef: p.deviceRef }).returning({ id: clientProfiles.id }))[0]!.id;
    if (p.family) {
      // The phone holds the source of truth for the family list; replace it.
      await tx.delete(familyProfiles).where(eq(familyProfiles.clientId, id));
      if (p.family.length) {
        await tx.insert(familyProfiles).values(
          p.family.map((f) => ({
            clientId: id,
            relativeName: f.name,
            relationship: f.relationship,
            phoneNumber: f.phone.replace(/[^\d+]/g, ''),
            isEmergencyContact: f.isPrimary,
            isRemoteSponsor: f.isRemoteSponsor,
            locationCityCountry: f.location || null,
          })),
        );
      }
    }
    return id;
  });
  if (!clientId) throw new ApiError(500, 'INTERNAL_ERROR', 'Could not save the profile.');
  return c.json({ clientId });
});
