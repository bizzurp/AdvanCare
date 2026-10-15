import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { AttachmentPicker, attachmentFiles, type AttachmentMeta } from '../components/Scheduling';
import {
  ActionBar,
  Banner,
  Button,
  Checkbox,
  ChoiceGroup,
  ChoiceRow,
  DependencyNote,
  DetailRow,
  PageHeader,
  Screen,
  Segmented,
  SelectField,
  Stepper,
  TextArea,
  TextField,
} from '../components/ui';
import { ApiError, isDemoMode, uploadFile } from '../services/api';
import { DEPENDENCIES, peso, SHIFT_RATES, VEHICLES, type VehicleCategory } from '../data/catalog';
import { DEMO_FACILITIES, DEMO_GPS } from '../data/demo';
import { useApp, useDraft } from '../state/AppState';
import { addDays, combine, formatDay, formatTime, formatWhen, toDateInput, useSubmitRequest } from './requestUtils';

const MIN_NOTICE_HOURS = 12; // Pilot: pre-scheduled bookings only (prompt pack §1, Response SLAs).
const hoursUntil = (d: Date) => (d.getTime() - Date.now()) / 36e5;

// ---------------- 08 / Prescription → 25 Attachment → 17 Review ----------------
interface RxDraft {
  type: 'refill' | 'new';
  doctorId: string;
  consultDate: string;
  medicines: string;
  fulfillment: 'pickup' | 'delivery';
  attachment?: AttachmentMeta;
}

const RX_KEY = 'prescription';
const rxInit = (): RxDraft => ({ type: 'refill', doctorId: DEMO_GPS[0].id, consultDate: toDateInput(new Date()), medicines: '', fulfillment: 'pickup' });

export function Prescription() {
  const navigate = useNavigate();
  const [d, set] = useDraft<RxDraft>(RX_KEY, rxInit);
  const [err, setErr] = useState('');
  const doc = DEMO_GPS.find((g) => g.id === d.doctorId)!;
  return (
    <Screen>
      <PageHeader title="Medical prescription" back="/services" />
      <div className="screen-body stack gap-24">
        <Stepper steps={['Details', 'Review', 'Sent']} current={0} />
        <h2 className="t-h2">
          Your consultation
          <br />
          details, in one place.
        </h2>
        <Segmented
          label="Request type"
          value={d.type}
          onChange={(type) => set({ type })}
          options={[
            { value: 'refill', label: 'Refill' },
            { value: 'new', label: 'New prescription' },
          ]}
        />
        <SelectField label="Doctor" options={DEMO_GPS.map((g) => ({ value: g.id, label: g.name }))} value={d.doctorId} onChange={(e) => set({ doctorId: e.target.value })} hint={`${doc.specialty} · demo roster`} />
        <TextField label="Date of consultation" type="date" max={toDateInput(new Date())} value={d.consultDate} onChange={(e) => set({ consultDate: e.target.value })} />
        <TextArea
          label={d.type === 'refill' ? 'Medicines to refill' : 'Medicines prescribed (if known)'}
          placeholder="Name and strength, as written on the prescription"
          value={d.medicines}
          onChange={(e) => {
            set({ medicines: e.target.value });
            setErr('');
          }}
          error={err}
        />
        <section className="stack gap-12">
          <h3 className="t-section">Prescription attachment</h3>
          <p className="t-small t-muted" style={{ marginTop: -8 }}>
            {d.type === 'new' ? 'Add a photo of the prescription from your RHU or clinic.' : 'Optional · Add a previous prescription for context.'}
          </p>
          <AttachmentPicker draftKey={RX_KEY} value={d.attachment} onChange={(attachment) => set({ attachment })} label="Choose how to add your prescription." />
        </section>
        <section className="stack gap-12">
          <h3 className="t-section">How will you get it?</h3>
          <ChoiceGroup label="Fulfillment">
            <ChoiceRow icon="medical-kit" title="Pick up at the barangay health center" desc="DoH Yakap medicines are coordinated with your BHW" selected={d.fulfillment === 'pickup'} onSelect={() => set({ fulfillment: 'pickup' })} />
            <ChoiceRow icon="bus" title="Home delivery" desc="Delivery fee confirmed by the care team" selected={d.fulfillment === 'delivery'} onSelect={() => set({ fulfillment: 'delivery' })} />
          </ChoiceGroup>
        </section>
      </div>
      <ActionBar>
        <Button
          onClick={() => {
            if (d.type === 'refill' && d.medicines.trim().length < 3) {
              setErr('List the medicines you need refilled.');
              return;
            }
            if (d.type === 'new' && !d.attachment && d.medicines.trim().length < 3) {
              setErr('Add a photo of the prescription or list the medicines.');
              return;
            }
            navigate('/services/prescription/review');
          }}
        >
          Review request
        </Button>
      </ActionBar>
    </Screen>
  );
}

export function PrescriptionReview() {
  const [d, , clear] = useDraft<RxDraft>(RX_KEY, rxInit);
  const { submit, submitting, error } = useSubmitRequest();
  const { session } = useApp();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const doc = DEMO_GPS.find((g) => g.id === d.doctorId)!;
  return (
    <Screen>
      <PageHeader title="Review prescription" />
      <div className="screen-body stack gap-20">
        <Stepper steps={['Details', 'Review', 'Sent']} current={1} />
        <h2 className="t-h2">Check before you send.</h2>
        <DetailRow icon="stethoscope" label="Doctor" value={doc.name} />
        <DetailRow icon="calendar" label="Consultation" value={formatDay(d.consultDate)} />
        <DetailRow icon="document-medicine" label={d.type === 'refill' ? 'Refill' : 'New prescription'} value={d.medicines || 'See attachment'} />
        <DetailRow icon="document-text" label="Attachment" value={d.attachment ? d.attachment.name : 'No attachment added'} />
        <DetailRow icon={d.fulfillment === 'pickup' ? 'medical-kit' : 'bus'} label="Fulfillment" value={d.fulfillment === 'pickup' ? 'Pick up at the barangay health center' : 'Home delivery'} />
        <p className="row gap-8 t-caption t-muted">
          <Icon name="shield-check" size={16} /> Your doctor will review the request.
        </p>
        {d.attachment && isDemoMode && <DependencyNote title="Upload">Demo mode: only the file name is saved; the photo isn’t sent.</DependencyNote>}
        <DependencyNote title={isDemoMode ? undefined : 'How this works'}>{isDemoMode ? DEPENDENCIES.api : DEPENDENCIES.prescription}</DependencyNote>
        {uploadError && <Banner tone="error">{uploadError}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      <ActionBar>
        <Button
          loading={submitting || uploading}
          onClick={async () => {
            // Connected: upload the photo first, then attach it to the request by id.
            let uploadIds: string[] = [];
            const file = attachmentFiles.get(RX_KEY);
            if (!isDemoMode && file && session && !session.demo) {
              setUploading(true);
              setUploadError('');
              try {
                uploadIds = [await uploadFile(file, session.accessToken)];
              } catch (e) {
                setUploadError(e instanceof ApiError ? e.message : 'The photo could not be uploaded.');
                return;
              } finally {
                setUploading(false);
              }
            }
            void submit({
              kind: 'prescription',
              summary: `${d.type === 'refill' ? 'Refill' : 'New prescription'} · ${doc.name}`,
              details: [
                { label: 'Doctor', value: doc.name, icon: 'stethoscope' },
                { label: 'Consultation', value: formatDay(d.consultDate), icon: 'calendar' },
                { label: 'Medicines', value: d.medicines || 'See attachment', icon: 'document-medicine' },
                { label: 'Attachment', value: d.attachment?.name ?? 'None', icon: 'document-text' },
                { label: 'Fulfillment', value: d.fulfillment === 'pickup' ? 'Pickup at barangay health center' : 'Home delivery', icon: 'medical-kit' },
              ],
              payload: { ...d, uploadIds },
              onDone: clear,
            });
          }}
        >
          Submit request
        </Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- 09 / Non-emergency transport (public / private) ----------------
interface TransportDraft {
  pickup: string;
  destination: string;
  when: string; // datetime-local
  category: VehicleCategory;
  vehicle: string;
  escort: boolean;
  returnTrip: boolean;
  notes: string;
}

export function Transport() {
  const { profile } = useApp();
  const tomorrow = addDays(new Date(), 1);
  const [d, set, clear] = useDraft<TransportDraft>('transport', () => ({
    pickup: `${profile.sitio ? profile.sitio + ', ' : ''}Brgy. ${profile.barangay}, ${profile.municipality}`,
    destination: DEMO_FACILITIES[0].name,
    when: `${toDateInput(tomorrow)}T08:00`,
    category: 'public',
    vehicle: '',
    escort: false,
    returnTrip: false,
    notes: '',
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { submit, submitting, error } = useSubmitRequest();
  const vehicles = VEHICLES[d.category];
  const vehicle = vehicles.find((v) => v.id === d.vehicle);
  const suggestAccessible = /wheelchair|bedridden/i.test(profile.mobility);

  const book = () => {
    const e: Record<string, string> = {};
    if (d.pickup.trim().length < 5) e.pickup = 'Enter the pickup location.';
    const at = new Date(d.when);
    if (!d.when || Number.isNaN(at.getTime())) e.when = 'Choose a date and time.';
    else if (hoursUntil(at) < MIN_NOTICE_HOURS) e.when = `Book at least ${MIN_NOTICE_HOURS} hours ahead. For emergencies, call 911.`;
    if (!vehicle) e.vehicle = 'Choose a vehicle.';
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector('.field-error')?.scrollIntoView({ block: 'center' }));
      return;
    }
    void submit({
      kind: 'transport',
      summary: `${vehicle!.title} to ${d.destination}`,
      scheduledFor: at.toISOString(),
      details: [
        { label: 'Pickup location', value: d.pickup, icon: 'map-point' },
        { label: 'Destination', value: d.destination, icon: 'map-point-hospital' },
        { label: 'Vehicle', value: `${d.category === 'public' ? 'Public' : 'Private'} · ${vehicle!.title}`, icon: 'bus' },
        { label: 'Medical escort', value: d.escort ? 'Requested' : 'Not needed', icon: 'user-heart' },
        { label: 'Return trip', value: d.returnTrip ? 'Requested' : 'One way', icon: 'arrow-right' },
        ...(d.notes ? [{ label: 'Notes', value: d.notes, icon: 'document-text' as const }] : []),
      ],
      payload: { ...d, vehicleId: d.vehicle, pickupTime: at.toISOString() },
      onDone: clear,
    });
  };

  return (
    <Screen>
      <PageHeader title="Non-emergency transport" back="/services" />
      <div className="screen-body stack gap-24">
        <h2 className="t-h2">
          A smoother journey
          <br />
          to your next visit.
        </h2>
        <div className="card stack gap-16">
          <TextField label="Pickup location" value={d.pickup} onChange={(e) => set({ pickup: e.target.value })} error={errors.pickup} />
          <SelectField
            label="Destination"
            options={DEMO_FACILITIES.map((f) => f.name)}
            value={d.destination}
            onChange={(e) => set({ destination: e.target.value })}
            hint="Facility list pending verification for the pilot area."
          />
        </div>
        <TextField
          label="Date & time"
          type="datetime-local"
          min={`${toDateInput(new Date())}T00:00`}
          value={d.when}
          onChange={(e) => set({ when: e.target.value })}
          error={errors.when}
          hint={`Pickup is scheduled at least ${MIN_NOTICE_HOURS} hours ahead.`}
        />
        <section className="stack gap-12">
          <h3 className="t-section">Choose your vehicle</h3>
          <Segmented
            label="Vehicle type"
            value={d.category}
            onChange={(category) => set({ category, vehicle: '' })}
            options={[
              { value: 'public', label: 'Public vehicle' },
              { value: 'private', label: 'Private vehicle' },
            ]}
          />
          <p className="t-caption t-muted">{d.category === 'public' ? 'Arranged with local tricycle, multicab, and van operators.' : 'Dedicated vehicle for the client and companion.'}</p>
          {suggestAccessible && d.category === 'public' && (
            <Banner tone="warn" icon="user-heart">
              {profile.fullName.split(' ')[0]}’s profile says “{profile.mobility}”. A private accessible vehicle may be needed.
            </Banner>
          )}
          <ChoiceGroup label={`${d.category} vehicles`}>
            {vehicles.map((v) => (
              <ChoiceRow key={v.id} icon={v.icon} title={v.title} desc={v.desc} selected={d.vehicle === v.id} onSelect={() => set({ vehicle: v.id })} />
            ))}
          </ChoiceGroup>
          {errors.vehicle && <span className="field-error" role="alert">{errors.vehicle}</span>}
        </section>
        <section>
          <Checkbox label="Add a medical escort" desc="A trained caregiver accompanies the client through clinic lines" checked={d.escort} onChange={(v) => set({ escort: v })} />
          <Checkbox label="Book a return trip" desc="The care team schedules the trip home" checked={d.returnTrip} onChange={(v) => set({ returnTrip: v })} />
        </section>
        <TextArea label="Notes for the driver (optional)" placeholder="Landmarks, number of companions, things to bring" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
        <p className="row gap-8 t-caption t-muted">
          <Icon name="shield-check" size={16} /> For scheduled trips. Not for emergencies. Fare is confirmed by the care team before the trip.
        </p>
        <DependencyNote title={isDemoMode ? undefined : 'How this works'}>{isDemoMode ? DEPENDENCIES.api : DEPENDENCIES.transport}</DependencyNote>
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      <ActionBar>
        <Button onClick={book} loading={submitting}>
          Book transport
        </Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- 10 / Home caregiver, 11 / CVMC caregiver, 23 / Edit visit ----------------
interface VisitDraft {
  location: string;
  date: string;
  start: string; // "8:00 AM"
  ward: string;
  tasks: string[];
  notes: string;
}

type CareKind = 'home-caregiver' | 'cvmc-caregiver';

const START_TIMES = ['6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '2:00 PM', '10:00 PM'];
const HOME_TASKS = ['Bathing and grooming', 'Vital signs monitoring', 'Meal preparation and feeding', 'Mobility and exercises', 'Respite for family'];

function useVisit(kind: CareKind) {
  const { profile } = useApp();
  return useDraft<VisitDraft>(kind, () => ({
    location: kind === 'cvmc-caregiver' ? 'Cagayan Valley Medical Center' : `${profile.sitio ? profile.sitio + ', ' : ''}Brgy. ${profile.barangay}, ${profile.municipality}`,
    date: toDateInput(addDays(new Date(), 1)),
    start: '8:00 AM',
    ward: '',
    tasks: [],
    notes: '',
  }));
}

const shiftRange = (date: string, start: string) => {
  const s = combine(date, start);
  const e = new Date(s.getTime() + 8 * 36e5);
  return { s, e, label: `${formatDay(s.toISOString())} · ${formatTime(s.toISOString())}–${formatTime(e.toISOString())}` };
};

export function CaregiverRequest({ kind }: { kind: CareKind }) {
  const [d, set, clear] = useVisit(kind);
  const { submit, submitting, error } = useSubmitRequest();
  const [timeErr, setTimeErr] = useState('');
  const isCvmc = kind === 'cvmc-caregiver';
  const rate = isCvmc ? SHIFT_RATES.CVMC_INSTITUTIONAL_500 : SHIFT_RATES.BGAY_HOME_300;
  const range = shiftRange(d.date, d.start);

  const request = () => {
    if (hoursUntil(range.s) < MIN_NOTICE_HOURS) {
      setTimeErr(`Shifts are booked at least ${MIN_NOTICE_HOURS} hours ahead. Change the visit details.`);
      return;
    }
    setTimeErr('');
    void submit({
      kind,
      summary: `${isCvmc ? 'Institutional' : 'General'} caregiver · 8 hours`,
      scheduledFor: range.s.toISOString(),
      details: [
        { label: 'Care location', value: d.location + (d.ward ? ` · ${d.ward}` : ''), icon: isCvmc ? 'hospital' : 'map-point' },
        { label: 'Shift', value: range.label, icon: 'calendar' },
        { label: 'Rate', value: `${peso(rate.gross)} for 8 hours · ${peso(rate.caregiver)} to caregiver`, icon: 'shield-check' },
        ...(d.tasks.length ? [{ label: 'Care needed', value: d.tasks.join(', '), icon: 'user-heart' as const }] : []),
        ...(d.notes ? [{ label: 'Notes', value: d.notes, icon: 'document-text' as const }] : []),
      ],
      payload: {
        shiftTier: isCvmc ? 'CVMC_INSTITUTIONAL_500' : 'BGAY_HOME_300',
        scheduledDate: d.date,
        scheduledStartTime: range.s.toISOString(),
        locationDetails: [d.location, d.ward, d.notes].filter(Boolean).join(' · '),
        tasks: d.tasks,
      },
      onDone: clear,
    });
  };

  return (
    <Screen>
      <PageHeader title={isCvmc ? 'CVMC caregiver' : 'Home-based caregiver'} back="/services" />
      <div className="screen-body stack gap-24">
        <h2 className="t-h2">
          {isCvmc ? 'Compassionate support,' : 'A helping hand,'}
          <br />
          {isCvmc ? 'through your stay.' : 'in the comfort of home.'}
        </h2>
        <div className="card stack gap-16">
          <DetailRow icon={isCvmc ? 'hospital' : 'map-point'} label="Care location" value={d.location + (d.ward ? ` · ${d.ward}` : '')} />
          <hr className="divider" />
          <DetailRow icon="calendar" label="Date & time" value={range.label} />
        </div>
        <Link to={`/services/${kind}/visit`} className="link-btn" style={{ marginTop: -12 }}>
          Edit visit details
        </Link>
        {timeErr && <Banner tone="error">{timeErr}</Banner>}
        <section className="stack gap-12">
          <h3 className="t-section">Caregiver type</h3>
          <ChoiceGroup label="Caregiver type">
            {isCvmc ? (
              <ChoiceRow icon="hospital" title="Institutional caregiver" desc={`${peso(500)} for 8 hours · bedside watcher`} selected onSelect={() => undefined} />
            ) : (
              <>
                <ChoiceRow icon="user-heart" title="General caregiver" desc={`${peso(300)} for 8 hours`} selected onSelect={() => undefined} />
                <ChoiceRow
                  icon="medical-kit"
                  title="Specialized caregiver"
                  desc="Not yet available"
                  selected={false}
                  disabled
                  onSelect={() => undefined}
                  trailingNote={<span className="badge badge-pending mt-4">Pending catalog approval</span>}
                />
              </>
            )}
          </ChoiceGroup>
        </section>
        {!isCvmc && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="t-section">Care needed (optional)</legend>
            {HOME_TASKS.map((t) => (
              <Checkbox key={t} label={t} checked={d.tasks.includes(t)} onChange={(v) => set({ tasks: v ? [...d.tasks, t] : d.tasks.filter((x) => x !== t) })} />
            ))}
          </fieldset>
        )}
        <div className="card card-mint">
          <div className="row between">
            <span className="t-medium">8-hour visit</span>
            <span className="price" style={{ fontSize: 24, color: 'var(--teal)' }}>
              {peso(rate.gross)}
            </span>
          </div>
          <p className="t-caption t-muted mt-4">
            {peso(rate.caregiver)} goes to your caregiver · {peso(rate.platform)} supports AdvanCare coordination. Paid after the shift by cash or GCash.
          </p>
        </div>
        {isCvmc && (
          <DependencyNote title="Provisional">CVMC ward access for AdvanCare caregivers awaits a coordination letter with CVMC Nursing Administration.</DependencyNote>
        )}
        {isDemoMode && <DependencyNote>{DEPENDENCIES.caregiver}</DependencyNote>}
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      <ActionBar>
        <Button onClick={request} loading={submitting}>
          Request caregiver
        </Button>
      </ActionBar>
    </Screen>
  );
}

export function EditVisit() {
  const { kind } = useParams();
  const navigate = useNavigate();
  const valid = kind === 'home-caregiver' || kind === 'cvmc-caregiver';
  const [d, set] = useVisit((valid ? kind : 'home-caregiver') as CareKind);
  const [local, setLocal] = useState(d);
  const [err, setErr] = useState<Record<string, string>>({});
  if (!valid) return <Navigate to="/services" replace />;
  const isCvmc = kind === 'cvmc-caregiver';
  const range = shiftRange(local.date, local.start);

  const save = () => {
    const e: Record<string, string> = {};
    if (local.location.trim().length < 5) e.location = 'Enter where care is needed.';
    if (hoursUntil(range.s) < MIN_NOTICE_HOURS) e.date = `Choose a start at least ${MIN_NOTICE_HOURS} hours from now.`;
    setErr(e);
    if (Object.keys(e).length) return;
    set(local);
    navigate(-1);
  };

  return (
    <Screen>
      <PageHeader title="Visit details" />
      <div className="screen-body stack gap-20">
        <h2 className="t-h2">Choose where and when you need care.</h2>
        <TextField label="Location" value={local.location} onChange={(e) => setLocal({ ...local, location: e.target.value })} error={err.location} readOnly={isCvmc} hint={isCvmc ? 'CVMC shifts are at Cagayan Valley Medical Center.' : undefined} />
        {isCvmc && <TextField label="Ward and bed (optional)" placeholder="Medical Ward 2, Bed 19" value={local.ward} onChange={(e) => setLocal({ ...local, ward: e.target.value })} />}
        <TextField label="Date" type="date" min={toDateInput(new Date())} value={local.date} onChange={(e) => setLocal({ ...local, date: e.target.value })} error={err.date} />
        <SelectField label="Start time" options={START_TIMES} value={local.start} onChange={(e) => setLocal({ ...local, start: e.target.value })} hint={`8-hour shift · ends ${formatTime(range.e.toISOString())}`} />
        <TextArea label="Notes for the caregiver (optional)" value={local.notes} onChange={(e) => setLocal({ ...local, notes: e.target.value })} />
        <p className="t-caption t-muted">Shifts are pre-scheduled at least {MIN_NOTICE_HOURS} hours ahead. Earliest start: {formatWhen(new Date(Date.now() + MIN_NOTICE_HOURS * 36e5).toISOString())}.</p>
      </div>
      <ActionBar>
        <Button onClick={save}>Save visit details</Button>
      </ActionBar>
    </Screen>
  );
}
