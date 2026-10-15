import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AttachmentPicker, DayPicker, TimePicker, type AttachmentMeta } from '../components/Scheduling';
import {
  ActionBar,
  Banner,
  Button,
  Checkbox,
  ChoiceGroup,
  ChoiceRow,
  DemoTag,
  DependencyNote,
  PageHeader,
  Screen,
  SelectField,
  TextArea,
  TextField,
} from '../components/ui';
import { DEPENDENCIES, FACILITY_LEVELS, RHU_PROVIDER_TYPES, RHU_SERVICES, RHU_VISIT_MODES, type FacilityLevel, type RhuProviderType } from '../data/catalog';
import { DEMO_GPS, DEMO_RHUS, DEMO_SLOTS, DEMO_TAKEN } from '../data/demo';
import { isDemoMode } from '../services/api';
import { useApp, useDraft } from '../state/AppState';
import { combine, formatDay, toDateInput, useSubmitRequest } from './requestUtils';

const isPast = (date: string, slot: string) => combine(date, slot).getTime() < Date.now() + 30 * 60 * 1000;

// ---------------- 07 / TeleHealth (Tele-consultation with a GP) ----------------
interface TeleDraft {
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  mode: 'Video call' | 'Audio call' | 'Chat';
  notes: string;
}

const TELE_KEY = 'telehealth';
const teleInit = (): TeleDraft => ({ doctorId: DEMO_GPS[0].id, date: toDateInput(new Date()), time: '', reason: 'General check-up', mode: 'Video call', notes: '' });

export function TeleHealth() {
  const [d, set, clear] = useDraft<TeleDraft>(TELE_KEY, teleInit);
  const { submit, submitting, error } = useSubmitRequest();
  const [errors, setErrors] = useState<{ time?: string }>({});
  const doc = DEMO_GPS.find((g) => g.id === d.doctorId) ?? DEMO_GPS[0];
  const slotOk = d.time && !isPast(d.date, d.time) && !DEMO_TAKEN.has(d.time);

  const book = () => {
    if (!slotOk) {
      setErrors({ time: 'Choose an available time.' });
      return;
    }
    const at = combine(d.date, d.time);
    void submit({
      kind: 'telehealth',
      summary: `${d.reason} with ${doc.name}`,
      scheduledFor: at.toISOString(),
      details: [
        { label: 'Doctor', value: `${doc.name} · ${doc.specialty}`, icon: 'stethoscope' },
        { label: 'Consultation', value: d.mode, icon: 'chat-round-dots' },
        { label: 'Reason', value: d.reason + (d.notes ? ` — ${d.notes}` : ''), icon: 'document-text' },
      ],
      payload: { doctorId: doc.id, mode: d.mode, reason: d.reason, notes: d.notes, startTime: at.toISOString() },
      onDone: clear,
    });
  };

  return (
    <Screen>
      <PageHeader title="TeleHealth consultation" back="/services" />
      <div className="screen-body stack gap-24">
        <div className="card row gap-16">
          <span className="avatar">{doc.initials}</span>
          <div className="grow">
            <div className="t-section" style={{ fontSize: 17 }}>
              {doc.name}
            </div>
            <div className="t-small t-muted">{doc.specialty}</div>
            <div className="t-caption" style={{ color: 'var(--gold)' }}>
              ★ {doc.rating} · {doc.reviews} reviews
            </div>
          </div>
          <DemoTag>Demo</DemoTag>
        </div>
        <Link to="/services/telehealth/doctors" className="link-btn" style={{ marginTop: -12 }}>
          Change doctor
        </Link>
        <DayPicker
          value={d.date}
          onChange={(date) => {
            set({ date, time: d.time && isPast(date, d.time) ? '' : d.time });
            setErrors({});
          }}
        />
        <TimePicker
          slots={DEMO_SLOTS}
          value={d.time}
          onChange={(time) => {
            set({ time });
            setErrors({});
          }}
          isDisabled={(s) => DEMO_TAKEN.has(s) || isPast(d.date, s)}
          error={errors.time}
        />
        <SelectField label="Reason for consultation" options={['General check-up', 'Follow-up consultation', 'New symptoms', 'Medication question', 'Other']} value={d.reason} onChange={(e) => set({ reason: e.target.value })} />
        <div className="stack gap-12">
          <h2 className="t-section" id="mode-h">
            How would you like to talk?
          </h2>
          <div className="grid-3" role="radiogroup" aria-labelledby="mode-h">
            {(['Video call', 'Audio call', 'Chat'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={d.mode === m} className="chip" onClick={() => set({ mode: m })}>
                {m}
              </button>
            ))}
          </div>
          <p className="t-caption t-muted">Audio or chat works better on slow connections.</p>
        </div>
        <TextArea label="Anything the doctor should know? (optional)" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
        {d.time && (
          <p className="row gap-8 t-caption t-muted">
            <Icon name="shield-check" size={16} /> {formatDay(d.date)} · {d.time} · {d.mode}
          </p>
        )}
        <DependencyNote title={isDemoMode ? undefined : 'How this works'}>{isDemoMode ? DEPENDENCIES.api : DEPENDENCIES.telehealth}</DependencyNote>
        <Link to="/services/triage" className="link-btn">
          Not sure which service you need? Get assessed first
        </Link>
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      <ActionBar>
        <Button onClick={book} loading={submitting}>
          Book consultation
        </Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- 24 / Choose doctor ----------------
export function ChooseDoctor() {
  const navigate = useNavigate();
  const [d, set] = useDraft<TeleDraft>(TELE_KEY, teleInit);
  const [pick, setPick] = useState(d.doctorId);
  const chosen = DEMO_GPS.find((g) => g.id === pick)!;
  return (
    <Screen>
      <PageHeader title="Choose a doctor" />
      <div className="screen-body stack gap-16">
        <h2 className="t-h2">Your consultation provider.</h2>
        <p className="t-small t-muted" style={{ marginTop: -8 }}>
          General practitioners available for TeleHealth.
        </p>
        <ChoiceGroup label="Doctors">
          {DEMO_GPS.map((g) => (
            <ChoiceRow
              key={g.id}
              icon="stethoscope"
              title={g.name}
              desc={`${g.specialty} · ${g.rating} rating · ${g.languages.join(', ')}`}
              selected={pick === g.id}
              onSelect={() => setPick(g.id)}
            />
          ))}
        </ChoiceGroup>
        <DemoTag>Demo physician roster</DemoTag>
      </div>
      <ActionBar>
        <Button
          onClick={() => {
            set({ doctorId: pick, time: pick === d.doctorId ? d.time : '' });
            navigate(-1);
          }}
        >
          Choose {chosen.name.replace(/^Dr\. \S+ /, 'Dr. ')}
        </Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- RHU services: MD, DMD, Nurse, Midwife ----------------
interface RhuDraft {
  provider: RhuProviderType | '';
  service: string;
  rhuId: string;
  mode: string;
  date: string;
  window: string;
  notes: string;
}

export function RhuServices() {
  const { profile } = useApp();
  const defaultRhu = DEMO_RHUS.find((r) => r.municipality === profile.municipality)?.id ?? DEMO_RHUS[0].id;
  const [d, set, clear] = useDraft<RhuDraft>('rhu', () => ({ provider: '', service: '', rhuId: defaultRhu, mode: 'rhu', date: '', window: '', notes: '' }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { submit, submitting, error } = useSubmitRequest();
  const provider = RHU_PROVIDER_TYPES.find((p) => p.id === d.provider);
  const rhu = DEMO_RHUS.find((r) => r.id === d.rhuId)!;

  const send = () => {
    const e: Record<string, string> = {};
    if (!d.provider) e.provider = 'Choose who you need to see.';
    if (!d.service) e.service = 'Choose a service.';
    if (!d.date) e.date = 'Choose a preferred day.';
    if (!d.window) e.window = 'Choose morning or afternoon.';
    setErrors(e);
    if (Object.keys(e).length) {
      document.querySelector('[role="alert"]')?.scrollIntoView({ block: 'center' });
      return;
    }
    const at = combine(d.date, d.window === 'Morning' ? '8:00 AM' : '1:00 PM');
    void submit({
      kind: 'rhu',
      summary: `${d.service} · ${provider!.title}`,
      scheduledFor: at.toISOString(),
      details: [
        { label: 'Provider', value: provider!.title, icon: provider!.icon },
        { label: 'Service', value: d.service, icon: 'medical-kit' },
        { label: 'Health unit', value: rhu.name, icon: 'map-point-hospital' },
        { label: 'Visit type', value: RHU_VISIT_MODES.find((m) => m.id === d.mode)!.title, icon: 'home-angle' },
        { label: 'Preferred time', value: `${formatDay(at.toISOString())} · ${d.window}`, icon: 'calendar' },
        ...(d.notes ? [{ label: 'Notes', value: d.notes, icon: 'document-text' as const }] : []),
      ],
      payload: { providerType: d.provider, service: d.service, rhuId: d.rhuId, mode: d.mode, preferredDate: d.date, window: d.window, notes: d.notes },
      onDone: clear,
    });
  };

  return (
    <Screen>
      <PageHeader title="RHU services" back="/services" />
      <div className="screen-body stack gap-24">
        <div>
          <h2 className="t-h2">
            Care from your
            <br />
            Rural Health Unit.
          </h2>
          <p className="t-body t-muted mt-8">See a doctor, dentist, nurse, or midwife.</p>
        </div>
        <section className="stack gap-12">
          <h3 className="t-section" id="prov-h">
            Who do you need to see?
          </h3>
          <ChoiceGroup label="Provider type">
            {RHU_PROVIDER_TYPES.map((p) => (
              <ChoiceRow key={p.id} icon={p.icon} title={p.title} desc={p.desc} selected={d.provider === p.id} onSelect={() => p.id !== d.provider && set({ provider: p.id, service: '' })} />
            ))}
          </ChoiceGroup>
          {errors.provider && <span className="field-error" role="alert">{errors.provider}</span>}
        </section>
        {provider && (
          <section className="stack gap-12">
            <h3 className="t-section">Service</h3>
            <ChoiceGroup label={`${provider.title} services`}>
              {RHU_SERVICES[provider.id].map((s) => (
                <ChoiceRow key={s} title={s} selected={d.service === s} onSelect={() => set({ service: s })} />
              ))}
            </ChoiceGroup>
            {errors.service && <span className="field-error" role="alert">{errors.service}</span>}
            <DemoTag>Service list pending RHU confirmation</DemoTag>
          </section>
        )}
        <SelectField label="Health unit" options={DEMO_RHUS.map((r) => ({ value: r.id, label: r.name }))} value={d.rhuId} onChange={(e) => set({ rhuId: e.target.value })} />
        <section className="stack gap-12">
          <h3 className="t-section">Visit type</h3>
          <ChoiceGroup label="Visit type">
            {RHU_VISIT_MODES.map((m) => (
              <ChoiceRow key={m.id} icon={m.id === 'rhu' ? 'hospital' : 'home-angle'} title={m.title} desc={m.desc} selected={d.mode === m.id} onSelect={() => set({ mode: m.id })} />
            ))}
          </ChoiceGroup>
        </section>
        <DayPicker label="Preferred day" startOffset={1} value={d.date} onChange={(date) => set({ date })} error={errors.date} />
        <TimePicker label="Preferred time" slots={['Morning', 'Afternoon']} value={d.window} onChange={(w) => set({ window: w })} error={errors.window} />
        <TextArea label="Notes for the RHU team (optional)" placeholder="Symptoms, last visit, or questions" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
        <p className="t-caption t-muted">The RHU confirms the exact schedule. RHU fees, if any, are set by the health unit.</p>
        <DependencyNote title={isDemoMode ? undefined : 'How this works'}>{isDemoMode ? DEPENDENCIES.api : DEPENDENCIES.rhu}</DependencyNote>
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      <ActionBar>
        <Button onClick={send} loading={submitting}>
          Request RHU appointment
        </Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- Triage & referral ----------------
interface TriageDraft {
  concern: string;
  onset: string;
  reporter: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  temperature: string;
  photo?: AttachmentMeta;
  preferred: FacilityLevel | '';
  needsTransport: boolean;
}

/** Validates an optional vital. Empty = not measured (stored as null, never defaulted). */
function vital(v: string, min: number, max: number, label: string): string | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return `Enter a ${label} between ${min} and ${max}, or leave it empty if not measured.`;
  return undefined;
}

export function Triage() {
  const { profile } = useApp();
  const [d, set, clear] = useDraft<TriageDraft>('triage', () => ({ concern: '', onset: '', reporter: 'Client', systolic: '', diastolic: '', pulse: '', temperature: '', preferred: '', needsTransport: false }));
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const { submit, submitting, error } = useSubmitRequest();

  const send = () => {
    const e: Record<string, string | undefined> = {
      concern: d.concern.trim().length < 5 ? 'Describe the main concern in a few words.' : undefined,
      onset: !d.onset ? 'Choose when it started.' : undefined,
      systolic: vital(d.systolic, 60, 260, 'top number'),
      diastolic: vital(d.diastolic, 30, 160, 'bottom number'),
      pulse: vital(d.pulse, 40, 200, 'pulse'),
      temperature: vital(d.temperature, 34, 42, 'temperature'),
    };
    if (!e.systolic && !e.diastolic && (d.systolic === '') !== (d.diastolic === '')) e.diastolic = 'Enter both blood pressure numbers, or leave both empty.';
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      requestAnimationFrame(() => document.querySelector('.field-error')?.scrollIntoView({ block: 'center' }));
      return;
    }
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    const vitals = {
      bloodPressure: d.systolic && d.diastolic ? `${d.systolic}/${d.diastolic}` : null,
      pulseRate: num(d.pulse),
      temperature: num(d.temperature),
    };
    const nr = 'Not recorded';
    void submit({
      kind: 'triage',
      summary: d.concern.trim().slice(0, 80),
      details: [
        { label: 'Main concern', value: d.concern.trim(), icon: 'heart-pulse' },
        { label: 'Started', value: d.onset, icon: 'calendar' },
        { label: 'Reported by', value: d.reporter, icon: 'user-rounded' },
        { label: 'Blood pressure', value: vitals.bloodPressure ?? nr, icon: 'heart-pulse' },
        { label: 'Pulse', value: vitals.pulseRate != null ? `${vitals.pulseRate} per minute` : nr, icon: 'heart-pulse' },
        { label: 'Temperature', value: vitals.temperature != null ? `${vitals.temperature} °C` : nr, icon: 'heart-pulse' },
        { label: 'Preferred facility', value: FACILITY_LEVELS.find((f) => f.id === d.preferred)?.title ?? 'No preference', icon: 'map-point-hospital' },
        { label: 'Photo', value: d.photo ? d.photo.name : 'None', icon: 'camera' },
      ],
      payload: { concern: d.concern, onset: d.onset, reporter: d.reporter, vitals, preferredFacilityLevel: d.preferred || null, needsTransport: d.needsTransport, clientMunicipality: profile.municipality },
      onDone: clear,
    });
  };

  return (
    <Screen>
      <PageHeader title="Triage & referral" back="/services" />
      <div className="screen-body stack gap-24">
        <div className="banner banner-error" style={{ flexDirection: 'column', gap: 12 }}>
          <div className="row gap-8 t-semibold" style={{ fontSize: 15 }}>
            <Icon name="phone" size={20} /> Is this an emergency?
          </div>
          <p>If you think this may be an emergency, call 911 or go to the nearest hospital now. Do not wait for this assessment.</p>
          <a href="tel:911" className="btn btn-danger" style={{ height: 44, minHeight: 44 }}>
            Call 911
          </a>
        </div>
        <div>
          <h2 className="t-h2">Tell us what’s happening.</h2>
          <p className="t-body t-muted mt-8">
            A clinician reviews every assessment and decides where {profile.fullName.split(' ')[0]} should be seen: the RHU, a district hospital, CVMC, or a private clinic.
          </p>
        </div>
        <TextArea label="Main concern" placeholder="For example: fever and cough for two days" value={d.concern} onChange={(e) => set({ concern: e.target.value })} error={errors.concern} />
        <SelectField label="When did it start?" placeholder="Choose" options={['Today', '1–3 days ago', '4–7 days ago', 'More than a week ago']} value={d.onset} onChange={(e) => set({ onset: e.target.value })} error={errors.onset} />
        <SelectField label="Who is reporting?" options={['Client', 'Family member', 'Caregiver', 'Barangay Health Worker']} value={d.reporter} onChange={(e) => set({ reporter: e.target.value })} />
        <fieldset className="stack gap-12" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="t-section">Vital signs (if measured)</legend>
          <p className="t-caption t-muted">Leave a field empty if it wasn’t measured. Don’t estimate.</p>
          <div className="grid-2">
            <TextField label="BP top number" inputMode="numeric" placeholder="mmHg" value={d.systolic} onChange={(e) => set({ systolic: e.target.value.replace(/\D/g, '').slice(0, 3) })} error={errors.systolic} />
            <TextField label="BP bottom number" inputMode="numeric" placeholder="mmHg" value={d.diastolic} onChange={(e) => set({ diastolic: e.target.value.replace(/\D/g, '').slice(0, 3) })} error={errors.diastolic} />
            <TextField label="Pulse" inputMode="numeric" placeholder="per minute" value={d.pulse} onChange={(e) => set({ pulse: e.target.value.replace(/\D/g, '').slice(0, 3) })} error={errors.pulse} />
            <TextField label="Temperature" inputMode="decimal" placeholder="°C" value={d.temperature} onChange={(e) => set({ temperature: e.target.value.replace(/[^\d.]/g, '').slice(0, 4) })} error={errors.temperature} />
          </div>
        </fieldset>
        <section className="stack gap-12">
          <h3 className="t-section">Photo (optional)</h3>
          <p className="t-caption t-muted" style={{ marginTop: -8 }}>
            A wound, rash, or a reading from a BP monitor.
          </p>
          <AttachmentPicker draftKey="triage" imagesOnly value={d.photo} onChange={(photo) => set({ photo })} label="Add a photo" />
        </section>
        <section className="stack gap-12">
          <h3 className="t-section">Preferred facility (optional)</h3>
          <p className="t-caption t-muted" style={{ marginTop: -8 }}>
            The clinician makes the final referral decision.
          </p>
          <ChoiceGroup label="Preferred facility">
            <ChoiceRow title="No preference" selected={d.preferred === ''} onSelect={() => set({ preferred: '' })} />
            {FACILITY_LEVELS.map((f) => (
              <ChoiceRow key={f.id} icon={f.icon} title={f.title} desc={f.desc} selected={d.preferred === f.id} onSelect={() => set({ preferred: f.id })} />
            ))}
          </ChoiceGroup>
        </section>
        <Checkbox label="We’ll need transport to the facility" desc="The care team can arrange non-emergency transport after the referral" checked={d.needsTransport} onChange={(v) => set({ needsTransport: v })} />
        <DependencyNote title="Clinical rules missing">{DEPENDENCIES.triage} An approved emergency danger-sign list is also needed for this screen.</DependencyNote>
        <DependencyNote title="Facilities">{DEPENDENCIES.facilities}</DependencyNote>
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      <ActionBar>
        <Button onClick={send} loading={submitting}>
          Send for clinician review
        </Button>
      </ActionBar>
    </Screen>
  );
}
