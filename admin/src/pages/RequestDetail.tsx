import { Link, useParams } from 'react-router-dom';
import { api, type ShiftStatus } from '../api';
import { Icon } from '../components/Icon';
import { PaymentBadge, StatusBadge } from '../components/ops';
import { Badge, ErrorNotice, Loading, Notice, PageHeader, useLoad } from '../components/ui';
import { actionLabel, clock, dateTime, day, METHOD_LABEL, money, personName, relative, TIER_LABEL } from '../format';

const FLOW: ShiftStatus[] = ['REQUESTED', 'MATCHING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
const FLOW_LABEL: Record<string, string> = { REQUESTED: 'Requested', MATCHING: 'Finding a caregiver', CONFIRMED: 'Caregiver confirmed', IN_PROGRESS: 'Shift started', COMPLETED: 'Shift completed' };

export function RequestDetail() {
  const { id = '' } = useParams();
  const detail = useLoad(() => api.request(id), [id]);
  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error || !detail.data) return <ErrorNotice error={detail.error} />;
  const { request: r, client, requestedBy, caregiver, payments, history } = detail.data;
  const reached = FLOW.indexOf(r.status === 'ESCALATED' || r.status === 'CANCELLED' ? 'REQUESTED' : r.status);
  const stepTime: Partial<Record<ShiftStatus, string | null>> = { REQUESTED: r.createdAt, IN_PROGRESS: r.clockIn, COMPLETED: r.clockOut };

  return (
    <>
      <PageHeader
        back={
          <Link to="/requests" className="back-link">
            <Icon name="alt-arrow-left" size={16} /> Requests
          </Link>
        }
        title={
          <>
            {r.ref} <StatusBadge status={r.status} />
          </>
        }
        subtitle={`${TIER_LABEL[r.tier]} · requested ${dateTime(r.createdAt)}`}
      />
      {r.status === 'ESCALATED' ? <Notice tone="bad" title="Escalated">This request needs a coordinator. Assigning caregivers from the console arrives in the next phase.</Notice> : null}
      {r.status === 'CANCELLED' ? (
        <Notice tone="info" title="Cancelled">
          {dateTime(r.cancelledAt)}
          {r.cancellationReason ? ` · ${r.cancellationReason}` : ''}
        </Notice>
      ) : null}

      <div className="grid-detail">
        <section className="card">
          <h2>Progress</h2>
          <ol className="timeline">
            {FLOW.map((step, i) => (
              <li key={step}>
                <span className={`dot ${i <= reached && r.status !== 'CANCELLED' ? 'done' : 'todo'}`} aria-hidden="true" />
                <span className={i <= reached ? undefined : 'muted'}>{FLOW_LABEL[step]}</span>
                <span className="muted small">{stepTime[step] ? dateTime(stepTime[step]) : ''}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="card">
          <h2>Schedule & place</h2>
          <dl className="facts">
            <dt>Date</dt>
            <dd>{day(r.scheduledDate, { dateStyle: 'full' })}</dd>
            <dt>Start</dt>
            <dd>
              {clock(r.scheduledStartTime)} · {r.durationHours} hours
            </dd>
            <dt>Clock in / out</dt>
            <dd>
              {r.clockIn ? dateTime(r.clockIn) : '—'} → {r.clockOut ? dateTime(r.clockOut) : '—'}
            </dd>
            <dt>Location</dt>
            <dd>{r.locationDetails}</dd>
            <dt>Care notes</dt>
            <dd>{r.careNotes ? `${r.careNotes} recorded (open the client to view, with a reason)` : 'None yet'}</dd>
          </dl>
        </section>
      </div>

      <div className="grid-detail">
        <section className="card">
          <div className="card-head">
            <h2>Client</h2>
            <Link to={`/clients/${client.id}`} className="link-arrow">
              Open client <Icon name="alt-arrow-right" size={16} />
            </Link>
          </div>
          <dl className="facts">
            <dt>Name</dt>
            <dd>{client.name}</dd>
            <dt>Address</dt>
            <dd>
              {[client.sitio, `Brgy. ${client.barangay}`, client.municipality].filter(Boolean).join(', ')}
            </dd>
            {client.landmarkNotes ? (
              <>
                <dt>Landmark</dt>
                <dd>{client.landmarkNotes}</dd>
              </>
            ) : null}
            <dt>Requested by</dt>
            <dd>
              {requestedBy.name ?? 'Unnamed'} <span className="muted small">({requestedBy.role.toLowerCase().replace('_', ' ')}{requestedBy.phone ? `, ${requestedBy.phone}` : ''})</span>
            </dd>
          </dl>
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Caregiver</h2>
            {caregiver ? (
              <Link to={`/caregivers/${caregiver.id}`} className="link-arrow">
                Open caregiver <Icon name="alt-arrow-right" size={16} />
              </Link>
            ) : null}
          </div>
          {caregiver ? (
            <dl className="facts">
              <dt>Name</dt>
              <dd>{caregiver.name}</dd>
              <dt>Accredited</dt>
              <dd>{caregiver.isAccredited ? 'Yes' : 'No'}</dd>
              <dt>Badges</dt>
              <dd>
                <span className="badges">{caregiver.badges.length ? caregiver.badges.map((b) => <Badge key={b}>{b === 'BADGE_ADL' ? 'ADL' : b === 'BADGE_CVMC_WATCHER' ? 'CVMC watcher' : b}</Badge>) : '—'}</span>
              </dd>
            </dl>
          ) : (
            <p className="muted">No caregiver assigned yet.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Money</h2>
        <div className="split">
          <div>
            <span className="muted small">Billed</span>
            <b>{money(r.grossRate)}</b>
          </div>
          <div>
            <span className="muted small">Caregiver (80%)</span>
            <b>{money(r.caregiverPayout)}</b>
          </div>
          <div>
            <span className="muted small">Platform (20%)</span>
            <b>{money(r.platformMargin)}</b>
          </div>
        </div>
        {payments.length ? (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.ref}</td>
                    <td>{METHOD_LABEL[p.method]}</td>
                    <td>{p.providerReference ?? '—'}</td>
                    <td className="num">{money(p.amount)}</td>
                    <td>
                      <PaymentBadge status={p.status} />
                    </td>
                    <td>{dateTime(p.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No payment recorded yet.</p>
        )}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Staff actions on this request</h2>
          <Link to={`/audit?entityType=shift&entityId=${r.id}`} className="link-arrow">
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
    </>
  );
}
