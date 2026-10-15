/**
 * Fills a database with realistic, clearly fictional demo data (clients, caregivers, requests,
 * payments, care notes, demo Admin invites) so the console and app can be reviewed.
 *
 *   Local:  SEED_DATABASE_URL=postgres://postgres@localhost:55432/advancare_dev npm run db:seed-demo
 *   Neon:   npm run db:seed-demo -- --neon-demo-branch      (uses DATABASE_URL_UNPOOLED from backend/.env)
 *
 * Safety: a local database is always fine. A Neon database is used only with --neon-demo-branch
 * AND when Neon itself reports that the database's endpoint belongs to a non-default branch whose
 * name contains "demo". Production can never be seeded. Re-running adds another batch.
 * Demo emails use the reserved .test domain, so nothing is ever delivered to a real inbox.
 */
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import pg from 'pg';

try {
  process.loadEnvFile('.env');
} catch {
  /* shell variables only */
}
const neonDemo = process.argv.includes('--neon-demo-branch');
const url = process.env.SEED_DATABASE_URL ?? (neonDemo ? process.env.DATABASE_URL_UNPOOLED : undefined);
if (!url) {
  console.error('Set SEED_DATABASE_URL to a local database, or pass --neon-demo-branch to use the Neon demo branch in backend/.env.');
  process.exit(1);
}
const host = new URL(url).hostname;
const local = ['localhost', '127.0.0.1', '[::1]'].includes(host);
if (!local) {
  if (!neonDemo || !host.endsWith('.neon.tech')) {
    console.error(`Refusing to seed ${host}: only local databases, or a Neon demo branch with --neon-demo-branch.`);
    process.exit(1);
  }
  const projectId = JSON.parse(readFileSync('.neon', 'utf8')).projectId as string;
  const endpointId = host.split('.')[0]!.replace(/-pooler$/, '');
  const neonApi = (path: string) => JSON.parse(execFileSync('neon', ['api', path], { encoding: 'utf8' }));
  const endpoint = (neonApi(`/projects/${projectId}/endpoints`).endpoints as { id: string; branch_id: string }[]).find((e) => e.id === endpointId);
  const branch = endpoint && (neonApi(`/projects/${projectId}/branches`).branches as { id: string; name: string; default: boolean }[]).find((b) => b.id === endpoint.branch_id);
  if (!branch || branch.default || !/demo/i.test(branch.name)) {
    console.error(`Refusing to seed: ${endpointId} is ${branch ? `branch "${branch.name}"${branch.default ? ' (the default/production branch)' : ''}` : 'not an endpoint of this Neon project'}. Only a branch named like "demo" is allowed.`);
    process.exit(1);
  }
  console.log(`Seeding Neon branch "${branch.name}" (${endpointId}).`);
}

const pick = <T,>(xs: readonly T[]): T => xs[randomInt(xs.length)]!;
const FIRST = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Antonio', 'Elena', 'Ramon', 'Lourdes', 'Carlos', 'Teresita', 'Eduardo', 'Corazon', 'Ricardo', 'Imelda', 'Fernando', 'Nenita', 'Rogelio', 'Erlinda'];
const LAST = ['Dela Cruz', 'Santos', 'Reyes', 'Bautista', 'Garcia', 'Mendoza', 'Ramos', 'Aquino', 'Tumbali', 'Balisi', 'Pagulayan', 'Tamayo', 'Mamauag', 'Carag', 'Furigay', 'Taguinod'];
const PLACES: Record<string, string[]> = {
  Solana: ['Caritan Centro', 'Cataggaman', 'Iraga', 'Natappian East', 'Bauan'],
  'Tuguegarao City': ['Ugac Norte', 'Caritan Norte', 'Pengue-Ruyu', 'Annafunan East', 'Linao East'],
  Peñablanca: ['Camasi', 'Callao', 'Nabbabalayan', 'Lagum'],
  Baggao: ['San Jose', 'Taguntungan', 'Bitag Grande'],
};
const RELATIONS = ['Daughter', 'Son', 'Spouse', 'Niece', 'Grandson'];
const ABROAD = ['Dubai, UAE', 'Riyadh, KSA', 'Hong Kong', 'Singapore', 'Toronto, Canada'];
const phone = () => `09${randomInt(10, 99)}${String(randomInt(0, 9_999_999)).padStart(7, '0')}`;
const name = () => `${pick(FIRST)} ${pick(LAST)}`;

const c = new pg.Client({ connectionString: url, ssl: local ? false : true });
await c.connect();
await c.query('BEGIN');
try {
  const munis = Object.keys(PLACES);
  // Caregivers: 14, spread across the municipalities.
  const cgs: { id: string; muni: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const muni = munis[i % munis.length]!;
    const { rows: [u] } = await c.query(`insert into users (phone_number, email, full_name, role) values ($1,$2,$3,'CAREGIVER') returning id`, [phone(), `caregiver.${randomUUID().slice(0, 6)}@demo.advancare.test`, name()]);
    const accredited = i % 7 !== 6;
    const badges = accredited ? (i % 3 === 0 ? ['BADGE_ADL', 'BADGE_CVMC_WATCHER'] : ['BADGE_ADL']) : [];
    const { rows: [cg] } = await c.query(
      `insert into caregivers (user_id, barangay, municipality, is_accredited, badges, total_shifts_completed, average_rating, is_available) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [u.id, pick(PLACES[muni]!), muni, accredited, badges, randomInt(0, 60), accredited ? (4 + Math.random()).toFixed(2) : null, accredited && i % 4 !== 0],
    );
    cgs.push({ id: cg.id, muni });
  }
  // Clients: 36, each with 1–2 family members.
  const clients: { id: string; userId: string; muni: string; barangay: string }[] = [];
  for (let i = 0; i < 36; i++) {
    const muni = munis[i % munis.length]!;
    const barangay = pick(PLACES[muni]!);
    const fullName = name();
    const { rows: [u] } = await c.query(`insert into users (phone_number, full_name, role) values ($1,$2,'CLIENT') returning id`, [phone(), fullName]);
    const dob = new Date(Date.UTC(randomInt(1938, 1965), randomInt(0, 12), randomInt(1, 28))).toISOString().slice(0, 10);
    const { rows: [cp] } = await c.query(
      `insert into client_profiles (user_id, full_name, date_of_birth, gender, sitio, barangay, municipality, landmark_notes, philhealth_id, senior_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
      [u.id, fullName, dob, pick(['Male', 'Female']), `Purok ${randomInt(1, 7)}`, barangay, muni, 'Near the barangay chapel, blue gate', i % 3 ? `DEMO-${randomInt(1e8, 1e9)}` : null, `SC-DEMO-${i}`],
    );
    for (let f = 0; f < randomInt(1, 3); f++) {
      const remote = f === 1;
      await c.query(
        `insert into family_profiles (client_id, relative_name, relationship, phone_number, is_emergency_contact, is_remote_sponsor, location_city_country) values ($1,$2,$3,$4,$5,$6,$7)`,
        [cp.id, name(), pick(RELATIONS), phone(), f === 0, remote, remote ? pick(ABROAD) : `${barangay}, ${muni}`],
      );
    }
    clients.push({ id: cp.id, userId: u.id, muni, barangay });
  }
  // Requests over the last 60 days (+ a few upcoming), with realistic status mix.
  const now = Date.now();
  let shiftsMade = 0;
  for (let i = 0; i < 180; i++) {
    const client = pick(clients);
    const tier = Math.random() < 0.65 ? 'BGAY_HOME_300' : 'CVMC_INSTITUTIONAL_500';
    const [gross, pay, margin] = tier === 'BGAY_HOME_300' ? [300, 240, 60] : [500, 400, 100];
    // The first few are always fresh, so the dashboard has waiting and escalated work to show.
    const ageDays = i < 7 ? Math.random() * 0.3 : Math.pow(Math.random(), 1.4) * 60;
    const created = new Date(now - ageDays * 86400_000 - randomInt(0, 3600_000));
    const scheduled = new Date(created.getTime() + (i < 7 ? randomInt(2, 20) : randomInt(2, 72)) * 3600_000);
    const startHour = pick([6, 7, 8, 14, 22]);
    const future = scheduled.getTime() > now;
    let status: string;
    if (i < 7) status = (['REQUESTED', 'REQUESTED', 'MATCHING', 'MATCHING', 'REQUESTED', 'ESCALATED', 'ESCALATED'] as const)[i]!;
    else if (ageDays < 0.4) status = pick(['REQUESTED', 'MATCHING', 'ESCALATED']);
    else if (future) status = pick(['CONFIRMED', 'CONFIRMED', 'MATCHING']);
    else if (scheduled.getTime() + 8 * 3600_000 > now) status = 'IN_PROGRESS';
    else status = Math.random() < 0.88 ? 'COMPLETED' : 'CANCELLED';
    const local = cgs.filter((g) => g.muni === client.muni);
    const caregiver = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(status) ? pick(local.length ? local : cgs).id : null;
    const date = new Date(scheduled.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
    const clockIn = ['IN_PROGRESS', 'COMPLETED'].includes(status) ? new Date(`${date}T${String(startHour).padStart(2, '0')}:0${randomInt(0, 9)}:00+08:00`) : null;
    const clockOut = status === 'COMPLETED' && clockIn ? new Date(clockIn.getTime() + 8 * 3600_000 + randomInt(0, 900_000)) : null;
    const id = randomUUID();
    await c.query(
      `insert into shifts (id, client_id, requested_by_user_id, caregiver_id, shift_tier, status, scheduled_date, scheduled_start_time, location_details,
         gross_rate, caregiver_payout, platform_margin, clock_in, clock_out, cancelled_at, cancellation_reason, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [id, client.id, client.userId, caregiver, tier, status, date, `${String(startHour).padStart(2, '0')}:00`, tier === 'CVMC_INSTITUTIONAL_500' ? `CVMC Ward ${randomInt(1, 9)}, Bed ${randomInt(1, 30)}` : `Home, Brgy. ${client.barangay}`,
        gross, pay, margin, clockIn, clockOut, status === 'CANCELLED' ? created : null, status === 'CANCELLED' ? 'Family arranged care themselves' : null, created, clockOut ?? created],
    );
    shiftsMade++;
    if (status === 'COMPLETED') {
      const method = pick(['GCASH', 'GCASH', 'MAYA', 'CASH', 'BANK_TRANSFER']);
      const pst = Math.random() < 0.85 ? 'SUCCEEDED' : pick(['PENDING', 'FAILED']);
      await c.query(
        `insert into payments (shift_id, payer_user_id, amount, method, status, provider_reference, paid_at, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, client.userId, gross, method, pst, method === 'CASH' ? null : `DEMO${randomInt(1e9, 1e10 - 1)}`, pst === 'SUCCEEDED' ? clockOut : null, clockOut],
      );
      if (Math.random() < 0.6) {
        await c.query(
          `insert into care_notes (shift_id, caregiver_id, vitals_recorded, tasks_completed, raw_caregiver_notes, recorded_at) values ($1,$2,$3,$4,$5,$6)`,
          [id, caregiver, JSON.stringify({ bp: `${randomInt(110, 150)}/${randomInt(70, 95)}`, pulse: randomInt(60, 95), tempC: (36 + Math.random()).toFixed(1) }), JSON.stringify(['Bathing', 'Meal prep', 'Medication reminder']), 'Demo note: client rested well, ate lunch.', clockOut],
        );
      }
    }
  }
  // Two demo Admins (one per main municipality), as one-time invite links.
  const invites: string[] = [];
  for (const [label, muni] of [['Solana', 'Solana'], ['Tuguegarao', 'Tuguegarao City']] as const) {
    const email = `admin.${label.toLowerCase()}.${randomUUID().slice(0, 4)}@demo.advancare.test`;
    const { rows: [u] } = await c.query(`insert into users (email, full_name, role) values ($1,$2,'ADMIN') returning id`, [email, `Demo Admin ${label}`]);
    await c.query(`insert into staff_credentials (user_id, email, status) values ($1,$2,'INVITED')`, [u.id, email]);
    const token = randomBytes(32).toString('base64url');
    const { rows: [inv] } = await c.query(
      `insert into staff_invitations (user_id, email, role, municipalities, token_hash, expires_at) values ($1,$2,'ADMIN',$3,$4, now() + interval '72 hours') returning id`,
      [u.id, email, [muni], createHash('sha256').update(token).digest('hex')],
    );
    await c.query(`insert into audit_logs (action, entity_type, entity_id, metadata) values ('invite.created','staff',$1,$2)`, [u.id, JSON.stringify({ role: 'ADMIN', municipalities: [muni], via: 'seed-demo', invitationId: inv.id })]);
    invites.push(`  ${label} Admin (${email}):\n    ${(process.env.ADMIN_APP_URL ?? 'http://localhost:5176').replace(/\/$/, '')}/accept-invite#token=${token}`);
  }
  await c.query('COMMIT');
  console.log(`\nDemo Admin invites (72 h, one use each; open in a private window to stay signed in as yourself):\n${invites.join('\n')}\n`);
  console.log(`Seeded ${cgs.length} caregivers, ${clients.length} clients and ${shiftsMade} requests across ${munis.join(', ')}.`);
} catch (err) {
  await c.query('ROLLBACK');
  console.error((err as Error).message);
  process.exitCode = 1;
} finally {
  await c.end();
}
