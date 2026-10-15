import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Badge, Banner, Brand, Button, Checkbox, PageHeader, Screen, TextArea, TextField } from '../components/ui';
import { ApiError, caregiverApi, type CaregiverMe, type CaregiverShift } from '../services/api';
import { useApp } from '../state/AppState';

/**
 * Caregiver mode (P1): a caregiver signs in with their email and sees only the shifts staff
 * assigned to them. Client details come from the server and only while the shift is active.
 */
const TIER: Record<CaregiverShift['tier'], string> = { BGAY_HOME_300: 'Home caregiver · 8 h', CVMC_INSTITUTIONAL_500: 'CVMC bedside watcher · 8 h' };
const STATUS: Record<string, { label: string; tone: 'success' | 'pending' | 'info' | 'error' | 'neutral' }> = {
  CONFIRMED: { label: 'Upcoming', tone: 'info' },
  IN_PROGRESS: { label: 'On shift now', tone: 'pending' },
  COMPLETED: { label: 'Completed', tone: 'success' },
};

function when(date: string, time: string) {
  const d = new Date(`${date}T${time}:00+08:00`);
  return d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function useCaregiverData() {
  const { session } = useApp();
  const token = session?.accessToken ?? '';
  const [me, setMe] = useState<CaregiverMe | null>(null);
  const [shifts, setShifts] = useState<CaregiverShift[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([caregiverApi.me(token), caregiverApi.shifts(token)]);
      setMe(m);
      setShifts(s);
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load your shifts.');
    }
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  return { token, me, shifts, error, reload: load, setMe };
}

export function CaregiverHome() {
  const { signOut } = useApp();
  const navigate = useNavigate();
  const { token, me, shifts, error, reload, setMe } = useCaregiverData();
  const [saving, setSaving] = useState(false);
  const active = (shifts ?? []).filter((s) => s.status !== 'COMPLETED');
  const done = (shifts ?? []).filter((s) => s.status === 'COMPLETED').reverse();

  return (
    <Screen>
      <header className="row between" style={{ padding: 'calc(var(--safe-top) + 14px) 12px 4px var(--gutter)' }}>
        <Brand />
        <button
          className="link-btn"
          onClick={() => {
            signOut();
            navigate('/sign-in', { replace: true });
          }}
        >
          Sign out
        </button>
      </header>
      <div className="screen-body stack gap-24" style={{ paddingTop: 16 }}>
        <div>
          <p className="t-eyebrow">Caregiver</p>
          <h1 className="t-h1" tabIndex={-1} data-autofocus>
            Hi, {me?.fullName?.split(' ')[0] ?? 'there'}.
          </h1>
        </div>
        {error && <Banner tone="error">{error}</Banner>}
        {me && (
          <section className="card stack gap-12">
            <Checkbox
              label="I’m available for new shifts"
              desc={me.isAccredited ? 'Your coordinator only assigns shifts while this is on.' : 'You can be assigned once your coordinator marks you accredited.'}
              checked={me.isAvailable}
              onChange={async (v) => {
                setSaving(true);
                try {
                  await caregiverApi.setAvailable(token, v);
                  setMe({ ...me, isAvailable: v });
                } finally {
                  setSaving(false);
                }
              }}
            />
            {saving && <p className="t-caption t-muted">Saving…</p>}
            <p className="t-caption t-muted">
              {me.totalShiftsCompleted} shifts completed{me.averageRating ? ` · ★ ${me.averageRating.toFixed(1)}` : ''}
            </p>
          </section>
        )}
        <section className="stack gap-12" aria-labelledby="up-h">
          <div className="row between">
            <h2 className="t-section" id="up-h">
              My shifts
            </h2>
            <button className="link-btn" onClick={() => void reload()}>
              Refresh
            </button>
          </div>
          {shifts === null && !error ? <p className="t-muted">Loading…</p> : null}
          {shifts !== null && !active.length ? <p className="t-muted">No upcoming shifts. Your coordinator will assign them here.</p> : null}
          {active.map((s) => (
            <ShiftCard key={s.id} s={s} />
          ))}
        </section>
        {done.length > 0 && (
          <section className="stack gap-12" aria-labelledby="done-h">
            <h2 className="t-section" id="done-h">
              Recently completed
            </h2>
            {done.map((s) => (
              <ShiftCard key={s.id} s={s} />
            ))}
          </section>
        )}
      </div>
    </Screen>
  );
}

function ShiftCard({ s }: { s: CaregiverShift }) {
  const st = STATUS[s.status] ?? { label: s.status, tone: 'neutral' as const };
  return (
    <Link to={`/caregiver/shift/${s.id}`} className="card stack gap-8" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="row between">
        <Badge tone={st.tone}>{st.label}</Badge>
        <span className="t-caption t-muted">{s.ref}</span>
      </div>
      <p className="t-body t-medium" style={{ fontSize: 18 }}>
        {when(s.scheduledDate, s.scheduledStartTime)}
      </p>
      <p className="t-body">
        {s.client.name} · {s.client.address}
      </p>
      <p className="t-caption t-muted">
        {TIER[s.tier]} · you earn ₱{s.caregiverPayout}
        {s.status === 'COMPLETED' ? (s.payoutPaid ? ' · paid' : ' · payout pending') : ''}
      </p>
    </Link>
  );
}

const TASKS = ['Bathing and grooming', 'Meal preparation', 'Feeding', 'Medication reminder', 'Mobility and exercises', 'Vital signs', 'Toileting', 'Companionship'];
const VITALS: { key: string; label: string; unit: string; step?: string }[] = [
  { key: 'bpSystolic', label: 'BP systolic', unit: 'mmHg' },
  { key: 'bpDiastolic', label: 'BP diastolic', unit: 'mmHg' },
  { key: 'pulse', label: 'Pulse', unit: 'bpm' },
  { key: 'tempC', label: 'Temperature', unit: '°C', step: '0.1' },
  { key: 'spo2', label: 'Oxygen (SpO₂)', unit: '%' },
  { key: 'glucoseMgDl', label: 'Blood sugar', unit: 'mg/dL' },
];

export function CaregiverShiftScreen() {
  const { id = '' } = useParams();
  const { token, shifts, error, reload } = useCaregiverData();
  const s = shifts?.find((x) => x.id === id);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'info' | 'warn' | 'error'; text: string } | null>(null);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: 'info', text: ok });
      await reload();
    } catch (e) {
      setMsg({ tone: 'error', text: e instanceof ApiError ? e.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  if (!s)
    return (
      <Screen>
        <PageHeader title="Shift" back="/caregiver" />
        <div className="screen-body">{error ? <Banner tone="error">{error}</Banner> : <p className="t-muted">{shifts ? 'This shift isn’t assigned to you.' : 'Loading…'}</p>}</div>
      </Screen>
    );

  const bg = s.client.background;
  return (
    <Screen>
      <PageHeader title={s.ref} back="/caregiver" />
      <div className="screen-body stack gap-20">
        <div className="stack gap-8">
          <Badge tone={(STATUS[s.status] ?? STATUS.CONFIRMED!).tone}>{(STATUS[s.status] ?? { label: s.status }).label}</Badge>
          <h2 className="t-h2">{when(s.scheduledDate, s.scheduledStartTime)}</h2>
          <p className="t-body t-muted">{TIER[s.tier]}</p>
        </div>
        {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}

        <section className="card stack gap-8">
          <p className="t-eyebrow">Client</p>
          <p className="t-body t-medium" style={{ fontSize: 18 }}>
            {s.client.name}
          </p>
          <p className="row gap-8 t-body">
            <Icon name="map-point" size={18} /> {s.locationDetails || s.client.address}
          </p>
          {s.client.landmark && <p className="t-caption t-muted">Landmark: {s.client.landmark}</p>}
          {bg && (bg.conditions?.length || bg.mobility || bg.allergies) ? (
            <p className="t-body">
              {bg.conditions?.length ? `Conditions: ${bg.conditions.join(', ')}. ` : ''}
              {bg.mobility ? `Mobility: ${bg.mobility}. ` : ''}
              {bg.allergies ? `Allergies: ${bg.allergies}.` : ''}
            </p>
          ) : null}
          {s.client.emergencyContact && (
            <a className="btn btn-secondary" href={`tel:${s.client.emergencyContact.phone}`}>
              <Icon name="phone" size={18} /> Call {s.client.emergencyContact.name} ({s.client.emergencyContact.relationship})
            </a>
          )}
        </section>

        {s.status === 'CONFIRMED' && (
          <Button loading={busy} onClick={() => void act(() => caregiverApi.clockIn(token, s.id), 'Clocked in. Have a good shift.')}>
            Clock in
          </Button>
        )}
        {s.status === 'IN_PROGRESS' && (
          <>
            <NoteForm token={token} shiftId={s.id} onSaved={() => void act(async () => undefined, 'Care note saved. The family can see it now.')} />
            <Button variant="secondary" loading={busy} onClick={() => void act(() => caregiverApi.clockOut(token, s.id), 'Clocked out. Thank you!')}>
              Clock out
            </Button>
          </>
        )}
        {s.status === 'COMPLETED' && (
          <>
            <p className="t-body t-muted">
              Shift completed{s.notes ? ` · ${s.notes} care note${s.notes === 1 ? '' : 's'}` : ''}. Payout ₱{s.caregiverPayout}: {s.payoutPaid ? 'sent' : 'pending'}.
            </p>
            {s.clockOut && Date.now() - new Date(s.clockOut).getTime() < 24 * 3600_000 ? <NoteForm token={token} shiftId={s.id} onSaved={() => void act(async () => undefined, 'Care note saved.')} /> : null}
          </>
        )}
      </div>
    </Screen>
  );
}

function NoteForm({ token, shiftId, onSaved }: { token: string; shiftId: string; onSaved: () => void }) {
  const [tasks, setTasks] = useState<string[]>([]);
  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (notes.trim().length < 3) {
      setError('Write a short note about the shift.');
      return;
    }
    // Only measured values are sent; empty boxes mean "not measured".
    const measured = Object.fromEntries(Object.entries(vitals).filter(([, v]) => v.trim() !== '').map(([k, v]) => [k, Number(v)]));
    setSaving(true);
    setError('');
    try {
      await caregiverApi.addNote(token, shiftId, { tasks, notes: notes.trim(), familySummary: summary.trim() || undefined, ...(Object.keys(measured).length ? { vitals: measured } : {}) });
      setTasks([]);
      setVitals({});
      setNotes('');
      setSummary('');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card stack gap-16" onSubmit={submit} noValidate>
      <h3 className="t-section">Care note</h3>
      <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="t-section">Tasks done</legend>
        {TASKS.map((t) => (
          <Checkbox key={t} label={t} checked={tasks.includes(t)} onChange={(v) => setTasks((xs) => (v ? [...xs, t] : xs.filter((x) => x !== t)))} />
        ))}
      </fieldset>
      <fieldset className="stack gap-8" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="t-section">Vital signs (only what you measured)</legend>
        <div className="grid-2">
          {VITALS.map((v) => (
            <TextField key={v.key} label={`${v.label} (${v.unit})`} inputMode="decimal" type="number" step={v.step ?? '1'} value={vitals[v.key] ?? ''} onChange={(e) => setVitals((x) => ({ ...x, [v.key]: e.target.value }))} />
          ))}
        </div>
      </fieldset>
      <TextArea label="Notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} hint="What happened, how the client was, anything the family or nurse should know." />
      <TextArea label="Message for the family (optional)" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      {error && <Banner tone="error">{error}</Banner>}
      <Button type="submit" loading={saving}>
        Save care note
      </Button>
    </form>
  );
}
