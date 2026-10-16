import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import {
  ActionBar,
  Button,
  Checkbox,
  ChoiceGroup,
  ChoiceRow,
  DependencyNote,
  LinkButton,
  PageHeader,
  Screen,
  SelectField,
  TextArea,
  TextField,
} from '../components/ui';
import { CONDITIONS, DEPENDENCIES, LANGUAGES, MOBILITY, MUNICIPALITIES, SCOPE_LABELS } from '../data/catalog';
import { DEMO_BARANGAYS } from '../data/demo';
import type { ClientProfile, DelegationScope } from '../data/types';
import { syncClient } from '../services/api';
import { useApp } from '../state/AppState';
import { EmailCode, normalizeLocal } from './Auth';

type Who = 'self' | 'dependent' | 'bhw';

interface RegForm {
  who: Who;
  language: string;
  fullName: string;
  mobile: string;
  dateOfBirth: string;
  gender: string;
  philhealthId: string;
  municipality: string;
  barangay: string;
  sitio: string;
  landmarkNotes: string;
  conditions: string[];
  mobility: string;
  allergies: string;
  primaryLanguage: string;
  sponsorName: string;
  sponsorRelationship: string;
  sponsorPhone: string;
  sponsorRemote: boolean;
  sponsorLocation: string;
  scopes: DelegationScope[];
  consent: boolean;
}

const EMPTY: RegForm = {
  who: 'self',
  language: 'English',
  fullName: '',
  mobile: '',
  dateOfBirth: '',
  gender: '',
  philhealthId: '',
  municipality: '',
  barangay: '',
  sitio: '',
  landmarkNotes: '',
  conditions: [],
  mobility: '',
  allergies: '',
  primaryLanguage: 'Ilocano',
  sponsorName: '',
  sponsorRelationship: '',
  sponsorPhone: '',
  sponsorRemote: false,
  sponsorLocation: '',
  scopes: ['SCOPE_CARE_NOTES_VIEW', 'SCOPE_FINANCIAL_SPONSOR'],
  consent: false,
};

const STEPS = ['Email', 'About you', 'Personal details', 'Home address', 'Health background', 'Family contact', 'Privacy consent'];

type Errors = Partial<Record<keyof RegForm, string>>;

function validate(step: number, f: RegForm): Errors {
  const e: Errors = {};
  if (step === 2) {
    if (f.fullName.trim().length < 2) e.fullName = 'Enter the client’s full name.';
    if (!/^9\d{9}$/.test(normalizeLocal(f.mobile))) e.mobile = 'Enter a Philippine mobile number, like 0917 123 4567.';
    if (!f.dateOfBirth) e.dateOfBirth = 'Enter the date of birth.';
    else if (new Date(f.dateOfBirth) > new Date()) e.dateOfBirth = 'Date of birth can’t be in the future.';
    if (!f.gender) e.gender = 'Choose an option.';
  }
  if (step === 3) {
    if (!f.municipality) e.municipality = 'Choose a municipality.';
    if (!f.barangay) e.barangay = 'Choose a barangay.';
    if (!f.sitio.trim()) e.sitio = 'Enter the sitio or purok.';
    if (f.landmarkNotes.trim().length < 5) e.landmarkNotes = 'Describe a landmark so caregivers can find the home.';
  }
  if (step === 4) {
    if (!f.mobility) e.mobility = 'Choose the client’s mobility.';
  }
  if (step === 5 && (f.sponsorName || f.sponsorPhone || f.who === 'dependent')) {
    if (f.sponsorName.trim().length < 2) e.sponsorName = 'Enter the family member’s name.';
    if (!f.sponsorRelationship.trim()) e.sponsorRelationship = 'Enter the relationship.';
    if (!/^9\d{9}$/.test(normalizeLocal(f.sponsorPhone))) e.sponsorPhone = 'Enter a Philippine mobile number, like 0918 765 4321.';
  }
  if (step === 6 && !f.consent) e.consent = 'Consent is required to create the record.';
  return e;
}

export function Register() {
  const navigate = useNavigate();
  const { signIn, updateProfile, session } = useApp();
  const [step, setStep] = useState(session ? 1 : 0);
  const [form, setForm] = useState<RegForm>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [synced, setSynced] = useState<'yes' | 'no' | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const set = (p: Partial<RegForm>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    window.scrollTo({ top: 0 });
    bodyRef.current?.querySelector<HTMLElement>('h2')?.focus();
  }, [step, done]);

  const next = async () => {
    const e = validate(step, form);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => bodyRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .field-error')?.scrollIntoView({ block: 'center' }));
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    const profile: ClientProfile = {
      id: `local-${Date.now()}`,
      clientCode: 'Pending',
      fullName: form.fullName.trim(),
      dateOfBirth: form.dateOfBirth,
      gender: form.gender,
      phone: `+63${normalizeLocal(form.mobile)}`,
      municipality: form.municipality,
      barangay: form.barangay,
      sitio: form.sitio.trim(),
      landmarkNotes: form.landmarkNotes.trim(),
      conditions: form.conditions,
      mobility: form.mobility,
      allergies: form.allergies.trim() || 'None known',
      primaryLanguage: form.primaryLanguage,
      philhealthId: form.philhealthId || undefined,
      planStatus: 'none',
      family: form.sponsorName
        ? [
            {
              id: `fam-${Date.now()}`,
              name: form.sponsorName.trim(),
              relationship: form.sponsorRelationship.trim(),
              phone: `+63${normalizeLocal(form.sponsorPhone)}`,
              isPrimary: true,
              isRemoteSponsor: form.sponsorRemote,
              location: form.sponsorLocation || undefined,
              scopes: form.scopes,
            },
          ]
        : [],
    };
    updateProfile(profile);
    // Copy it to the server now (bookings also re-send it, so a failure here isn't final).
    if (session) {
      try {
        await syncClient(profile, session.accessToken);
        setSynced('yes');
      } catch {
        setSynced('no');
      }
    } else {
      await new Promise((r) => setTimeout(r, 300));
    }
    setSaving(false);
    setDone(true);
  };

  const back = () => (step <= (session ? 1 : 0) ? navigate(-1) : setStep(step - 1));
  const barangays = DEMO_BARANGAYS[form.municipality] ?? [];
  const subject = form.who === 'self' ? 'your' : 'the client’s';

  if (done)
    return (
      <Screen>
        <PageHeader title="Registration" back={false} />
        <div className="screen-body stack gap-20" ref={bodyRef}>
          <span className="avatar lg" style={{ marginTop: 24 }}>
            <Icon name="check-circle" size={32} />
          </span>
          <h2 className="t-h1" tabIndex={-1}>
            {form.fullName.split(' ')[0]}’s record
            <br />
            {synced === 'yes' ? 'is saved.' : 'is ready on this device.'}
          </h2>
          <p className="t-body t-muted">Next, choose a care plan or request a service. Your BHW can help with membership and subsidy verification.</p>
          {synced === 'no' && <DependencyNote>We couldn’t reach AdvanCare just now. The record is saved on this phone and will be sent with your first request.</DependencyNote>}
        </div>
        <ActionBar>
          <LinkButton to="/plans">Choose a care plan</LinkButton>
          <LinkButton to="/home" variant="secondary">
            Go to home
          </LinkButton>
        </ActionBar>
      </Screen>
    );

  return (
    <Screen>
      <PageHeader title="Create an account" back={back} />
      <div className="screen-body stack gap-24" ref={bodyRef}>
        <div>
          <p className="t-caption t-muted">
            Step {step + 1} of {STEPS.length} · {STEPS[step]}
          </p>
          <div style={{ height: 4, background: 'var(--line)', borderRadius: 2, marginTop: 8 }} aria-hidden="true">
            <div style={{ height: 4, width: `${((step + 1) / STEPS.length) * 100}%`, background: 'var(--teal)', borderRadius: 2, transition: 'width var(--motion-onboarding) var(--ease-out)' }} />
          </div>
        </div>

        {step === 0 && (
          <>
            <h2 className="t-h2" tabIndex={-1}>
              Start with your email address.
            </h2>
            <EmailCode
              mode="register"
              onVerified={(email, r) => {
                signIn({ email, accessToken: r.accessToken, role: 'household' });
                setStep(1);
              }}
            />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="t-h2" tabIndex={-1}>
              Who are you registering?
            </h2>
            <ChoiceGroup label="Who are you registering">
              <ChoiceRow icon="user-rounded" title="Myself" desc="I will receive care" selected={form.who === 'self'} onSelect={() => set({ who: 'self' })} />
              <ChoiceRow icon="users-group-rounded" title="A parent or dependent" desc="I’ll manage care and payments for them" selected={form.who === 'dependent'} onSelect={() => set({ who: 'dependent' })} />
              <ChoiceRow icon="medical-kit" title="A client, as their BHW" desc="Assisted registration by a Barangay Health Worker" selected={form.who === 'bhw'} onSelect={() => set({ who: 'bhw' })} />
            </ChoiceGroup>
            <SelectField label="App language" options={LANGUAGES} value={form.language} onChange={(e) => set({ language: e.target.value })} hint={form.language !== 'English' ? DEPENDENCIES.localization : undefined} />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="t-h2" tabIndex={-1}>
              {form.who === 'self' ? 'Tell us about yourself.' : 'Tell us about the client.'}
            </h2>
            <TextField label="Full name" autoComplete={form.who === 'self' ? 'name' : 'off'} value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} error={errors.fullName} />
            <TextField
              label="Mobile number"
              lead="+63"
              inputMode="tel"
              autoComplete={form.who === 'self' ? 'tel-national' : 'off'}
              placeholder="917 123 4567"
              value={form.mobile}
              onChange={(e) => set({ mobile: e.target.value })}
              error={errors.mobile}
              hint="So the caregiver and coordinator can call. It isn’t used to sign in."
            />
            <TextField label="Date of birth" type="date" value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ dateOfBirth: e.target.value })} error={errors.dateOfBirth} />
            <SelectField label="Gender" placeholder="Choose" options={['Female', 'Male', 'Prefer not to say']} value={form.gender} onChange={(e) => set({ gender: e.target.value })} error={errors.gender} />
            <TextField label="PhilHealth ID (optional)" inputMode="numeric" value={form.philhealthId} onChange={(e) => set({ philhealthId: e.target.value })} />
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="t-h2" tabIndex={-1}>
              Where can caregivers find {form.who === 'self' ? 'you' : 'the client'}?
            </h2>
            <SelectField label="Municipality" placeholder="Choose municipality" options={MUNICIPALITIES} value={form.municipality} onChange={(e) => set({ municipality: e.target.value, barangay: '' })} error={errors.municipality} />
            <SelectField
              label="Barangay"
              placeholder={form.municipality ? 'Choose barangay' : 'Choose a municipality first'}
              options={barangays}
              value={form.barangay}
              disabled={!form.municipality}
              onChange={(e) => set({ barangay: e.target.value })}
              error={errors.barangay}
              hint="Pilot barangays in this municipality."
            />
            <TextField label="Sitio or purok" value={form.sitio} onChange={(e) => set({ sitio: e.target.value })} error={errors.sitio} />
            <TextArea
              label="Landmark directions"
              placeholder="Near yellow chapel, purok 2, blue gate"
              value={form.landmarkNotes}
              onChange={(e) => set({ landmarkNotes: e.target.value })}
              error={errors.landmarkNotes}
              hint="Required. Many sitios have no street address."
            />
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="t-h2" tabIndex={-1}>
              Health background
            </h2>
            <p className="t-body t-muted" style={{ marginTop: -12 }}>
              This helps match the right caregiver. Share only what {subject === 'your' ? 'you’re' : 'the client is'} comfortable sharing.
            </p>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field-label">Long-term conditions</legend>
              {CONDITIONS.map((c) => (
                <Checkbox
                  key={c}
                  label={c}
                  checked={form.conditions.includes(c)}
                  onChange={(v) => set({ conditions: v ? [...form.conditions, c] : form.conditions.filter((x) => x !== c) })}
                />
              ))}
            </fieldset>
            <SelectField label="Mobility" placeholder="Choose" options={MOBILITY} value={form.mobility} onChange={(e) => set({ mobility: e.target.value })} error={errors.mobility} />
            <TextField label="Drug or food allergies (optional)" value={form.allergies} onChange={(e) => set({ allergies: e.target.value })} />
            <SelectField label="Primary language" options={LANGUAGES} value={form.primaryLanguage} onChange={(e) => set({ primaryLanguage: e.target.value })} />
          </>
        )}

        {step === 5 && (
          <>
            <h2 className="t-h2" tabIndex={-1}>
              Add a family contact
            </h2>
            <p className="t-body t-muted" style={{ marginTop: -12 }}>
              {form.who === 'dependent' ? 'Required when registering a dependent.' : 'Optional. Family members abroad can receive updates and pay for care.'}
            </p>
            <TextField label="Name" value={form.sponsorName} onChange={(e) => set({ sponsorName: e.target.value })} error={errors.sponsorName} />
            <TextField label="Relationship to client" placeholder="Son, daughter, spouse…" value={form.sponsorRelationship} onChange={(e) => set({ sponsorRelationship: e.target.value })} error={errors.sponsorRelationship} />
            <TextField label="Mobile number" lead="+63" inputMode="tel" value={form.sponsorPhone} onChange={(e) => set({ sponsorPhone: e.target.value })} error={errors.sponsorPhone} />
            <Checkbox label="Lives outside Cagayan or abroad" desc="Receives digital care updates" checked={form.sponsorRemote} onChange={(v) => set({ sponsorRemote: v })} />
            {form.sponsorRemote && <TextField label="City or country" value={form.sponsorLocation} onChange={(e) => set({ sponsorLocation: e.target.value })} />}
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="field-label">What can this person do?</legend>
              {(Object.keys(SCOPE_LABELS) as DelegationScope[]).map((s) => (
                <Checkbox
                  key={s}
                  label={SCOPE_LABELS[s].title}
                  desc={SCOPE_LABELS[s].desc}
                  checked={form.scopes.includes(s)}
                  onChange={(v) => set({ scopes: v ? [...form.scopes, s] : form.scopes.filter((x) => x !== s) })}
                />
              ))}
            </fieldset>
          </>
        )}

        {step === 6 && (
          <>
            <h2 className="t-h2" tabIndex={-1}>
              Your privacy
            </h2>
            <div className="card stack gap-12 t-small">
              <p>AdvanCare keeps health information to coordinate care between {subject === 'your' ? 'you' : 'the client'}, family, caregivers, and health providers.</p>
              <p>Information is shared only with people and providers involved in care, and with family members according to the permissions you set.</p>
              <p>You can ask to see, correct, or stop the use of this information under the Data Privacy Act of 2012.</p>
            </div>
            <Checkbox
              label={form.who === 'self' ? 'I agree to the use of my information as described.' : 'The client (or their guardian) agrees to the use of their information as described.'}
              checked={form.consent}
              onChange={(v) => set({ consent: v })}
            />
            {errors.consent && (
              <span className="field-error" role="alert">
                {errors.consent}
              </span>
            )}
            <DependencyNote title="Pending approval">The final consent wording needs legal review before the pilot.</DependencyNote>
          </>
        )}
      </div>
      {step > 0 && (
        <ActionBar>
          <Button onClick={() => void next()} loading={saving}>
            {step === STEPS.length - 1 ? 'Create record' : step === 5 && !form.sponsorName && form.who !== 'dependent' ? 'Skip for now' : 'Continue'}
          </Button>
        </ActionBar>
      )}
    </Screen>
  );
}
