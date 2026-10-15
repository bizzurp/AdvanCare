import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ActionBar,
  Badge,
  Banner,
  Button,
  Checkbox,
  ChoiceGroup,
  ChoiceRow,
  DependencyNote,
  DetailRow,
  LinkButton,
  PageHeader,
  Screen,
  Segmented,
  SelectField,
  ServiceRow,
  StatusBadge,
  TextArea,
  TextField,
} from '../components/ui';
import { DEPENDENCIES, LANGUAGES, MUNICIPALITIES, PAYMENT_METHODS, PLANS, SCOPE_LABELS, serviceIcon, serviceTitle } from '../data/catalog';
import { DEMO_BARANGAYS } from '../data/demo';
import type { DelegationScope, FamilyMember } from '../data/types';
import { isDemoMode } from '../services/api';
import { useApp } from '../state/AppState';
import { formatPhone, normalizeLocal } from './Auth';
import { planStatusText } from './Main';
import { formatWhen } from './requestUtils';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

function age(dob: string) {
  const d = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

// ---------------- 05 / Profile + 18 / Family profile ----------------
export function Profile({ tab }: { tab: 'client' | 'family' }) {
  const navigate = useNavigate();
  const { profile, requests } = useApp();
  const plan = PLANS.find((p) => p.id === profile.planId);
  const recent = requests.slice(0, 3);
  return (
    <Screen nav="more">
      <PageHeader title={tab === 'client' ? 'Client profile' : 'Family profile'} />
      <div className="screen-body stack gap-24">
        <Segmented
          label="Profile sections"
          value={tab}
          onChange={(v) => navigate(v === 'client' ? '/profile' : '/profile/family', { replace: true })}
          options={[
            { value: 'client', label: 'Client info' },
            { value: 'family', label: 'Family' },
          ]}
        />
        {tab === 'client' ? (
          <>
            <div className="row gap-16">
              <span className="avatar lg">{initials(profile.fullName)}</span>
              <div className="stack gap-4">
                <h2 className="t-section" style={{ fontSize: 20 }}>
                  {profile.fullName}
                </h2>
                <span className="t-caption t-muted">Client ID · {profile.clientCode}</span>
                <span>
                  <Badge tone={profile.clientCode === 'Pending' ? 'pending' : 'success'}>{profile.clientCode === 'Pending' ? 'Saved on device' : 'Registered client'}</Badge>
                </span>
              </div>
            </div>
            <hr className="divider" />
            <section className="stack gap-16" aria-labelledby="pi">
              <h3 className="t-section" id="pi">
                Personal information
              </h3>
              <DetailRow icon="user-rounded" label="Age & gender" value={`${age(profile.dateOfBirth)} years old · ${profile.gender}`} />
              <DetailRow icon="map-point" label="Home address" value={`${profile.sitio ? profile.sitio + ', ' : ''}Brgy. ${profile.barangay}, ${profile.municipality}, Cagayan`} />
              <DetailRow icon="map-point-hospital" label="Landmark directions" value={profile.landmarkNotes} />
              <DetailRow icon="phone" label="Contact number" value={formatPhone(profile.phone)} />
            </section>
            <section className="stack gap-16" aria-labelledby="hb">
              <h3 className="t-section" id="hb">
                Health background
              </h3>
              <DetailRow icon="heart-pulse" label="Long-term conditions" value={profile.conditions.length ? profile.conditions.join(', ') : 'None recorded'} />
              <DetailRow icon="user-heart" label="Mobility" value={profile.mobility} />
              <DetailRow icon="document-medicine" label="Allergies" value={profile.allergies} />
              <DetailRow icon="chat-round-dots" label="Primary language" value={profile.primaryLanguage} />
            </section>
            <section className="stack gap-12" aria-labelledby="cp">
              <h3 className="t-section" id="cp">
                Care plan
              </h3>
              <ServiceRow icon="shield-check" title={plan ? `${plan.name} plan` : 'No plan yet'} desc={plan ? planStatusText(profile.planStatus) : 'Explore Silver, Gold, and Platinum'} to={plan ? `/plans/${plan.id}` : '/plans'} />
            </section>
            {recent.length > 0 && (
              <section className="stack gap-12" aria-labelledby="rr">
                <div className="row between">
                  <h3 className="t-section" id="rr">
                    Recent requests
                  </h3>
                  <Link className="link-btn" to="/requests">
                    See all
                  </Link>
                </div>
                {recent.map((r) => (
                  <ServiceRow key={r.id} icon={serviceIcon(r.kind)} title={serviceTitle(r.kind)} desc={formatWhen(r.scheduledFor ?? r.createdAt)} to={`/requests/${r.id}`} trailing={<StatusBadge status={r.status} />} />
                ))}
              </section>
            )}
            <LinkButton to="/profile/edit" variant="secondary">
              Edit profile
            </LinkButton>
          </>
        ) : (
          <>
            <h2 className="t-h2">Your circle of care.</h2>
            {profile.family.length === 0 && <p className="t-body t-muted">No family contacts yet. Add someone who can receive updates or help pay for care.</p>}
            {profile.family.map((m) => (
              <ServiceRow
                key={m.id}
                icon="user-rounded"
                title={`${m.name} · ${m.relationship}`}
                desc={`${m.isPrimary ? 'Primary contact · ' : ''}${formatPhone(m.phone)}${m.isRemoteSponsor ? ` · ${m.location ?? 'Remote sponsor'}` : ''}`}
                to={`/profile/family/${m.id}`}
              />
            ))}
            <LinkButton to="/profile/family/new" variant="quiet">
              Add family member
            </LinkButton>
            <LinkButton to="/profile" variant="secondary">
              Back to client information
            </LinkButton>
          </>
        )}
      </div>
    </Screen>
  );
}

export function FamilyMemberScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, updateProfile } = useApp();
  const existing = profile.family.find((m) => m.id === id);
  const isNew = id === 'new';
  const [m, setM] = useState<FamilyMember>(
    existing ?? { id: `fam-${Date.now()}`, name: '', relationship: '', phone: '', isPrimary: profile.family.length === 0, isRemoteSponsor: false, scopes: ['SCOPE_CARE_NOTES_VIEW', 'SCOPE_FINANCIAL_SPONSOR'] },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!existing && !isNew) return <Navigate to="/profile/family" replace />;

  const save = () => {
    const e: Record<string, string> = {};
    if (m.name.trim().length < 2) e.name = 'Enter a name.';
    if (!m.relationship.trim()) e.relationship = 'Enter the relationship.';
    const local = normalizeLocal(m.phone);
    if (!/^9\d{9}$/.test(local)) e.phone = 'Enter a Philippine mobile number, like 0918 765 4321.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const saved = { ...m, phone: `+63${local}` };
    let family = isNew ? [...profile.family, saved] : profile.family.map((x) => (x.id === m.id ? saved : x));
    if (saved.isPrimary) family = family.map((x) => ({ ...x, isPrimary: x.id === saved.id }));
    updateProfile({ family });
    navigate('/profile/family', { replace: true });
  };
  const toggle = (s: DelegationScope, v: boolean) => setM({ ...m, scopes: v ? [...m.scopes, s] : m.scopes.filter((x) => x !== s) });

  return (
    <Screen>
      <PageHeader title={isNew ? 'Add family member' : 'Family member'} />
      <div className="screen-body stack gap-20">
        <TextField label="Name" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} error={errors.name} />
        <TextField label="Relationship to client" value={m.relationship} onChange={(e) => setM({ ...m, relationship: e.target.value })} error={errors.relationship} />
        <TextField label="Mobile number" lead="+63" inputMode="tel" value={m.phone.replace(/^\+63/, '')} onChange={(e) => setM({ ...m, phone: e.target.value })} error={errors.phone} />
        <Checkbox label="Primary contact" desc="Called first about care and emergencies" checked={m.isPrimary} onChange={(v) => setM({ ...m, isPrimary: v })} />
        <Checkbox label="Lives outside Cagayan or abroad" desc="Remote sponsor who receives digital updates" checked={m.isRemoteSponsor} onChange={(v) => setM({ ...m, isRemoteSponsor: v })} />
        {m.isRemoteSponsor && <TextField label="City or country" value={m.location ?? ''} onChange={(e) => setM({ ...m, location: e.target.value })} />}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="t-section">Permissions</legend>
          <p className="t-caption t-muted mt-4">Family members see only what you allow.</p>
          {(Object.keys(SCOPE_LABELS) as DelegationScope[]).map((s) => (
            <Checkbox key={s} label={SCOPE_LABELS[s].title} desc={SCOPE_LABELS[s].desc} checked={m.scopes.includes(s)} onChange={(v) => toggle(s, v)} />
          ))}
        </fieldset>
        {isDemoMode && <DependencyNote>Family delegation (POST /api/v1/clients/:id/family) is not deployed; changes are saved on this device only.</DependencyNote>}
        {!isNew && (
          <Button
            variant="danger"
            onClick={() => {
              updateProfile({ family: profile.family.filter((x) => x.id !== m.id) });
              navigate('/profile/family', { replace: true });
            }}
          >
            Remove from circle of care
          </Button>
        )}
      </div>
      <ActionBar>
        <Button onClick={save}>{isNew ? 'Add family member' : 'Save changes'}</Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- 22 / Edit profile ----------------
export function EditProfile() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useApp();
  const [f, setF] = useState({
    fullName: profile.fullName,
    phone: profile.phone.replace(/^\+63/, ''),
    municipality: profile.municipality,
    barangay: profile.barangay,
    sitio: profile.sitio,
    landmarkNotes: profile.landmarkNotes,
    primaryLanguage: profile.primaryLanguage,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = () => {
    const e: Record<string, string> = {};
    if (f.fullName.trim().length < 2) e.fullName = 'Enter the full name.';
    if (!/^9\d{9}$/.test(normalizeLocal(f.phone))) e.phone = 'Enter a Philippine mobile number, like 0917 123 4567.';
    if (!f.barangay) e.barangay = 'Choose a barangay.';
    if (f.landmarkNotes.trim().length < 5) e.landmarkNotes = 'Describe a landmark so caregivers can find the home.';
    setErrors(e);
    if (Object.keys(e).length) return;
    updateProfile({ ...f, fullName: f.fullName.trim(), phone: `+63${normalizeLocal(f.phone)}` });
    navigate('/profile', { replace: true });
  };
  return (
    <Screen>
      <PageHeader title="Edit client information" />
      <div className="screen-body stack gap-20">
        <h2 className="t-h2">Review your personal and contact details.</h2>
        <TextField label="Full name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} error={errors.fullName} />
        <TextField label="Mobile number" lead="+63" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} error={errors.phone} />
        <SelectField label="Municipality" options={MUNICIPALITIES} value={f.municipality} onChange={(e) => setF({ ...f, municipality: e.target.value, barangay: '' })} />
        <SelectField label="Barangay" placeholder="Choose barangay" options={DEMO_BARANGAYS[f.municipality] ?? []} value={f.barangay} onChange={(e) => setF({ ...f, barangay: e.target.value })} error={errors.barangay} />
        <TextField label="Sitio or purok" value={f.sitio} onChange={(e) => setF({ ...f, sitio: e.target.value })} />
        <TextArea label="Landmark directions" value={f.landmarkNotes} onChange={(e) => setF({ ...f, landmarkNotes: e.target.value })} error={errors.landmarkNotes} />
        <SelectField label="Primary language" options={LANGUAGES} value={f.primaryLanguage} onChange={(e) => setF({ ...f, primaryLanguage: e.target.value })} />
      </div>
      <ActionBar>
        <Button onClick={save}>Save changes</Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- Plan enrollment: subsidy, payment method, status ----------------
export function PlanEnroll() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { profile, updateProfile } = useApp();
  const plan = PLANS.find((p) => p.id === planId);
  const enrolled = profile.planId === planId && profile.planStatus && profile.planStatus !== 'none';
  const [step, setStep] = useState<'subsidy' | 'payment' | 'status'>(enrolled ? 'status' : 'subsidy');
  const [lgu, setLgu] = useState(profile.municipality);
  const [subsidyDoc, setSubsidyDoc] = useState('');
  const [method, setMethod] = useState<string>('');
  const [error, setError] = useState('');
  if (!plan) return <Navigate to="/plans" replace />;

  if (step === 'status')
    return (
      <Screen>
        <PageHeader title={`${plan.name} plan`} back="/plans" />
        <div className="screen-body stack gap-20">
          <h2 className="t-h2">{profile.planStatus === 'active' ? 'Your membership is active.' : 'Your enrollment is waiting.'}</h2>
          <div className="card stack gap-16">
            <DetailRow icon="shield-check" label="Plan" value={`${plan.name} · ₱${plan.annualTotal.toLocaleString()} / year`} />
            <DetailRow icon="users-group-rounded" label="Your share" value={`₱${plan.householdMonthly} / month`} />
            <DetailRow icon="hospital" label="LGU share" value={`₱${plan.lguMonthly} / month · ${profile.municipality}`} />
            <DetailRow icon="check-circle" label="Status" value={planStatusText(profile.planStatus)} />
          </div>
          <ol className="timeline">
            <li className="done">
              <span className="dot" />
              <div className="t-medium">Plan chosen</div>
            </li>
            <li className="current">
              <span className="dot" />
              <div className="t-medium">LGU subsidy verification</div>
              <div className="t-caption t-muted">Your BHW or municipal health office confirms eligibility.</div>
            </li>
            <li>
              <span className="dot" />
              <div className="t-medium">Household payment</div>
              <div className="t-caption t-muted">Billed only after verification.</div>
            </li>
            <li>
              <span className="dot" />
              <div className="t-medium">Membership active</div>
            </li>
          </ol>
          <DependencyNote title="Subsidy">{DEPENDENCIES.subsidy}</DependencyNote>
          <DependencyNote title="Payments">{DEPENDENCIES.payments}</DependencyNote>
          <Button
            variant="secondary"
            onClick={() => {
              updateProfile({ planId: undefined, planStatus: 'none' });
              navigate('/plans');
            }}
          >
            Cancel enrollment
          </Button>
        </div>
      </Screen>
    );

  return (
    <Screen>
      <PageHeader title={`Choose ${plan.name}`} back={step === 'payment' ? () => setStep('subsidy') : undefined} />
      <div className="screen-body stack gap-20">
        <div className="plan featured">
          <div className="row between">
            <span className="t-section">{plan.name}</span>
            <span className="t-caption t-muted">₱{plan.annualTotal.toLocaleString()} / year</span>
          </div>
          <div className="grid-2 mt-12">
            <div>
              <div className="detail-label">You pay</div>
              <div className="t-section">₱{plan.householdMonthly}/mo</div>
            </div>
            <div>
              <div className="detail-label">LGU pays</div>
              <div className="t-section">₱{plan.lguMonthly}/mo</div>
            </div>
          </div>
        </div>
        {step === 'subsidy' ? (
          <>
            <h2 className="t-section">LGU subsidy eligibility</h2>
            <p className="t-small t-muted" style={{ marginTop: -12 }}>
              Half of the plan is covered by your municipality once you’re verified.
            </p>
            <SelectField label="Municipality" options={MUNICIPALITIES} value={lgu} onChange={(e) => setLgu(e.target.value)} />
            <SelectField
              label="Supporting ID (optional)"
              placeholder="Choose if available"
              options={['Senior Citizen ID', 'PWD ID', '4Ps beneficiary ID', 'Barangay certificate of residency']}
              value={subsidyDoc}
              onChange={(e) => setSubsidyDoc(e.target.value)}
              hint="Your BHW will check the original document."
            />
            <Banner tone="warn" icon="shield-check">
              Subsidy verification is not available in the app yet. Your request will wait for your municipality’s confirmation.
            </Banner>
          </>
        ) : (
          <>
            <h2 className="t-section">How will you pay your share?</h2>
            <ChoiceGroup label="Payment method">
              {PAYMENT_METHODS.map((m) => (
                <ChoiceRow key={m.id} title={m.label} desc={m.desc} selected={method === m.id} onSelect={() => setMethod(m.id)} />
              ))}
            </ChoiceGroup>
            {error && <p className="field-error" role="alert">{error}</p>}
            <DependencyNote title="Payments">{DEPENDENCIES.payments} You won’t be charged now.</DependencyNote>
          </>
        )}
      </div>
      <ActionBar>
        <Button
          onClick={() => {
            if (step === 'subsidy') setStep('payment');
            else if (!method) setError('Choose a payment method.');
            else {
              updateProfile({ planId: plan.id, planStatus: 'pending-subsidy', municipality: lgu });
              setStep('status');
            }
          }}
        >
          {step === 'subsidy' ? 'Continue' : 'Request enrollment'}
        </Button>
      </ActionBar>
    </Screen>
  );
}

// ---------------- Settings ----------------
export function Settings() {
  const { prefs, setPrefs, session, setRole, resetDemo } = useApp();
  return (
    <Screen nav="more">
      <PageHeader title="Settings" />
      <div className="screen-body stack gap-24">
        <section className="stack gap-16">
          <h2 className="t-section">Language & display</h2>
          <SelectField label="App language" options={LANGUAGES} value={prefs.language} onChange={(e) => setPrefs({ language: e.target.value })} hint={prefs.language !== 'English' ? DEPENDENCIES.localization : undefined} />
          <div className="field">
            <span className="field-label">Text size</span>
            <Segmented
              label="Text size"
              value={prefs.textSize}
              onChange={(v) => setPrefs({ textSize: v })}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'large', label: 'Larger' },
              ]}
            />
          </div>
        </section>
        <section className="stack gap-4">
          <h2 className="t-section">Notifications</h2>
          <Checkbox label="SMS updates to family" desc="Send shift summaries to family who have permission" checked={prefs.familySmsUpdates} onChange={(v) => setPrefs({ familySmsUpdates: v })} />
          <Checkbox label="Request reminders" desc="Remind me before scheduled visits and trips" checked={prefs.requestReminders} onChange={(v) => setPrefs({ requestReminders: v })} />
        </section>
        {isDemoMode && session && (
          <section className="stack gap-12">
            <h2 className="t-section">Demo controls</h2>
            <p className="t-caption t-muted">Switch roles to preview operations reports. Real roles come from the signed-in account.</p>
            <Segmented
              label="Demo role"
              value={session.role}
              onChange={setRole}
              options={[
                { value: 'household', label: 'Household' },
                { value: 'coordinator', label: 'Coordinator' },
              ]}
            />
            <Button variant="secondary" onClick={resetDemo}>
              Reset demo data
            </Button>
          </section>
        )}
        <section className="stack gap-12">
          <h2 className="t-section">Privacy</h2>
          <DependencyNote title="Device storage">{DEPENDENCIES.storage}</DependencyNote>
        </section>
        <p className="t-caption t-muted">Icons: Solar Linear by 480 Design, CC BY 4.0.</p>
      </div>
    </Screen>
  );
}


