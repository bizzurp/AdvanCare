import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ActionBar, Badge, Banner, Button, DependencyNote, DetailRow, LinkButton, PageHeader, Screen, Segmented, StatusBadge, TextField } from '../components/ui';
import { serviceIcon, serviceTitle } from '../data/catalog';
import type { RequestStatus, ServiceKind, ServiceRequest } from '../data/types';
import { shiftNotes, submitServiceRequest, type CareNote } from '../services/api';
import { useApp } from '../state/AppState';
import { formatWhen } from './requestUtils';

// ---------------- 20 / Request received ----------------
export function RequestReceived() {
  const { id } = useParams();
  const { requests } = useApp();
  const r = requests.find((x) => x.id === id);
  if (!r) return <Navigate to="/requests" replace />;
  const copy: Record<string, { title: [string, string]; body: string }> = {
    submitted: { title: ['Your request', 'is on its way.'], body: 'Your care team will follow up with the next steps. You can follow its status in your requests.' },
    queued: { title: ['Saved offline.', 'We’ll send it soon.'], body: 'You’re offline. This request will be sent automatically when your connection is restored. It is not confirmed yet.' },
    'saved-demo': { title: ['Request saved', 'on this device.'], body: 'It has not been sent to a provider yet. Nothing is booked or confirmed until the AdvanCare service is connected.' },
  };
  const c = copy[r.status] ?? copy.submitted;
  return (
    <Screen nav="home">
      <PageHeader title={r.status === 'submitted' ? 'Request sent' : 'Request saved'} back="/home" />
      <div className="screen-body stack gap-20" style={{ paddingTop: 48 }}>
        <span className="avatar lg" style={{ width: 76, height: 76, background: r.status === 'submitted' ? 'var(--mint)' : 'var(--gold-bg)', color: r.status === 'submitted' ? 'var(--teal)' : 'var(--gold)' }}>
          <Icon name={r.status === 'queued' ? 'wi-fi-router' : 'check-circle'} size={36} />
        </span>
        <h2 className="t-h1" style={{ fontSize: 32, lineHeight: '38px' }} role="status">
          {c.title[0]}
          <br />
          {c.title[1]}
        </h2>
        <p className="t-body t-muted">{c.body}</p>
        <div className="card row gap-12">
          <span className="icon-tile">
            <Icon name={serviceIcon(r.kind)} />
          </span>
          <div className="grow">
            <div className="row-title">{serviceTitle(r.kind)}</div>
            <div className="row-desc">{r.summary}</div>
          </div>
        </div>
        {r.dependencyNote && <DependencyNote>{r.dependencyNote}</DependencyNote>}
        <div className="stack gap-12 mt-8">
          <LinkButton to="/home">Back to home</LinkButton>
          <LinkButton to={`/requests/${r.id}`} variant="secondary">
            View request status
          </LinkButton>
        </div>
      </div>
    </Screen>
  );
}

// ---------------- Requests list ----------------
export function RequestsList() {
  const { requests } = useApp();
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const done: RequestStatus[] = ['completed', 'cancelled'];
  const list = requests.filter((r) => (tab === 'active' ? !done.includes(r.status) : done.includes(r.status)));
  return (
    <Screen nav="home">
      <PageHeader title="Your requests" />
      <div className="screen-body stack gap-16">
        <Segmented
          label="Request filter"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'past', label: 'Past' },
          ]}
        />
        {list.length === 0 ? (
          <div className="card stack gap-12 t-center" style={{ alignItems: 'center', padding: 32 }}>
            <span className="icon-tile lg">
              <Icon name="document-text" />
            </span>
            <p className="t-medium">{tab === 'active' ? 'No active requests' : 'No past requests yet'}</p>
            <p className="t-caption t-muted">Requests you make from Services appear here.</p>
            <LinkButton to="/services" variant="quiet">
              Request a service
            </LinkButton>
          </div>
        ) : (
          <ul className="stack gap-12" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {list.map((r) => (
              <li key={r.id}>
                <Link to={`/requests/${r.id}`} className="record row gap-12">
                  <span className="icon-tile">
                    <Icon name={serviceIcon(r.kind)} />
                  </span>
                  <span className="grow">
                    <span className="title-badge">
                      <span className="row-title">{serviceTitle(r.kind)}</span>
                      <StatusBadge status={r.status} />
                    </span>
                    <span className="row-desc" style={{ display: 'block' }}>
                      {r.summary}
                    </span>
                    <span className="t-caption t-muted">{formatWhen(r.scheduledFor ?? r.createdAt)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Screen>
  );
}

// ---------------- Request detail / status ----------------
const STEPS: Record<ServiceKind, string[]> = {
  telehealth: ['Requested', 'Doctor confirms schedule', 'Consultation', 'Consultation notes shared'],
  rhu: ['Requested', 'RHU confirms schedule', 'Visit', 'Completed'],
  triage: ['Assessment sent', 'Clinician review', 'Referral decision', 'Follow-up'],
  prescription: ['Requested', 'Doctor review', 'Ready for pickup or delivery', 'Received'],
  transport: ['Requested', 'Driver and vehicle assigned', 'On the way', 'Arrived'],
  'home-caregiver': ['Requested', 'Caregiver assigned', 'Shift in progress', 'Shift completed · care notes'],
  'cvmc-caregiver': ['Requested', 'Caregiver assigned', 'Shift in progress', 'Shift completed · care notes'],
};

function progress(status: RequestStatus): number {
  switch (status) {
    case 'saved-demo':
    case 'queued':
      return 0;
    case 'submitted':
      return 1;
    case 'confirmed':
      return 2;
    case 'in-progress':
      return 2.5;
    case 'completed':
      return 4;
    default:
      return -1;
  }
}

export function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests, updateRequest, online, session, profile } = useApp();
  const r = requests.find((x) => x.id === id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [when, setWhen] = useState('');
  const [whenErr, setWhenErr] = useState('');
  const [retrying, setRetrying] = useState(false);
  if (!r) return <Navigate to="/requests" replace />;

  const p = progress(r.status);
  const steps = STEPS[r.kind];
  const canChange = ['saved-demo', 'queued', 'submitted'].includes(r.status) && !r.isDemoRecord;

  const retry = async (req: ServiceRequest) => {
    setRetrying(true);
    try {
      const res = await submitServiceRequest(req, session?.accessToken, profile);
      updateRequest(req.id, { status: res.status, dependencyNote: res.dependencyNote, serverId: res.serverId });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Screen>
      <PageHeader title={serviceTitle(r.kind)} />
      <div className="screen-body stack gap-24">
        <div className="stack gap-8">
          <StatusBadge status={r.status} />
          <h2 className="t-h2">{r.summary}</h2>
          <p className="t-caption t-muted">
            {r.clientName} · requested {formatWhen(r.createdAt)}
            {r.serverRef ? ` · ${r.serverRef}` : ''}
          </p>
          {r.caregiverFirstName ? <p className="t-body">Caregiver: {r.caregiverFirstName}</p> : null}
          {r.paid ? (
            <p className="row gap-8 t-body">
              <Badge tone="success">Paid</Badge>
            </p>
          ) : null}
        </div>
        {r.serverId && session && !session.demo && (r.careNotes ?? 0) > 0 ? <CareNotes serverId={r.serverId} token={session.accessToken} /> : null}

        {r.status === 'cancelled' ? (
          <Banner tone="info" icon="check-circle">
            This request was cancelled.
          </Banner>
        ) : (
          <section aria-labelledby="st">
            <h3 className="t-section mb-8" id="st">
              Status
            </h3>
            <ol className="timeline">
              {steps.map((s, i) => {
                const done = i < Math.floor(p) || (p >= 4 && i <= 3);
                const current = !done && i === Math.floor(p);
                return (
                  <li key={s} className={done ? 'done' : current ? 'current' : ''}>
                    <span className="dot" />
                    <div className="t-medium">{s}</div>
                    {current && i === 0 && (
                      <div className="t-caption t-muted">{r.status === 'queued' ? 'Waiting for a connection to send.' : 'Saved on this device. Not sent to a provider.'}</div>
                    )}
                    {current && i > 0 && <div className="t-caption t-muted">In progress</div>}
                    <span className="sr-only">{done ? 'completed' : current ? 'current step' : 'not started'}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        <section className="stack gap-16" aria-labelledby="dt">
          <h3 className="t-section" id="dt">
            Details
          </h3>
          {r.scheduledFor && <DetailRow icon="calendar" label="Scheduled for" value={formatWhen(r.scheduledFor)} />}
          {r.details.map((d) => (
            <DetailRow key={d.label} icon={d.icon ?? 'document-text'} label={d.label} value={d.value} />
          ))}
        </section>

        {r.dependencyNote && <DependencyNote>{r.dependencyNote}</DependencyNote>}
        {r.isDemoRecord && <DependencyNote title="Demo record">This is sample history, not a real service record.</DependencyNote>}

        {(r.kind === 'triage' || r.kind === 'rhu' || r.kind === 'telehealth') && r.status !== 'cancelled' && (
          <Link to="/services/transport" className="service-row">
            <span className="icon-tile">
              <Icon name="bus" />
            </span>
            <span className="grow">
              <span className="row-title" style={{ display: 'block' }}>Need a ride to your visit?</span>
              <span className="row-desc">Book non-emergency transport</span>
            </span>
            <Icon name="alt-arrow-right" size={20} className="chev" />
          </Link>
        )}

        {rescheduling && (
          <div className="card stack gap-12">
            <TextField label="New date and time" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} error={whenErr} />
            <Button
              onClick={() => {
                if (!when || new Date(when) <= new Date()) {
                  setWhenErr('Choose a future date and time.');
                  return;
                }
                updateRequest(r.id, { scheduledFor: new Date(when).toISOString() });
                setRescheduling(false);
              }}
            >
              Save new schedule
            </Button>
            {r.status === 'submitted' && <p className="t-caption t-muted">Your care team will confirm the new time.</p>}
          </div>
        )}
      </div>
      {r.status !== 'cancelled' && r.status !== 'completed' && (
        <ActionBar>
          {r.status === 'queued' && online && (
            <Button loading={retrying} onClick={() => void retry(r)}>
              Send now
            </Button>
          )}
          {canChange && !confirmCancel && (
            <div className="grid-2">
              <Button variant="secondary" onClick={() => setRescheduling((v) => !v)}>
                Reschedule
              </Button>
              <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                Cancel request
              </Button>
            </div>
          )}
          {confirmCancel && (
            <div className="card stack gap-12" role="alertdialog" aria-labelledby="cc">
              <p className="t-medium" id="cc">
                Cancel this request?
              </p>
              <div className="grid-2">
                <Button variant="secondary" onClick={() => setConfirmCancel(false)} autoFocus>
                  Keep it
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    updateRequest(r.id, { status: 'cancelled' });
                    setConfirmCancel(false);
                    navigate(`/requests/${r.id}`, { replace: true });
                  }}
                >
                  Yes, cancel
                </Button>
              </div>
            </div>
          )}
        </ActionBar>
      )}
    </Screen>
  );
}

const VITAL_LABEL: Record<string, string> = { bpSystolic: 'BP', pulse: 'Pulse', tempC: 'Temp', spo2: 'SpO₂', glucoseMgDl: 'Blood sugar' };

/** What the caregiver recorded during the shift (from the server; only for the family's own bookings). */
function CareNotes({ serverId, token }: { serverId: string; token: string }) {
  const [notes, setNotes] = useState<CareNote[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    shiftNotes(serverId, token)
      .then(setNotes)
      .catch(() => setError('Could not load care notes right now.'));
  }, [serverId, token]);
  if (error) return <Banner tone="warn">{error}</Banner>;
  if (!notes) return null;
  return (
    <section className="stack gap-12" aria-labelledby="notes-h">
      <h3 className="t-section" id="notes-h">
        Care notes
      </h3>
      {notes.map((n) => {
        const v = n.vitals ?? {};
        const vitals = [
          v.bpSystolic && v.bpDiastolic ? `BP ${v.bpSystolic}/${v.bpDiastolic}` : null,
          ...Object.entries(v)
            .filter(([k]) => k !== 'bpSystolic' && k !== 'bpDiastolic')
            .map(([k, val]) => `${VITAL_LABEL[k] ?? k} ${val}${k === 'tempC' ? '°C' : k === 'spo2' ? '%' : ''}`),
        ].filter(Boolean);
        return (
          <article key={n.id} className="card stack gap-8">
            <p className="t-caption t-muted">
              {formatWhen(n.recordedAt)}
              {n.caregiverFirstName ? ` · ${n.caregiverFirstName}` : ''}
            </p>
            {n.summary ? <p className="t-body t-medium">{n.summary}</p> : null}
            {vitals.length ? <p className="t-body">{vitals.join(' · ')}</p> : null}
            {n.tasks?.length ? <p className="t-body t-muted">Done: {n.tasks.join(', ')}</p> : null}
            {n.notes ? <p className="t-body">{n.notes}</p> : null}
          </article>
        );
      })}
    </section>
  );
}
