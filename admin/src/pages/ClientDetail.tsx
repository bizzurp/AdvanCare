import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type ClinicalRecord } from '../api';
import { Icon } from '../components/Icon';
import { StatusBadge } from '../components/ops';
import { Badge, Button, ErrorNotice, fieldError, Loading, Modal, Notice, PageHeader, useAction, useLoad } from '../components/ui';
import { dateTime, day, money, TIER_LABEL } from '../format';

export function ClientDetail() {
  const { id = '' } = useParams();
  const detail = useLoad(() => api.client(id), [id]);
  const [asking, setAsking] = useState(false);
  const [clinical, setClinical] = useState<ClinicalRecord | null>(null);

  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error || !detail.data) return <ErrorNotice error={detail.error} />;
  const { client, account, family, requests, summary } = detail.data;
  const ids = Object.entries({ PhilHealth: client.idsOnFile.philhealth, YAKAP: client.idsOnFile.yakap, PWD: client.idsOnFile.pwd, 'Senior citizen': client.idsOnFile.senior }).filter(([, on]) => on);

  return (
    <>
      <PageHeader
        back={
          <Link to="/clients" className="back-link">
            <Icon name="alt-arrow-left" size={16} /> Clients
          </Link>
        }
        title={client.fullName}
        subtitle={[client.sitio, `Brgy. ${client.barangay}`, client.municipality].filter(Boolean).join(', ')}
        actions={
          <Link to={`/requests?clientId=${client.id}`} className="btn btn-secondary">
            All requests
          </Link>
        }
      />
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Open requests</span>
          <span className="kpi-value">{summary.openRequests}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">All requests</span>
          <span className="kpi-value">{summary.totalRequests}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Completed shifts</span>
          <span className="kpi-value">{summary.completed}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Billed (completed)</span>
          <span className="kpi-value">{money(summary.spent)}</span>
        </div>
      </div>

      <div className="grid-detail">
        <section className="card">
          <h2>Profile</h2>
          <dl className="facts">
            <dt>Age</dt>
            <dd>{client.age ?? '—'}</dd>
            <dt>Gender</dt>
            <dd>{client.gender ?? '—'}</dd>
            <dt>Landmark</dt>
            <dd>{client.landmarkNotes ?? '—'}</dd>
            <dt>IDs on file</dt>
            <dd>{ids.length ? <span className="badges">{ids.map(([name]) => <Badge key={name}>{name}</Badge>)}</span> : 'None'}</dd>
            <dt>Managed by</dt>
            <dd>
              {account?.fullName ?? '—'} {account ? <span className="muted small">({account.role.toLowerCase().replace('_', ' ')}{account.phone ? `, ${account.phone}` : ''})</span> : null}
            </dd>
            <dt>Registered</dt>
            <dd>{dateTime(client.createdAt)}</dd>
          </dl>
          <p className="muted small">ID numbers are never shown in the console.</p>
        </section>
        <section className="card">
          <h2>Family & contacts</h2>
          {family.length ? (
            <ul className="list">
              {family.map((m) => (
                <li key={m.id} className="list-row">
                  <span>
                    <b>{m.name}</b> <span className="muted">· {m.relationship}</span>
                    <span className="cell-sub">
                      {m.phone ?? 'No phone'} · {m.notificationChannel}
                      {m.location ? ` · ${m.location}` : ''}
                    </span>
                  </span>
                  <span className="badges">
                    {m.isEmergencyContact ? <Badge tone="bad">Emergency</Badge> : null}
                    {m.isRemoteSponsor ? <Badge tone="info">Remote sponsor</Badge> : null}
                    {m.hasAccount ? <Badge>App account</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No family members added.</p>
          )}
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Clinical notes</h2>
          {!clinical ? (
            <Button variant="secondary" onClick={() => setAsking(true)}>
              <Icon name="eye" size={16} /> View clinical notes
            </Button>
          ) : (
            <Button variant="quiet" onClick={() => setClinical(null)}>
              Hide
            </Button>
          )}
        </div>
        {clinical ? <ClinicalView record={clinical} /> : <p className="muted">Hidden. You’ll be asked why you need them; your reason is saved in the audit log.</p>}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Request history</h2>
          <Link to={`/requests?clientId=${client.id}`} className="link-arrow">
            Open in Requests <Icon name="alt-arrow-right" size={16} />
          </Link>
        </div>
        {requests.length ? (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Service</th>
                  <th>Scheduled</th>
                  <th>Caregiver</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/requests/${r.id}`}>{r.ref}</Link>
                    </td>
                    <td>{TIER_LABEL[r.tier]}</td>
                    <td>{day(r.scheduledDate)}</td>
                    <td>{r.caregiver ? <Link to={`/caregivers/${r.caregiver.id}`}>{r.caregiver.name}</Link> : <span className="muted">—</span>}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No requests yet.</p>
        )}
      </section>

      {asking ? (
        <ReasonModal
          clientId={client.id}
          onClose={() => setAsking(false)}
          onLoaded={(record) => {
            setClinical(record);
            setAsking(false);
          }}
        />
      ) : null}
    </>
  );
}

function ReasonModal({ clientId, onClose, onLoaded }: { clientId: string; onClose: () => void; onLoaded: (r: ClinicalRecord) => void }) {
  const [reason, setReason] = useState('');
  const action = useAction();
  return (
    <Modal
      title="Why do you need the clinical notes?"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            busy={action.busy}
            disabled={reason.trim().length < 10}
            onClick={async () => {
              const res = await action.run(() => api.clinicalAccess(clientId, reason.trim()));
              if (res) onLoaded(res);
            }}
          >
            View notes
          </Button>
        </>
      }
    >
      <p>Clinical notes are health information. Your name, the time and this reason are saved in the audit log.</p>
      <div className="field">
        <label htmlFor="clinical-reason">Reason</label>
        <textarea id="clinical-reason" className="input" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Preparing the handover for tomorrow’s caregiver" />
        {fieldError(action.error, 'reason') ? <p className="field-error">{fieldError(action.error, 'reason')}</p> : <p className="field-hint">At least 10 characters.</p>}
      </div>
      {!fieldError(action.error, 'reason') ? <ErrorNotice error={action.error} /> : null}
    </Modal>
  );
}

function ClinicalView({ record }: { record: ClinicalRecord }) {
  return (
    <div className="clinical">
      <Notice tone="info">Access recorded in the audit log. Don’t copy these notes outside AdvanCare.</Notice>
      <article>
        <b>Recorded baseline</b>
        {record.clinicalBaseline ? <Values value={record.clinicalBaseline} /> : <span className="muted">No baseline recorded.</span>}
      </article>
      {record.careNotes.length ? (
        record.careNotes.map((n) => (
          <article key={n.id}>
            <span className="muted small">
              {dateTime(n.recordedAt)} · {n.caregiverName ?? 'Caregiver'} · <Link to={`/requests/${n.shiftId}`}>{n.ref}</Link>
            </span>
            {n.vitalsRecorded ? <Values value={n.vitalsRecorded} /> : <span className="muted small">No vitals measured.</span>}
            {Array.isArray(n.tasksCompleted) && n.tasksCompleted.length ? <span>Tasks: {n.tasksCompleted.map(String).join(', ')}</span> : null}
            {n.rawCaregiverNotes ? <p>{n.rawCaregiverNotes}</p> : null}
            {n.familySummary ? <p className="muted">Family summary: {n.familySummary}</p> : null}
          </article>
        ))
      ) : (
        <p className="muted">No care notes yet.</p>
      )}
    </div>
  );
}

/** Renders a JSON object of measurements as labelled chips (values shown as recorded; nothing defaulted). */
function Values({ value }: { value: unknown }) {
  if (!value || typeof value !== 'object') return <span>{String(value)}</span>;
  return (
    <span className="vitals">
      {Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => (
          <Badge key={k}>
            {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </Badge>
        ))}
    </span>
  );
}
