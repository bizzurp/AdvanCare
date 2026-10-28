import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ActionBar, Badge, Banner, Button, DependencyNote, DetailRow, LinkButton, PageHeader, Screen, Segmented, SelectField, StarRating, StatusBadge, TextArea, TextField } from '../components/ui';
import { serviceIcon, serviceTitle } from '../data/catalog';
import type { RequestStatus, ServiceKind, ServiceRequest } from '../data/types';
import { ApiError, cancelServiceRequest, cancelShift, isServiceKind, rateServiceRequest, rateShift, reportServiceRequest, reportShift, serviceBody, shiftNotes, submitServiceRequest, updateServiceRequest, updateShift, type CareNote } from '../services/api';
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
                    <span className="row between" style={{ alignItems: 'center', marginTop: 4 }}>
                      <span className="t-caption t-muted">{formatWhen(r.scheduledFor ?? r.createdAt)}</span>
                      <span className="row gap-8" style={{ alignItems: 'center' }}>
                        {r.reportedIssue && (
                          <span className="badge badge-error" style={{ fontSize: 11, padding: '2px 8px' }}>
                            Issue reported
                          </span>
                        )}
                        {r.status === 'completed' && (
                          r.rating ? (
                            <span className="t-caption t-medium" style={{ color: 'var(--gold, #996116)' }}>
                              ★ {r.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="badge badge-pending" style={{ fontSize: 11, padding: '2px 8px' }}>
                              ★ Rate service
                            </span>
                          )
                        )}
                      </span>
                    </span>
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
  supplies: ['Order sent', 'Price and stock confirmed', 'Ready for pickup or delivery', 'Received'],
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
  const [cancelError, setCancelError] = useState('');
  const [savingWhen, setSavingWhen] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Rating state
  const [ratingValue, setRatingValue] = useState(r?.rating ?? 5);
  const [ratingComment, setRatingComment] = useState(r?.ratingReview ?? '');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState('');
  const [isEditingRating, setIsEditingRating] = useState(false);

  // Issue reporting state
  const [reportingIssue, setReportingIssue] = useState(false);
  const [reportReason, setReportReason] = useState('Caregiver or provider did not show up (No-show)');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');

  if (!r) return <Navigate to="/requests" replace />;

  const p = progress(r.status);
  const steps = STEPS[r.kind] ?? ['Requested', 'Confirmed', 'In progress', 'Completed'];
  const canChange = ['saved-demo', 'queued', 'submitted'].includes(r.status) && !r.isDemoRecord;

  // Until staff confirm it (or assign a caregiver), the family can move, edit or cancel it here.
  const onServer = !!r.serverId && !!session;
  const canReschedule = canChange;
  const canCancel = canChange;
  const canEditNote = canChange && isServiceKind(r.kind);

  const saveWhen = async () => {
    if (!when || new Date(when) <= new Date()) {
      setWhenErr('Choose a future date and time.');
      return;
    }
    const at = new Date(when);
    if (onServer && r.serverId && session) {
      setSavingWhen(true);
      setWhenErr('');
      try {
        if (isServiceKind(r.kind)) await updateServiceRequest(r.serverId, session.accessToken, { preferredAt: at.toISOString() });
        // Caregiver shifts are booked in Asia/Manila wall time.
        else await updateShift(r.serverId, session.accessToken, { scheduledDate: new Date(at.getTime() + 8 * 3600_000).toISOString().slice(0, 10), scheduledStartTime: at.toISOString() });
      } catch (e) {
        setWhenErr(e instanceof ApiError ? e.message : 'Could not change the time. Try again.');
        return;
      } finally {
        setSavingWhen(false);
      }
    }
    const payload = { ...r.payload, ...('startTime' in r.payload ? { startTime: at.toISOString() } : {}), ...('pickupTime' in r.payload ? { pickupTime: at.toISOString() } : {}) };
    updateRequest(r.id, { scheduledFor: at.toISOString(), payload });
    setRescheduling(false);
  };

  const saveNote = async () => {
    const text = note.trim();
    const details = [...r.details.filter((d) => d.label !== 'Note for the care team'), ...(text ? [{ label: 'Note for the care team', value: text, icon: 'chat-round-dots' as const }] : [])];
    const next = { ...r, details, payload: { ...r.payload, familyNote: text || undefined } };
    if (onServer && r.serverId && session) {
      setSavingNote(true);
      setNoteError('');
      try {
        await updateServiceRequest(r.serverId, session.accessToken, { details: serviceBody(next).details });
      } catch (e) {
        setNoteError(e instanceof ApiError ? e.message : 'Could not save the note. Try again.');
        return;
      } finally {
        setSavingNote(false);
      }
    }
    updateRequest(r.id, { details: next.details, payload: next.payload });
    setEditingNote(false);
  };

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
          {r.assignedProvider ? (
            <div className="card row gap-12" style={{ padding: '12px 16px', background: '#FFFFFF', border: '1px solid var(--border-light, #E2E8F0)', borderRadius: 12 }}>
              <span className="icon-tile">
                <Icon name={r.assignedProvider.type === 'DOCTOR' ? 'stethoscope' : 'bus'} />
              </span>
              <div>
                <div className="t-medium">
                  {r.assignedProvider.type === 'DOCTOR' ? `Dr. ${r.assignedProvider.fullName}` : r.assignedProvider.fullName}
                </div>
                <div className="t-caption t-muted">
                  {r.assignedProvider.type === 'DOCTOR'
                    ? (r.assignedProvider.specialty ?? 'General Practice')
                    : `${r.assignedProvider.vehicleType ?? 'Transport Vehicle'}${r.assignedProvider.plateNumber ? ` · Plate ${r.assignedProvider.plateNumber}` : ''}`}
                </div>
              </div>
            </div>
          ) : null}
          {r.staffNote ? (
            <Banner icon="chat-round-dots">
              <strong>From your care team:</strong> {r.staffNote}
            </Banner>
          ) : null}
          {r.paid ? (
            <p className="row gap-8 t-body">
              <Badge tone="success">Paid</Badge>
            </p>
          ) : null}
          {r.reportedIssue && (
            <div className="banner banner-warn" role="status" style={{ borderLeft: '4px solid var(--red, #a83a32)' }}>
              <span style={{ color: 'var(--red, #a83a32)', display: 'inline-flex' }}>
                <Icon name="chat-round-dots" />
              </span>
              <div className="stack gap-4 grow">
                <strong style={{ color: 'var(--red, #a83a32)' }}>Issue Reported: {r.reportedIssue.reason}</strong>
                {r.reportedIssue.details && <p className="t-small">{r.reportedIssue.details}</p>}
                <p className="t-caption t-muted">
                  Reported {formatWhen(r.reportedIssue.reportedAt)} · Status: <strong>Under Review</strong>
                </p>
                <p className="t-caption" style={{ color: 'var(--ink)' }}>
                  Our care coordination team is actively investigating this unfulfilled booking and will contact your household.
                </p>
              </div>
            </div>
          )}
        </div>
        {r.serverId && session && (r.careNotes ?? 0) > 0 ? <CareNotes serverId={r.serverId} token={session.accessToken} /> : null}

        {r.status === 'cancelled' ? (
          <Banner tone="info" icon="check-circle">
            This request was cancelled.{r.cancellationReason ? ` ${r.cancellationReason}` : ''}
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

        {/* Rating section when completed */}
        {r.status === 'completed' && (
          <section className="stack gap-12" aria-labelledby="rating-heading">
            <h3 className="t-section" id="rating-heading">
              Service Rating & Feedback
            </h3>
            {r.rating && !isEditingRating ? (
              <div className="card stack gap-12" style={{ background: '#FFFFFF', border: '1px solid var(--line)', borderRadius: 14 }}>
                <div className="row between">
                  <span className="t-medium">Your rating</span>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      setRatingValue(r.rating ?? 5);
                      setRatingComment(r.ratingReview ?? '');
                      setIsEditingRating(true);
                    }}
                  >
                    Edit rating
                  </button>
                </div>
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <StarRating value={r.rating} readOnly size={22} showLabel={false} />
                  <span className="t-medium" style={{ color: 'var(--gold, #996116)', marginLeft: 4 }}>
                    {r.rating.toFixed(1)} / 5.0
                  </span>
                </div>
                {r.ratingReview ? <p className="t-body" style={{ fontStyle: 'italic', color: 'var(--ink)' }}>“{r.ratingReview}”</p> : null}
                <p className="t-caption t-muted">Submitted {formatWhen(r.ratedAt ?? r.createdAt)}</p>
              </div>
            ) : (
              <div className="card stack gap-16" style={{ background: '#FAFBF9', border: '1.5px solid var(--line)', borderRadius: 14 }}>
                <div className="stack gap-4">
                  <h4 className="t-medium" style={{ fontSize: 16 }}>
                    {isEditingRating ? 'Update your rating' : `How was your ${serviceTitle(r.kind)}?`}
                  </h4>
                  <p className="t-small t-muted">
                    {isEditingRating ? 'Change your score or feedback below.' : 'Your feedback helps improve care quality and supports our accredited providers.'}
                  </p>
                </div>
                <StarRating value={ratingValue} onChange={setRatingValue} size={32} showLabel={true} />
                <TextArea
                  label="Comments or feedback (optional)"
                  placeholder="Tell us about the care received, punctuality, or any notes..."
                  value={ratingComment}
                  maxLength={1000}
                  onChange={(e) => setRatingComment(e.target.value)}
                />
                {ratingError && <Banner tone="error">{ratingError}</Banner>}
                <div className="row gap-12">
                  {isEditingRating && (
                    <Button variant="secondary" onClick={() => setIsEditingRating(false)}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    loading={ratingSubmitting}
                    onClick={async () => {
                      setRatingSubmitting(true);
                      setRatingError('');
                      try {
                        if (onServer && r.serverId && session) {
                          if (isServiceKind(r.kind)) {
                            await rateServiceRequest(r.serverId, session.accessToken, ratingValue, ratingComment.trim() || undefined);
                          } else {
                            await rateShift(r.serverId, session.accessToken, ratingValue, ratingComment.trim() || undefined);
                          }
                        }
                        updateRequest(r.id, {
                          rating: ratingValue,
                          ratingReview: ratingComment.trim() || undefined,
                          ratedAt: new Date().toISOString(),
                        });
                        setIsEditingRating(false);
                      } catch (err) {
                        setRatingError(err instanceof ApiError ? err.message : 'Could not save rating. Try again.');
                      } finally {
                        setRatingSubmitting(false);
                      }
                    }}
                  >
                    Submit rating
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Report Unfulfilled Service or Problem */}
        {r.status !== 'cancelled' && (
          <section className="stack gap-12">
            {!r.reportedIssue && !reportingIssue ? (
              <div className="card row between" style={{ background: '#FFFDFD', border: '1px dashed var(--line)', padding: '14px 16px', alignItems: 'center' }}>
                <div className="stack gap-2">
                  <span className="t-medium" style={{ fontSize: 15 }}>Having trouble with this service?</span>
                  <span className="t-caption t-muted">Report unfulfilled service, no-show, or care concern</span>
                </div>
                <button
                  type="button"
                  className="link-btn"
                  style={{ color: 'var(--red, #a83a32)', fontWeight: 600, whiteSpace: 'nowrap' }}
                  onClick={() => setReportingIssue(true)}
                >
                  Report issue
                </button>
              </div>
            ) : reportingIssue ? (
              <div className="card stack gap-16" style={{ background: '#FFFBFB', border: '1.5px solid var(--red-bg, #fbe9e7)', borderRadius: 14 }}>
                <div className="stack gap-4">
                  <h3 className="t-section" style={{ color: 'var(--red, #a83a32)', fontSize: 17 }}>Report unfulfilled service</h3>
                  <p className="t-small t-muted">
                    Was your booking not fulfilled, a caregiver or driver didn’t arrive, or was there a problem? Let us know so our coordination team can take immediate action.
                  </p>
                </div>
                <SelectField
                  label="What happened?"
                  options={[
                    'Caregiver or provider did not show up (No-show)',
                    'Service was not performed or incomplete',
                    'Caregiver or provider arrived significantly late',
                    'Service was cancelled without notice',
                    'Safety or quality of care concern',
                    'Billing or payment discrepancy',
                    'Other issue',
                  ]}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                />
                <TextArea
                  label="Please provide details (optional)"
                  placeholder="Explain what happened so our care coordination team can investigate..."
                  value={reportDetails}
                  maxLength={1000}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
                {reportError && <Banner tone="error">{reportError}</Banner>}
                <div className="grid-2">
                  <Button variant="secondary" onClick={() => setReportingIssue(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    loading={reportSubmitting}
                    onClick={async () => {
                      if (!reportReason.trim()) {
                        setReportError('Please select a reason.');
                        return;
                      }
                      setReportSubmitting(true);
                      setReportError('');
                      try {
                        if (onServer && r.serverId && session) {
                          if (isServiceKind(r.kind)) {
                            await reportServiceRequest(r.serverId, session.accessToken, reportReason, reportDetails.trim() || undefined);
                          } else {
                            await reportShift(r.serverId, session.accessToken, reportReason, reportDetails.trim() || undefined);
                          }
                        }
                        updateRequest(r.id, {
                          reportedIssue: {
                            reason: reportReason,
                            details: reportDetails.trim() || undefined,
                            reportedAt: new Date().toISOString(),
                            status: 'under_review',
                          },
                        });
                        setReportingIssue(false);
                      } catch (err) {
                        setReportError(err instanceof ApiError ? err.message : 'Could not submit report. Try again.');
                      } finally {
                        setReportSubmitting(false);
                      }
                    }}
                  >
                    Submit report
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        )}


        {r.dependencyNote && <DependencyNote>{r.dependencyNote}</DependencyNote>}

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
            <Button loading={savingWhen} onClick={() => void saveWhen()}>
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
          {canEditNote && !confirmCancel && !editingNote && (
            <Button
              variant="quiet"
              onClick={() => {
                setNote(String(r.payload.familyNote ?? ''));
                setEditingNote(true);
              }}
            >
              {r.payload.familyNote ? 'Edit note for the care team' : 'Add a note for the care team'}
            </Button>
          )}
          {editingNote && (
            <div className="card stack gap-12">
              <TextArea label="Note for the care team" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} error={noteError} />
              <div className="grid-2">
                <Button variant="secondary" onClick={() => setEditingNote(false)}>
                  Close
                </Button>
                <Button loading={savingNote} onClick={() => void saveNote()}>
                  Save note
                </Button>
              </div>
            </div>
          )}
          {(canReschedule || canCancel) && !confirmCancel && (
            <div className={canReschedule && canCancel ? 'grid-2' : undefined}>
              {canReschedule && (
                <Button variant="secondary" onClick={() => setRescheduling((v) => !v)}>
                  Reschedule
                </Button>
              )}
              {canCancel && (
                <Button variant="danger" onClick={() => setConfirmCancel(true)}>
                  Cancel request
                </Button>
              )}
            </div>
          )}
          {onServer && !canCancel && r.status !== 'in-progress' && <p className="t-caption t-muted">This is confirmed. To change or cancel it, call your care coordinator.</p>}
          {cancelError && <Banner tone="error">{cancelError}</Banner>}
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
                  onClick={async () => {
                    setCancelError('');
                    if (onServer && r.serverId && session) {
                      try {
                        if (isServiceKind(r.kind)) await cancelServiceRequest(r.serverId, session.accessToken);
                        else await cancelShift(r.serverId, session.accessToken);
                      } catch (e) {
                        setCancelError(e instanceof ApiError ? e.message : 'Could not cancel. Try again.');
                        setConfirmCancel(false);
                        return;
                      }
                    }
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
