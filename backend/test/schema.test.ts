import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as schema from '../src/db/schema';

const tables = Object.values(schema as Record<string, unknown>).filter((value): value is PgTable => is(value, PgTable));

describe('schema invariants (ADR-007)', () => {
  it('covers the core and staff tables', () => {
    expect(tables.map((t) => getTableConfig(t).name).sort()).toEqual([
      'audit_logs',
      'care_notes',
      'caregivers',
      'client_profiles',
      'family_profiles',
      'idempotency_records',
      'payments',
      'shifts',
      'staff_credentials',
      'staff_invitations',
      'staff_municipality_assignments',
      'staff_recovery_codes',
      'staff_sessions',
      'users',
    ]);
  });

  it('uses ON DELETE/UPDATE RESTRICT on every foreign key', () => {
    const fks = tables.flatMap((t) => getTableConfig(t).foreignKeys.map((fk) => ({ table: getTableConfig(t).name, fk })));
    expect(fks.length).toBeGreaterThan(0);
    for (const { fk } of fks) {
      expect(fk.onDelete).toBe('restrict');
      expect(fk.onUpdate).toBe('restrict');
    }
  });

  it('leaves vitals_recorded nullable with no default', () => {
    const column = getTableConfig(schema.careNotes).columns.find((c) => c.name === 'vitals_recorded');
    expect(column?.notNull).toBe(false);
    expect(column?.hasDefault).toBe(false);
  });
});
