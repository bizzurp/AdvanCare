import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ProviderCandidate, type ServiceDetail, type ServiceStatus } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { Pagination, ScopeNote, useUrlFilters } from '../components/ops';
import { Badge, Button, ErrorNotice, Field, Loading, Modal, Notice, PageHeader, useAction, useLoad } from '../components/ui';
import { actionLabel, dateTime, personName, relative, SERVICE_KIND_LABEL, SERVICE_STATUS } from '../format';

const KEYS = ['q', 'kind', 'status'] as const;

function ServiceBadge({ status }: { status: string }) {
  const m = SERVICE_STATUS[status] ?? { label: status, tone: 'neutral' as const };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** TeleHealth, RHU, Triage, Prescription and Transport requests (P2). */
export function Services() {
  const me = useMe();
  const navigate = useNavigate();
  const f = useUrlFilters(KEYS);
  const list = useLoad(() => api.services({ ...f.values, status: f.values.status || 'OPEN', page: String(f.page) }), [f.key]);

  return (
    <>
      <PageHeader
        title="Service requests"
        subtitle={
          <>
            TeleHealth, RHU, Triage, Prescriptions and Transport · <ScopeNote municipalities={me.municipalities} />
          </>
        }
      />
      <div className="filters">
        <input className="input" type="search" placeholder="Search client name or SVC- number" value={f.values.q} onChange={(e) => f.set('q', e.target.value)} aria-label="Search" />
        <select className="input" value={f.values.kind} onChange={(e) => f.set('kind', e.target.value)} aria-label="Service">
          <option value="">All services</option>
          {Object.entries(SERVICE_KIND_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select className="input" value={f.values.status} onChange={(e) => f.set('status', e.target.value)} aria-label="Status">
          <option value="">Open (new, in review, scheduled)</option>
          {Object.entries(SERVICE_STATUS).map(([value, m]) => (
            <option key={value} value={value}>
              {m.label}
            </option>
          ))}
        </select>
        {f.active ? (
          <Button variant="quiet" onClick={f.clear}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {list.error ? <ErrorNotice error={list.error} /> : null}
      {!list.data ? (
        list.loading ? <Loading /> : null
      ) : (
        <div className={list.loading ? 'refetching' : undefined}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Wanted / scheduled</th>
                  <th>Assigned to</th>
                  <th>Status</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {list.data.requests.map((r) => (
                  <tr key={r.id} className="row-link" onClick={() => navigate(`/services/${r.id}`)}>
                    <td>
                      <Link to={`/services/${r.id}`} className="strong-link" onClick={(e) => e.stopPropagation()}>
                        {r.ref}
                      </Link>
                      <span className="cell-sub">{dateTime(r.createdAt)}</span>
                    </td>
                    <td>
                      {SERVICE_KIND_LABEL[r.kind] ?? r.kind}
                      <span className="cell-sub">
                        {r.summary ?? ''}
                        {r.files ? ` · ${r.files} file${r.files === 1 ? '' : 's'}` : ''}
                      </span>
                    </td>
                    <td>
                      <Link to={`/clients/${r.client.id}`} onClick={(e) => e.stopPropagation()}>
                        {r.client.name}
                      </Link>
                      <span className="cell-sub">
                        Brgy. {r.barangay}, {r.municipality}
                      </span>
                    </td>
                    <td className="nowrap">{r.scheduledAt ? <b>{dateTime(r.scheduledAt)}</b> : r.preferredAt ? <span className="muted">Wants {dateTime(r.preferredAt)}</span> : <span className="muted">—</span>}</td>
                    <td>
                      {r.assignedProvider ? (
                        <span className="nowrap">
                          {r.assignedProvider.type === 'DOCTOR' ? `Dr. ${r.assignedProvider.fullName}` : r.assignedProvider.fullName}
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <ServiceBadge status={r.status} />
                    </td>
                    <td className="chev">
                      <Icon name="alt-arrow-right" size={16} />
                    </td>
                  </tr>
                ))}
                {!list.data.requests.length ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      {f.active ? 'No requests match these filters.' : 'Nothing open right now.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={(p) => f.set('page', String(p))} />
        </div>
      )}
    </>
  );
}

function DetailsList({ details }: { details: Record<string, unknown> }) {
  const rows: { label: string; value: string }[] = [];
  if (Array.isArray(details.shown)) {
    for (const item of details.shown) {
      if (item && typeof item === 'object' && 'label' in item && 'value' in item) {
        rows.push({ label: String((item as { label: unknown }).label), value: String((item as { value: unknown }).value) });
      }
    }
  }
  if (!rows.length) {
    for (const [k, v] of Object.entries(details)) {
      if (k === 'summary' || k === 'shown' || v === null || v === undefined) continue;
      if (typeof v === 'object') continue;
      rows.push({ label: k.replace(/([A-Z])/g, ' $1').toLowerCase(), value: String(v) });
    }
  }
  if (!rows.length) return <p className="muted">No additional details recorded.</p>;
  return (
    <dl className="facts">
      {rows.map((row, i) => (
        <span key={i} className="fact-pair">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </span>
      ))}
    </dl>
  );
}

export function ServiceDetailPage() {
  const { id = '' } = useParams();
  const me = useMe();
  const detail = useLoad(() => api.service(id), [id]);
  const [open, setOpen] = useState<null | 'schedule' | 'complete' | 'cancel' | 'assign'>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const quick = useAction();
  const file = useAction();

  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error || !detail.data) return <ErrorNotice error={detail.error} />;
  const { request: r, client, requestedBy, files, history, assignedProvider } = detail.data;
  const done = (msg: string) => {
    setOpen(null);
    setFlash(msg);
    void detail.reload();
  };
  const isSuper = me.role === 'SUPER_ADMIN';
  const openStatuses: ServiceStatus[] = ['SUBMITTED', 'IN_REVIEW', 'SCHEDULED'];
  const isOpen = openStatuses.includes(r.status);
  const canAssign = isOpen && (r.kind === 'transport' || (r.kind === 'telehealth' && isSuper));

  return (
    <>
      <PageHeader
        back={
          <Link to="/services" className="back-link">
            <Icon name="alt-arrow-left" size={16} /> Service requests
          </Link>
        }
        title={
          <>
            {r.ref} <ServiceBadge status={r.status} />
          </>
        }
        subtitle={`${r.kindLabel} · requested ${dateTime(r.createdAt)}`}
      />
      {flash ? <Notice tone="good">{flash}</Notice> : null}
      {r.kind === 'triage' ? (
        <Notice tone="warn" title="For clinician review">
          AdvanCare doesn’t assign urgency or a destination. A nurse or doctor decides. If the client may be in danger now, tell the family to call 911.
        </Notice>
      ) : null}
      {r.status === 'CANCELLED' ? <Notice tone="info" title="Cancelled">{r.cancellationReason}</Notice> : null}

      {isOpen ? (
        <section className="card">
          <h2>Actions</h2>
          <div className="row gap8 wrap">
            {canAssign ? (
              <Button onClick={() => setOpen('assign')}>
                {assignedProvider
                  ? r.kind === 'telehealth'
                    ? 'Change doctor'
                    : 'Change driver'
                  : r.kind === 'telehealth'
                    ? 'Assign doctor'
                    : 'Assign driver'}
              </Button>
            ) : r.kind === 'telehealth' && !isSuper ? (
              <span className="muted small" style={{ alignSelf: 'center' }}>
                Telehealth doctor assignment is handled in the Super Admin dashboard.
              </span>
            ) : null}
            {r.status === 'SUBMITTED' ? (
              <Button
                variant="secondary"
                busy={quick.busy}
                onClick={async () => {
                  if (await quick.run(() => api.serviceStatus(r.id, { status: 'IN_REVIEW' }))) done('Marked in review.');
                }}
              >
                Start review
              </Button>
            ) : null}
            <Button variant={canAssign ? 'secondary' : 'primary'} onClick={() => setOpen('schedule')}>
              {r.status === 'SCHEDULED' ? 'Reschedule' : 'Schedule'}
            </Button>
            {r.status !== 'SUBMITTED' ? (
              <Button variant="secondary" onClick={() => setOpen('complete')}>
                Mark completed
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => setOpen('cancel')}>
              Cancel
            </Button>
          </div>
          <ErrorNotice error={quick.error} />
        </section>
      ) : null}

      <div className="grid-detail">
        <section className="card">
          <h2>What the family asked for</h2>
          {r.details.summary ? <p>{String(r.details.summary)}</p> : null}
          <DetailsList details={r.details} />
          {r.preferredAt ? <p className="small">Preferred time: <b>{dateTime(r.preferredAt)}</b></p> : null}
          {files.length ? (
            <div className="stack12">
              <h3 className="small">Attached files</h3>
              {files.map((f) => (
                <Button
                  key={f.id}
                  variant="secondary"
                  busy={file.busy}
                  onClick={async () => {
                    const url = await file.run(() => api.serviceFileUrl(r.id, f.id));
                    if (url) window.open(url, '_blank', 'noopener');
                  }}
                >
                  Open {f.fileName ?? 'file'} ({Math.max(1, Math.round(f.sizeBytes / 1024))} KB)
                </Button>
              ))}
              <p className="muted small">Opening a file is recorded in the audit log.</p>
              <ErrorNotice error={file.error} />
            </div>
          ) : null}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>{r.kind === 'telehealth' ? 'Assigned Doctor' : r.kind === 'transport' ? 'Assigned Driver' : 'Assigned Provider'}</h2>
            {assignedProvider ? (
              <Link to={`/providers/${assignedProvider.id}`} className="link-arrow">
                Open profile <Icon name="alt-arrow-right" size={16} />
              </Link>
            ) : null}
          </div>
          {assignedProvider ? (
            <dl className="facts">
              <dt>Name</dt>
              <dd>{assignedProvider.type === 'DOCTOR' ? `Dr. ${assignedProvider.fullName}` : assignedProvider.fullName}</dd>
              {assignedProvider.type === 'DOCTOR' ? (
                <>
                  <dt>Specialty</dt>
                  <dd>{assignedProvider.specialty ?? 'General Practice'}</dd>
                  {assignedProvider.licenseNumber ? (
                    <>
                      <dt>PRC License</dt>
                      <dd>{assignedProvider.licenseNumber}</dd>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <dt>Vehicle</dt>
                  <dd>{assignedProvider.vehicleType ?? 'Transport Vehicle'}</dd>
                  {assignedProvider.plateNumber ? (
                    <>
                      <dt>Plate number</dt>
                      <dd>{assignedProvider.plateNumber}</dd>
                    </>
                  ) : null}
                </>
              )}
              <dt>Contact</dt>
              <dd>{assignedProvider.phone ?? '—'}</dd>
              <dt>Municipality</dt>
              <dd>{assignedProvider.municipality}</dd>
            </dl>
          ) : (
            <p className="muted">
              No {r.kind === 'telehealth' ? 'doctor' : r.kind === 'transport' ? 'driver' : 'provider'} assigned yet.{' '}
              {canAssign ? (
                <button type="button" className="link-btn" onClick={() => setOpen('assign')}>
                  Assign now
                </button>
              ) : r.kind === 'telehealth' && !isSuper ? (
                <span className="small"> (Doctor assignment is handled by Super Admin)</span>
              ) : null}
            </p>
          )}

          <h2 className="mt16">Client</h2>
          <dl className="facts">
            <dt>Name</dt>
            <dd>
              <Link to={`/clients/${client.id}`}>{client.name}</Link>
            </dd>
            <dt>Address</dt>
            <dd>{client.address}</dd>
            {client.landmark ? (
              <>
                <dt>Landmark</dt>
                <dd>{client.landmark}</dd>
              </>
            ) : null}
            <dt>Requested by</dt>
            <dd>
              {requestedBy.name ?? requestedBy.email ?? 'Family account'}
              {requestedBy.phone ? <span className="muted small"> · {requestedBy.phone}</span> : null}
            </dd>
          </dl>

          <h2 className="mt16">Schedule & Note</h2>
          <dl className="facts">
            <dt>Scheduled</dt>
            <dd>{r.scheduledAt ? dateTime(r.scheduledAt) : '—'}</dd>
            <dt>Note shown in the app</dt>
            <dd>{r.staffNote ?? <span className="muted">None</span>}</dd>
            <dt>Handled by</dt>
            <dd>{r.handledBy ?? '—'}</dd>
          </dl>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Staff actions on this request</h2>
          <Link to={`/audit?entityType=service_request&entityId=${r.id}`} className="link-arrow">
            Audit log <Icon name="alt-arrow-right" size={16} />
          </Link>
        </div>
        {history.length ? (
          <ul className="activity">
            {history.map((h) => (
              <li key={h.id}>
                <span className="dot" aria-hidden="true" />
                <span>
                  <b>{personName(h.actor)}</b> {actionLabel(h.action).toLowerCase()}
                </span>
                <span className="muted small">{relative(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No staff actions yet.</p>
        )}
      </section>

      {open === 'assign' ? <AssignProviderModal detail={detail.data} onClose={() => setOpen(null)} onDone={done} /> : null}
      {open === 'schedule' || open === 'complete' ? <StatusModal detail={detail.data} mode={open} onClose={() => setOpen(null)} onDone={done} /> : null}
      {open === 'cancel' ? <CancelModal id={r.id} onClose={() => setOpen(null)} onDone={done} /> : null}
    </>
  );
}

/** datetime-local value in Manila time, e.g. 2026-10-18T14:00. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().slice(0, 16);
}

export function AssignProviderModal({
  detail,
  onClose,
  onDone,
}: {
  detail: ServiceDetail;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const r = detail.request;
  const isDoctor = r.kind === 'telehealth';
  const list = useLoad(() => api.serviceCandidates(r.id).then((res) => res.candidates), [r.id]);
  const action = useAction();
  const [selectedId, setSelectedId] = useState<string>(detail.assignedProvider?.id ?? '');
  const [when, setWhen] = useState(toLocalInput(r.scheduledAt ?? r.preferredAt));
  const [note, setNote] = useState(r.staffNote ?? '');
  const [showAll, setShowAll] = useState(false);

  const shown = (list.data ?? []).filter((c) => showAll || c.eligible);
  const hidden = (list.data ?? []).length - shown.length;

  const assign = async () => {
    if (!selectedId) return;
    const res = await action.run(() =>
      api.assignService(r.id, {
        providerId: selectedId,
        scheduledAt: when ? new Date(`${when}:00+08:00`).toISOString() : undefined,
        note: note.trim() || undefined,
      }),
    );
    if (res) {
      onDone(`${isDoctor ? 'Doctor' : 'Driver'} assigned${res.familyEmail === 'sent' ? '. The family was emailed' : ''}.`);
    }
  };

  return (
    <Modal
      title={`Assign ${isDoctor ? 'Doctor / Teleconsultant' : 'Transport Driver'}`}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={action.busy} disabled={!selectedId} onClick={assign}>
            Confirm assignment
          </Button>
        </>
      }
    >
      <p className="muted small">
        Available {isDoctor ? 'teleconsultants across Cagayan' : 'transport operators in your municipalities'}:
      </p>
      <ErrorNotice error={action.error} />
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorNotice error={list.error} />
      ) : !shown.length ? (
        <Notice tone="warn" title={`No ${isDoctor ? 'doctors' : 'drivers'} available`}>
          {hidden
            ? `Every ${isDoctor ? 'doctor' : 'driver'} has a blocker. Show all to see why, or register a new one.`
            : `No ${isDoctor ? 'doctors' : 'drivers'} registered yet.`}{' '}
          <Link to={isDoctor ? '/telehealth?add=doctor' : '/drivers?add=driver'}>Add a {isDoctor ? 'doctor' : 'driver'}</Link>
        </Notice>
      ) : (
        <ul className="list mb16">
          {shown.map((c: ProviderCandidate) => (
            <li
              key={c.id}
              className={`list-row candidate ${selectedId === c.id ? 'candidate-selected' : ''}`}
              style={{ cursor: c.eligible ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => c.eligible && setSelectedId(c.id)}
            >
              <span>
                <b>{c.type === 'DOCTOR' ? `Dr. ${c.fullName}` : c.fullName}</b>{' '}
                {c.current ? <Badge tone="info">Current</Badge> : null}
                <span className="cell-sub">
                  {c.type === 'DOCTOR' ? c.specialty ?? 'General Practice' : c.vehicleType ?? 'Transport Vehicle'}
                  {c.licenseNumber ? ` · PRC #${c.licenseNumber}` : ''}
                  {c.plateNumber ? ` · Plate ${c.plateNumber}` : ''} · {c.municipality}
                  {c.phone ? ` · ${c.phone}` : ''}
                </span>
                {c.blockers.map((b) => (
                  <span key={b} className="cell-sub reason-bad">
                    ✕ {b}
                  </span>
                ))}
                {c.warnings.map((w) => (
                  <span key={w} className="cell-sub reason-warn">
                    ! {w}
                  </span>
                ))}
              </span>
              <input
                type="radio"
                name="selected-provider"
                checked={selectedId === c.id}
                disabled={!c.eligible}
                onChange={() => setSelectedId(c.id)}
                aria-label={`Select ${c.fullName}`}
              />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <button type="button" className="link-btn small mb16" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide unavailable providers' : `Show ${hidden} unavailable providers, and why`}
        </button>
      ) : null}

      <div className="stack16 mt16">
        <Field
          label="Scheduled Date and Time (Philippine time)"
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          hint={r.preferredAt ? `Family preferred: ${dateTime(r.preferredAt)}` : undefined}
        />
        <div className="field">
          <label htmlFor="assign-note">Note for the family (shown in app & email)</label>
          <textarea
            id="assign-note"
            className="input"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isDoctor ? 'e.g. Dr. Santos will initiate the teleconsult via Google Meet.' : 'e.g. Driver will arrive at your sitio landmark.'}
          />
        </div>
      </div>
    </Modal>
  );
}

function StatusModal({ detail, mode, onClose, onDone }: { detail: ServiceDetail; mode: 'schedule' | 'complete'; onClose: () => void; onDone: (msg: string) => void }) {
  const r = detail.request;
  const [when, setWhen] = useState(toLocalInput(r.scheduledAt ?? r.preferredAt));
  const [note, setNote] = useState(r.staffNote ?? '');
  const action = useAction();
  const schedule = mode === 'schedule';
  return (
    <Modal
      title={schedule ? `Schedule ${r.kindLabel.toLowerCase()}` : 'Mark as completed'}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button
            busy={action.busy}
            disabled={schedule && !when}
            onClick={async () => {
              const res = await action.run(() =>
                api.serviceStatus(r.id, { status: schedule ? 'SCHEDULED' : 'COMPLETED', ...(schedule ? { scheduledAt: new Date(`${when}:00+08:00`).toISOString() } : {}), note: note.trim() }),
              );
              if (res) onDone(schedule ? `Scheduled${res.familyEmail === 'sent' ? '. The family was emailed' : ''}.` : 'Marked completed.');
            }}
          >
            {schedule ? 'Schedule' : 'Mark completed'}
          </Button>
        </>
      }
    >
      {schedule ? <Field label="Date and time (Philippine time)" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required hint={r.preferredAt ? `The family asked for ${dateTime(r.preferredAt)}.` : undefined} /> : null}
      <div className="field">
        <label htmlFor="family-note">Note for the family (shown in the app)</label>
        <textarea id="family-note" className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Dr. Reyes will call at this time. Have the BP readings ready." />
      </div>
      <ErrorNotice error={action.error} />
    </Modal>
  );
}

function CancelModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [reason, setReason] = useState('');
  const action = useAction();
  return (
    <Modal
      title="Cancel this request"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button
            variant="danger"
            busy={action.busy}
            disabled={reason.trim().length < 5}
            onClick={async () => {
              const res = await action.run(() => api.serviceStatus(id, { status: 'CANCELLED', reason: reason.trim() }));
              if (res) onDone(`Cancelled${res.familyEmail === 'sent' ? '. The family was emailed' : ''}.`);
            }}
          >
            Cancel request
          </Button>
        </>
      }
    >
      <p>The family sees this reason in the app and by email, so write it for them.</p>
      <div className="field">
        <label htmlFor="svc-reason">Reason</label>
        <textarea id="svc-reason" className="input" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <ErrorNotice error={action.error} />
    </Modal>
  );
}
