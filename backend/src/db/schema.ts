/**
 * AdvanCare system-of-record schema (ADV-CORE-001).
 *
 * Invariants (ADR-007):
 * - Every foreign key is ON DELETE RESTRICT / ON UPDATE RESTRICT. Clinical and
 *   financial rows are never removed as a side effect of deleting a parent.
 * - Nothing clinical is defaulted. `care_notes.vitals_recorded` is NULL until a
 *   caregiver actually measures something; an unmeasured vital is NULL, never a
 *   "normal" placeholder.
 *
 * Shift money follows ADR-002: flat 8-hour rates with an 80/20 split, enforced by
 * CHECK constraints so no code path can write a different split.
 *
 * Coordinates are plain latitude/longitude for the pilot; PostGIS geometry can be
 * added later without changing these columns.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const restrict = { onDelete: 'restrict', onUpdate: 'restrict' } as const;

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// ---------- Enums ----------

export const userRole = pgEnum('user_role', [
  'CLIENT',
  'FAMILY_SPONSOR',
  'CAREGIVER',
  'BHW_PROXY',
  'COORDINATOR',
  'ADMIN',
  'SUPER_ADMIN',
]);

export const shiftTier = pgEnum('shift_tier', ['BGAY_HOME_300', 'CVMC_INSTITUTIONAL_500']);

export const shiftStatus = pgEnum('shift_status', [
  'REQUESTED',
  'MATCHING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ESCALATED',
]);

export const paymentMethod = pgEnum('payment_method', ['GCASH', 'MAYA', 'CASH', 'BANK_TRANSFER']);

export const paymentStatus = pgEnum('payment_status', ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED']);

// ---------- Identity ----------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Required for everyone except staff (ADMIN / SUPER_ADMIN), who sign in with email. */
    phoneNumber: varchar('phone_number', { length: 20 }).unique(),
    email: varchar('email', { length: 255 }),
    role: userRole('role').notNull().default('CLIENT'),
    fullName: varchar('full_name', { length: 255 }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Everyone needs a way to be reached: clients sign in by email for now (SMS later), staff by email.
    check('users_contact_required', sql`${t.phoneNumber} IS NOT NULL OR ${t.email} IS NOT NULL`),
    // One app account per email. Staff rows are separate (a staff member may also be a family member).
    uniqueIndex('users_app_email_uq')
      .on(sql`lower(${t.email})`)
      .where(sql`${t.email} IS NOT NULL AND ${t.role} IN ('CLIENT', 'FAMILY_SPONSOR', 'CAREGIVER', 'BHW_PROXY', 'COORDINATOR')`),
  ],
);

export const clientProfiles = pgTable(
  'client_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Account that manages this client (the client, a family member, or a BHW proxy). */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, restrict),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    dateOfBirth: date('date_of_birth'),
    gender: varchar('gender', { length: 20 }),
    sitio: varchar('sitio', { length: 100 }),
    barangay: varchar('barangay', { length: 100 }).notNull(),
    municipality: varchar('municipality', { length: 100 }).notNull(),
    latitude: numeric('latitude', { precision: 9, scale: 6 }),
    longitude: numeric('longitude', { precision: 9, scale: 6 }),
    landmarkNotes: text('landmark_notes'),
    philhealthId: varchar('philhealth_id', { length: 50 }),
    yakapId: varchar('yakap_id', { length: 50 }),
    pwdId: varchar('pwd_id', { length: 50 }),
    seniorId: varchar('senior_id', { length: 50 }),
    /** Recorded baseline only; NULL until someone records it. */
    clinicalBaseline: jsonb('clinical_baseline'),
    /** The profile's id on the family's phone, so re-syncing updates instead of duplicating. */
    deviceRef: varchar('device_ref', { length: 64 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('client_profiles_user_id_idx').on(t.userId), uniqueIndex('client_profiles_user_device_ref_uq').on(t.userId, t.deviceRef)],
);

export const familyProfiles = pgTable(
  'family_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clientProfiles.id, restrict),
    /** Set when the relative has their own AdvanCare account. */
    userId: uuid('user_id').references(() => users.id, restrict),
    relativeName: varchar('relative_name', { length: 255 }).notNull(),
    relationship: varchar('relationship', { length: 50 }).notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }).notNull(),
    isEmergencyContact: boolean('is_emergency_contact').notNull().default(false),
    isRemoteSponsor: boolean('is_remote_sponsor').notNull().default(false),
    locationCityCountry: varchar('location_city_country', { length: 150 }),
    notificationChannel: varchar('notification_channel', { length: 30 }).notNull().default('SMS'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('family_profiles_client_id_idx').on(t.clientId)],
);

export const caregivers = pgTable(
  'caregivers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, restrict),
    sitio: varchar('sitio', { length: 100 }),
    barangay: varchar('barangay', { length: 100 }),
    municipality: varchar('municipality', { length: 100 }),
    isAccredited: boolean('is_accredited').notNull().default(false),
    /** Badges are earned through training; none are granted by default. */
    badges: text('badges').array().notNull().default(sql`ARRAY[]::text[]`),
    totalShiftsCompleted: integer('total_shifts_completed').notNull().default(0),
    /** NULL until the caregiver has at least one rating. */
    averageRating: numeric('average_rating', { precision: 3, scale: 2 }),
    isAvailable: boolean('is_available').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check('caregivers_average_rating_range', sql`${t.averageRating} IS NULL OR ${t.averageRating} BETWEEN 1 AND 5`),
    check('caregivers_total_shifts_nonnegative', sql`${t.totalShiftsCompleted} >= 0`),
  ],
);

// ---------- Care delivery ----------

export const shifts = pgTable(
  'shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clientProfiles.id, restrict),
    requestedByUserId: uuid('requested_by_user_id')
      .notNull()
      .references(() => users.id, restrict),
    caregiverId: uuid('caregiver_id').references(() => caregivers.id, restrict),
    shiftTier: shiftTier('shift_tier').notNull(),
    status: shiftStatus('status').notNull().default('REQUESTED'),
    scheduledDate: date('scheduled_date').notNull(),
    scheduledStartTime: time('scheduled_start_time').notNull(),
    locationDetails: text('location_details').notNull(),
    durationHours: integer('duration_hours').notNull().default(8),
    grossRate: numeric('gross_rate', { precision: 10, scale: 2 }).notNull(),
    caregiverPayout: numeric('caregiver_payout', { precision: 10, scale: 2 }).notNull(),
    platformMargin: numeric('platform_margin', { precision: 10, scale: 2 }).notNull(),
    clockIn: timestamp('clock_in', { withTimezone: true }),
    clockOut: timestamp('clock_out', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancellationReason: text('cancellation_reason'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('shifts_client_id_idx').on(t.clientId),
    index('shifts_caregiver_id_idx').on(t.caregiverId),
    index('shifts_status_date_idx').on(t.status, t.scheduledDate),
    // ADR-002: flat 8-hour rates, 80/20 split.
    check('shifts_duration_8h', sql`${t.durationHours} = 8`),
    check(
      'shifts_rate_matches_tier',
      sql`(${t.shiftTier} = 'BGAY_HOME_300' AND ${t.grossRate} = 300 AND ${t.caregiverPayout} = 240 AND ${t.platformMargin} = 60)
       OR (${t.shiftTier} = 'CVMC_INSTITUTIONAL_500' AND ${t.grossRate} = 500 AND ${t.caregiverPayout} = 400 AND ${t.platformMargin} = 100)`,
    ),
    check('shifts_clock_order', sql`${t.clockOut} IS NULL OR (${t.clockIn} IS NOT NULL AND ${t.clockOut} >= ${t.clockIn})`),
  ],
);

export const careNotes = pgTable(
  'care_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shiftId: uuid('shift_id')
      .notNull()
      .references(() => shifts.id, restrict),
    caregiverId: uuid('caregiver_id')
      .notNull()
      .references(() => caregivers.id, restrict),
    /**
     * Measured vitals only. NULL (no default) when nothing was measured; inside the
     * object, an unmeasured vital is null or absent — never a placeholder value.
     */
    vitalsRecorded: jsonb('vitals_recorded'),
    tasksCompleted: jsonb('tasks_completed'),
    rawCaregiverNotes: text('raw_caregiver_notes'),
    aiGeneratedFamilySummary: text('ai_generated_family_summary'),
    familyAcknowledged: boolean('family_acknowledged').notNull().default(false),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('care_notes_shift_id_idx').on(t.shiftId)],
);

// ---------- Money ----------

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    shiftId: uuid('shift_id')
      .notNull()
      .references(() => shifts.id, restrict),
    payerUserId: uuid('payer_user_id')
      .notNull()
      .references(() => users.id, restrict),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('PHP'),
    method: paymentMethod('method').notNull(),
    status: paymentStatus('status').notNull().default('PENDING'),
    providerReference: varchar('provider_reference', { length: 120 }),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('payments_shift_id_idx').on(t.shiftId),
    uniqueIndex('payments_method_provider_reference_uq').on(t.method, t.providerReference),
    check('payments_amount_positive', sql`${t.amount} > 0`),
    check('payments_currency_php', sql`${t.currency} = 'PHP'`),
  ],
);

// ---------- Request safety ----------

/**
 * Replay store for the Idempotency-Key header. A retried write with the same key,
 * method and path returns the stored response instead of creating a duplicate.
 */
export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    userId: uuid('user_id').references(() => users.id, restrict),
    requestMethod: varchar('request_method', { length: 10 }).notNull(),
    requestPath: varchar('request_path', { length: 255 }).notNull(),
    /** SHA-256 of the request body; a reused key with a different body is rejected. */
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body'),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('idempotency_records_key_method_path_uq').on(t.idempotencyKey, t.requestMethod, t.requestPath),
    index('idempotency_records_expires_at_idx').on(t.expiresAt),
  ],
);

// ---------- Staff accounts (ADR-011) ----------
//
// Staff (ADMIN, SUPER_ADMIN) sign in to the admin console with email + password + TOTP.
// Their rows live in `users` (role) plus the tables below. Secrets are stored only as
// hashes (tokens, recovery codes, passwords) or AES-GCM ciphertext (TOTP secret).

export const staffStatus = pgEnum('staff_status', ['INVITED', 'ACTIVE', 'SUSPENDED']);

export const staffCredentials = pgTable(
  'staff_credentials',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, restrict),
    /** Always stored lowercased. */
    email: varchar('email', { length: 255 }).notNull().unique(),
    /** `pbkdf2-sha256$<iterations>$<salt b64url>$<hash b64url>`; NULL until the invite is accepted. */
    passwordHash: text('password_hash'),
    /** AES-GCM ciphertext of the base32 TOTP secret; set during enrollment. */
    totpSecretEnc: text('totp_secret_enc'),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    /** Last accepted TOTP time step, so a code can't be replayed. */
    lastTotpStep: integer('last_totp_step'),
    status: staffStatus('status').notNull().default('INVITED'),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    /** Who created this account (the Super Admin who sent the invite); NULL for the bootstrap account. */
    createdByUserId: uuid('created_by_user_id').references(() => users.id, restrict),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [check('staff_credentials_email_lowercase', sql`${t.email} = lower(${t.email})`)],
);

/** Municipalities an ADMIN may see. Revoked rows are kept as history. SUPER_ADMIN has no rows (sees all). */
export const staffMunicipalityAssignments = pgTable(
  'staff_municipality_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, restrict),
    municipality: varchar('municipality', { length: 100 }).notNull(),
    assignedByUserId: uuid('assigned_by_user_id').references(() => users.id, restrict),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedByUserId: uuid('revoked_by_user_id').references(() => users.id, restrict),
  },
  (t) => [
    index('staff_municipality_assignments_user_idx').on(t.userId),
    uniqueIndex('staff_municipality_assignments_active_uq')
      .on(t.userId, t.municipality)
      .where(sql`${t.revokedAt} IS NULL`),
  ],
);

export const staffSessions = pgTable(
  'staff_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, restrict),
    /** SHA-256 of the cookie token; the token itself is never stored. */
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ip: varchar('ip', { length: 64 }),
    userAgent: varchar('user_agent', { length: 255 }),
  },
  (t) => [index('staff_sessions_user_idx').on(t.userId)],
);

export const staffInvitations = pgTable(
  'staff_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The invited account (created with status INVITED when the invite is sent). */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, restrict),
    email: varchar('email', { length: 255 }).notNull(),
    role: userRole('role').notNull(),
    municipalities: text('municipalities').array().notNull().default(sql`ARRAY[]::text[]`),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    /** NULL only for the bootstrap invite created by the CLI. */
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, restrict),
    /** A SUPER_ADMIN invite must be approved by a second Super Admin before it can be accepted. */
    approvedByUserId: uuid('approved_by_user_id').references(() => users.id, restrict),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('staff_invitations_user_idx').on(t.userId),
    check('staff_invitations_staff_role', sql`${t.role}::text IN ('ADMIN', 'SUPER_ADMIN')`),
  ],
);

export const staffRecoveryCodes = pgTable(
  'staff_recovery_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, restrict),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('staff_recovery_codes_user_idx').on(t.userId)],
);

/**
 * Append-only record of staff actions and sensitive reads. A trigger (migration 0001)
 * rejects UPDATE and DELETE. Metadata never holds clinical content or secrets.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** NULL for events with no signed-in actor (e.g. a failed login for an unknown email). */
    actorUserId: uuid('actor_user_id').references(() => users.id, restrict),
    action: varchar('action', { length: 64 }).notNull(),
    entityType: varchar('entity_type', { length: 40 }),
    entityId: varchar('entity_id', { length: 64 }),
    municipality: varchar('municipality', { length: 100 }),
    metadata: jsonb('metadata'),
    ip: varchar('ip', { length: 64 }),
    requestId: varchar('request_id', { length: 128 }),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_created_at_idx').on(t.createdAt),
    index('audit_logs_actor_idx').on(t.actorUserId, t.createdAt),
    index('audit_logs_entity_idx').on(t.entityType, t.entityId),
  ],
);

// ---------- App sign-in (ADV-AUTH-001) ----------
//
// Families sign in with a 6-digit code sent by email (SMS later). Codes and session tokens
// are stored only as SHA-256 hashes.

export const clientLoginCodes = pgTable(
  'client_login_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Always stored lowercased. */
    email: varchar('email', { length: 255 }).notNull(),
    codeHash: varchar('code_hash', { length: 64 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ip: varchar('ip', { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [index('client_login_codes_email_idx').on(t.email, t.createdAt)],
);

export const clientSessions = pgTable(
  'client_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, restrict),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    createdAt: createdAt(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: varchar('user_agent', { length: 255 }),
  },
  (t) => [index('client_sessions_user_idx').on(t.userId)],
);
