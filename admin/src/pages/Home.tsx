import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Account, type AlertRow, type AuditEntry, type ServiceRow } from '../api';
import { useMe } from '../auth';
import { BarList, ColumnChart } from '../components/charts';
import { Icon } from '../components/Icon';
import { MunicipalityFilter, CAGAYAN_MUNICIPALITIES } from '../components/MunicipalityFilter';
import { ScopeNote, StatusBadge } from '../components/ops';
import { Badge, Button, ErrorNotice, Loading, Modal, Notice, PageHeader, useLoad } from '../components/ui';
import { actionLabel, clock, day, dateTime, isFailureAction, money, num, personName, relative, scopeLabel, SERVICE_KIND_LABEL, SERVICE_STATUS, TIER_LABEL, todayManila, waitedFor } from '../format';
import { AssignProviderModal } from './Services';

function greeting(): string {
  const hour = Number(new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

export function Home() {
  const me = useMe();
  const isSuper = me.role === 'SUPER_ADMIN';
  const isMultiMuni = isSuper || (Array.isArray(me.municipalities) && me.municipalities.length > 1);
  const availableMunicipalities = useMemo(
    () => (me.municipalities === 'ALL' ? CAGAYAN_MUNICIPALITIES : me.municipalities),
    [me.municipalities],
  );

  const [params, setParams] = useSearchParams();
  const range = RANGES.some((r) => r.value === params.get('range')) ? params.get('range')! : '30';
  const muniParam = params.get('municipalities');

  const selectedMunicipalities = useMemo(() => {
    if (muniParam === null) return [...availableMunicipalities];
    if (!muniParam) return [];
    const requested = muniParam.split(',').map((s) => s.trim()).filter(Boolean);
    return requested.filter((m) => availableMunicipalities.includes(m));
  }, [muniParam, availableMunicipalities]);

  const handleMunicipalitiesChange = (next: string[]) => {
    setParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev);
        if (next.length === availableMunicipalities.length) {
          nextParams.delete('municipalities');
        } else {
          nextParams.set('municipalities', next.join(','));
        }
        return nextParams;
      },
      { replace: true },
    );
  };

  const overview = useLoad(
    () => api.overview(range, muniParam !== null ? selectedMunicipalities : undefined),
    [range, muniParam],
  );
  const activity = useLoad(() => api.audit({}), []);
  const accounts = useLoad(() => (isSuper ? api.accounts().then((r) => r.accounts) : Promise.resolve([] as Account[])), [isSuper]);
  const [assignModalId, setAssignModalId] = useState<string | null>(null);
  const telehealthQueue = useLoad(
    () => (isSuper ? api.services({ kind: 'telehealth', status: 'OPEN', page: '1' }) : Promise.resolve(null)),
    [isSuper],
  );
  const services = useLoad(() => api.services({ status: 'OPEN', page: '1' }), []);
  const assignDetail = useLoad(
    () => (assignModalId ? api.service(assignModalId) : Promise.resolve(null)),
    [assignModalId],
  );
  const o = overview.data;
  const from = todayManila(-(Number(range) - 1));

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${personName(me).split(' ')[0]}`}
        subtitle={
          <>
            Operations in {muniParam !== null ? scopeLabel(selectedMunicipalities) : <ScopeNote municipalities={me.municipalities} />}. Figures update when you open this page.
          </>
        }
      />

      {me.recoveryCodesRemaining <= 3 ? (
        <Notice tone="warn" title={me.recoveryCodesRemaining === 0 ? 'You have no recovery codes left' : `Only ${me.recoveryCodesRemaining} recovery codes left`}>
          If you lose your phone you won’t be able to sign in. <Link to="/account">Make new recovery codes</Link>.
        </Notice>
      ) : null}

      <div className="filters" role="group" aria-label="Dashboard filters">
        <div className="segmented">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() =>
                setParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('range', r.value);
                    return next;
                  },
                  { replace: true },
                )
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        {isMultiMuni ? (
          <MunicipalityFilter
            value={selectedMunicipalities}
            onChange={handleMunicipalitiesChange}
            availableMunicipalities={availableMunicipalities}
          />
        ) : null}
        <Button variant="quiet" onClick={() => { void overview.reload(); void services.reload(); }} busy={overview.loading && !!o}>
          Refresh
        </Button>
      </div>

      {overview.error ? <ErrorNotice error={overview.error} /> : null}
      {!o ? (
        overview.loading ? <Loading /> : null
      ) : (
        <div className={`stack20 ${overview.loading ? 'refetching' : ''}`}>
          <div className="kpis">
            <Kpi label="Waiting for a caregiver" value={o.kpis.waiting} to="/requests?status=WAITING" tone={o.kpis.waiting ? 'warn' : undefined} />
            <Kpi label="In progress now" value={o.kpis.inProgress} to="/requests?status=IN_PROGRESS" />
            <Kpi label="Escalated" value={o.kpis.escalated} to="/requests?status=ESCALATED" tone={o.kpis.escalated ? 'bad' : undefined} />
            <Kpi label="New service requests" value={o.kpis.servicesNew} to="/services?status=SUBMITTED" sub={`${num(o.kpis.servicesOpen)} open in total`} tone={o.kpis.servicesNew ? 'warn' : undefined} />
          </div>

          <div className="kpis">
            <Kpi label={`Requests, ${RANGES.find((r) => r.value === range)!.label.toLowerCase()}`} value={o.kpis.requests} to={`/requests?from=${from}`} sub={`${num(o.kpis.requestsToday)} today`} />
            <Kpi label="Completed shifts" value={o.kpis.completed} to={`/requests?status=COMPLETED&from=${from}`} sub={`${num(o.kpis.cancelled)} cancelled`} />
            <Kpi label="Billed for completed shifts" value={money(o.kpis.revenue)} to={`/payments?from=${from}`} sub={`${money(o.kpis.payouts)} to caregivers · ${money(o.kpis.margin)} margin`} />
            <Kpi
              label="Caregivers available"
              value={o.kpis.caregivers.available}
              to="/caregivers?accredited=yes&available=yes"
              sub={`of ${num(o.kpis.caregivers.accredited)} accredited`}
              tone={o.kpis.caregivers.accredited && !o.kpis.caregivers.available ? 'warn' : undefined}
            />
          </div>

          <div className="grid-detail">
            <section className="card">
              <div className="card-head">
                <h2>Caregiver bookings needing a caregiver</h2>
                <Link to="/requests?status=OPEN" className="link-arrow">
                  All bookings <Icon name="alt-arrow-right" size={16} />
                </Link>
              </div>
              <AttentionList waiting={o.alerts.waiting} escalated={o.alerts.escalated} />
            </section>
            <section className="card">
              <h2>Requests by service</h2>
              <BarList
                valueLabel={num}
                empty="No requests in this period."
                items={o.byService.map((s) => ({ key: s.tier, label: TIER_LABEL[s.tier], value: s.requests, href: `/requests?tier=${s.tier}&from=${from}` }))}
              />
              <h2 className="mt8">Requests by status</h2>
              <BarList
                valueLabel={num}
                empty="No requests in this period."
                items={o.byStatus.filter((s) => s.requests > 0).map((s) => ({ key: s.status, label: <StatusBadge status={s.status} />, value: s.requests, href: `/requests?status=${s.status}&from=${from}` }))}
              />
            </section>
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Service requests waiting for staff</h2>
              <Link to="/services?status=OPEN" className="link-arrow">
                All service requests <Icon name="alt-arrow-right" size={16} />
              </Link>
            </div>
            <WaitingServices rows={services.data?.requests} loading={services.loading} error={services.error} />
          </section>

          <section className="card">
            <div className="card-head">
              <h2>New requests per day</h2>
            </div>
            <ColumnChart
              valueLabel={(n) => `${num(n)} request${n === 1 ? '' : 's'}`}
              points={o.daily.map((d, i, all) => ({
                key: d.day,
                label: day(d.day, { weekday: 'short', month: 'short', day: 'numeric' }),
                tick: i === all.length - 1 || i % Math.ceil(all.length / 7) === 0 ? day(d.day, { month: 'short', day: 'numeric' }) : '',
                value: d.requests,
              }))}
            />
            <p className="muted small">
              {num(o.kpis.clientsServed)} of {num(o.kpis.clientsRegistered)} registered clients had a request in this period.
            </p>
          </section>

          <section className="card">
            <div className="card-head">
              <div>
                <h2>Current data by municipality</h2>
                <p className="muted small">
                  Operational figures across {(o.byMunicipality ?? []).length} {(o.byMunicipality ?? []).length === 1 ? 'municipality' : 'municipalities'}.
                </p>
              </div>
            </div>
            {(o.byMunicipality ?? []).length === 0 ? (
              <p className="muted">No municipalities selected or available in your current scope.</p>
            ) : (
              <div className="table-wrap">
                <table className="table table-compact">
                  <thead>
                    <tr>
                      <th>Municipality</th>
                      <th>District</th>
                      <th className="table-num">Waiting</th>
                      <th className="table-num">In Progress</th>
                      <th className="table-num">Total Requests</th>
                      <th className="table-num">Available Caregivers</th>
                      <th className="table-num">Revenue</th>
                      <th aria-label="Quick drilldowns">Quick Drilldowns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(o.byMunicipality ?? []).map((m) => (
                      <tr key={m.municipality}>
                        <td>
                          <Link
                            to={`/requests?municipality=${encodeURIComponent(m.municipality)}&from=${from}`}
                            className="strong-link"
                          >
                            {m.municipality}
                          </Link>
                        </td>
                        <td>
                          <Badge tone="neutral">{m.district}</Badge>
                        </td>
                        <td className="table-num">
                          {m.waiting > 0 ? (
                            <Link
                              to={`/requests?municipality=${encodeURIComponent(m.municipality)}&status=WAITING`}
                              aria-label={`${num(m.waiting)} waiting requests in ${m.municipality}`}
                            >
                              <Badge tone="warn">{num(m.waiting)}</Badge>
                            </Link>
                          ) : (
                            <span className="muted">0</span>
                          )}
                        </td>
                        <td className="table-num">
                          {m.inProgress > 0 ? (
                            <Link
                              to={`/requests?municipality=${encodeURIComponent(m.municipality)}&status=IN_PROGRESS`}
                              aria-label={`${num(m.inProgress)} in-progress requests in ${m.municipality}`}
                            >
                              <Badge tone="info">{num(m.inProgress)}</Badge>
                            </Link>
                          ) : (
                            <span className="muted">0</span>
                          )}
                        </td>
                        <td className="table-num">
                          {m.requests > 0 ? (
                            <Link
                              to={`/requests?municipality=${encodeURIComponent(m.municipality)}&from=${from}`}
                              aria-label={`${num(m.requests)} total requests in ${m.municipality}`}
                            >
                              {num(m.requests)}
                            </Link>
                          ) : (
                            <span className="muted">0</span>
                          )}
                        </td>
                        <td className="table-num">
                          {m.availableCaregivers > 0 ? (
                            <Link
                              to={`/caregivers?municipality=${encodeURIComponent(m.municipality)}&accredited=yes&available=yes`}
                              aria-label={`${num(m.availableCaregivers)} available caregivers in ${m.municipality}`}
                            >
                              <Badge tone="good">{num(m.availableCaregivers)}</Badge>
                            </Link>
                          ) : (
                            <span className="muted">0</span>
                          )}
                        </td>
                        <td className="table-num">{money(m.revenue)}</td>
                        <td>
                          <div className="table-actions-cell">
                            <Link
                              to={`/requests?municipality=${encodeURIComponent(m.municipality)}`}
                              className="link-arrow small"
                              aria-label={`View requests in ${m.municipality}`}
                            >
                              Requests
                            </Link>
                            <span className="muted" aria-hidden="true">·</span>
                            <Link
                              to={`/caregivers?municipality=${encodeURIComponent(m.municipality)}`}
                              className="link-arrow small"
                              aria-label={`View caregivers in ${m.municipality}`}
                            >
                              Caregivers
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {isSuper ? (
        <TelehealthQueueSection
          queue={telehealthQueue.data}
          loading={telehealthQueue.loading}
          error={telehealthQueue.error}
          assigningId={assignModalId && assignDetail.loading ? assignModalId : null}
          onAssign={(id) => setAssignModalId(id)}
        />
      ) : null}

      {isSuper ? <StaffSummary accounts={accounts.data} loading={accounts.loading} error={accounts.error} /> : null}

      <section className="card">
        <div className="card-head">
          <h2>{isSuper ? 'Recent staff activity' : 'Your recent activity'}</h2>
          <Link to="/audit" className="link-arrow">
            Full audit log <Icon name="alt-arrow-right" size={16} />
          </Link>
        </div>
        {activity.loading ? <Loading /> : activity.error ? <ErrorNotice error={activity.error} /> : <ActivityList entries={activity.data?.entries.slice(0, 8) ?? []} />}
      </section>

      {assignModalId && assignDetail.error ? (
        <Modal title="Unable to load request details" onClose={() => setAssignModalId(null)}>
          <ErrorNotice error={assignDetail.error} />
          <div className="mt16" style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setAssignModalId(null)}>
              Close
            </Button>
          </div>
        </Modal>
      ) : null}

      {assignModalId && assignDetail.data ? (
        <AssignProviderModal
          detail={assignDetail.data}
          onClose={() => setAssignModalId(null)}
          onDone={() => {
            setAssignModalId(null);
            void telehealthQueue.reload();
            void overview.reload();
            void services.reload();
          }}
        />
      ) : null}
    </>
  );
}

function Kpi({ label, value, to, sub, tone }: { label: string; value: number | string; to: string; sub?: string; tone?: 'warn' | 'bad' }) {
  return (
    <Link to={to} className={`kpi ${tone ? `kpi-${tone}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{typeof value === 'number' ? num(value) : value}</span>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </Link>
  );
}

/** TeleHealth, RHU, Triage, Prescription, Transport and Pharmacy requests nobody has confirmed yet. */
function WaitingServices({ rows, loading, error }: { rows: ServiceRow[] | undefined; loading: boolean; error: unknown }) {
  if (loading && !rows) return <Loading />;
  if (error) return <ErrorNotice error={error} />;
  const waiting = (rows ?? []).filter((r) => r.status === 'SUBMITTED' || r.status === 'IN_REVIEW');
  if (!waiting.length) return <p className="muted">Nothing waiting. Every service request is confirmed or closed.</p>;
  return (
    <ul className="list">
      {waiting.map((r) => (
        <li key={r.id}>
          <Link to={`/services/${r.id}`} className="list-row attention-row">
            <span className="attention-main">
              <b>
                {SERVICE_KIND_LABEL[r.kind] ?? r.kind} · {r.client.name}
              </b>
              <span className="muted small">
                {r.summary ?? r.ref} · Brgy. {r.barangay}, {r.municipality}
                {r.preferredAt ? ` · wants ${dateTime(r.preferredAt)}` : ''}
              </span>
            </span>
            <Badge tone="warn">Waiting {waitedFor(r.createdAt)}</Badge>
            <Icon name="alt-arrow-right" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AttentionList({ waiting, escalated }: { waiting: AlertRow[]; escalated: AlertRow[] }) {
  if (!waiting.length && !escalated.length) return <p className="muted">Nothing waiting. Every request has a caregiver or is closed.</p>;
  const rows = [...escalated.map((r) => ({ ...r, why: 'Escalated' })), ...waiting.map((r) => ({ ...r, why: `Waiting ${waitedFor(r.createdAt)}` }))];
  return (
    <ul className="list">
      {rows.map((r) => (
        <li key={r.id}>
          <Link to={`/requests/${r.id}`} className="list-row attention-row">
            <span className="attention-main">
              <b>{r.client.name}</b>
              <span className="muted small">
                {TIER_LABEL[r.tier]} · Brgy. {r.barangay}, {r.municipality} · {day(r.scheduledDate, { month: 'short', day: 'numeric' })} {clock(r.scheduledStartTime)}
              </span>
            </span>
            <Badge tone={r.status === 'ESCALATED' ? 'bad' : 'warn'}>{r.why}</Badge>
            <Icon name="alt-arrow-right" size={16} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function StaffSummary({ accounts, loading, error }: { accounts: Account[] | null; loading: boolean; error: unknown }) {
  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} />;
  const list = accounts ?? [];
  const tiles = [
    { label: 'Active Admins', value: list.filter((a) => a.role === 'ADMIN' && a.status === 'ACTIVE').length, to: '/admins?role=ADMIN&status=ACTIVE' },
    { label: 'Active Super Admins', value: list.filter((a) => a.role === 'SUPER_ADMIN' && a.status === 'ACTIVE').length, to: '/admins?role=SUPER_ADMIN&status=ACTIVE' },
    { label: 'Invites pending', value: list.filter((a) => a.status === 'INVITED').length, to: '/admins?status=INVITED' },
    { label: 'Suspended', value: list.filter((a) => a.status === 'SUSPENDED').length, to: '/admins?status=SUSPENDED' },
  ];
  const attention = list.filter((a) => a.locked || a.pendingInvite?.awaitingApproval || a.pendingInvite?.expired);
  return (
    <>
      <h2 className="section-title">Staff accounts</h2>
      <div className="kpis">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="kpi">
            <span className="kpi-label">{t.label}</span>
            <span className="kpi-value">{t.value}</span>
          </Link>
        ))}
      </div>
      {attention.length ? (
        <section className="card">
          <div className="card-head">
            <h2>Staff accounts needing attention</h2>
          </div>
          <ul className="list">
            {attention.map((a) => (
              <li key={a.id}>
                <Link to={`/admins/${a.id}`} className="list-row">
                  <span>{personName(a)}</span>
                  {a.locked ? <Badge tone="bad">Locked out</Badge> : null}
                  {a.pendingInvite?.awaitingApproval ? <Badge tone="warn">Super Admin invite needs approval</Badge> : null}
                  {a.pendingInvite?.expired ? <Badge tone="warn">Invite expired</Badge> : null}
                  <Icon name="alt-arrow-right" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function TelehealthQueueSection({
  queue,
  loading,
  error,
  assigningId,
  onAssign,
}: {
  queue: { requests: ServiceRow[]; total: number } | null;
  loading: boolean;
  error: unknown;
  assigningId?: string | null;
  onAssign: (requestId: string) => void;
}) {
  if (loading && !queue) return <Loading label="Loading telehealth queue…" />;
  if (error) return <ErrorNotice error={error} />;
  const list = queue?.requests ?? [];
  const unassigned = list.filter((r) => !r.assignedProvider);

  return (
    <>
      <div className="card-head mt16">
        <div>
          <h2 className="section-title">Telehealth assignment queue</h2>
          <p className="muted small">
            Province-wide teleconsultation requests requiring doctor assignment (Super Admin).
          </p>
        </div>
        <Link to="/telehealth" className="link-arrow">
          Manage Doctors Roster <Icon name="alt-arrow-right" size={16} />
        </Link>
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Open teleconsults</span>
          <span className="kpi-value">{list.length}</span>
          <span className="kpi-sub">Across all LGUs</span>
        </div>
        <div className={`kpi ${unassigned.length ? 'kpi-warn' : ''}`}>
          <span className="kpi-label">Waiting for a doctor</span>
          <span className="kpi-value">{unassigned.length}</span>
          <span className="kpi-sub">Needs assignment</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Assigned / Scheduled</span>
          <span className="kpi-value">{list.length - unassigned.length}</span>
          <span className="kpi-sub">Doctor linked</span>
        </div>
      </div>

      <section className="card mb20">
        {!list.length ? (
          <p className="muted">No open telehealth requests right now. Every teleconsultation request is assigned or completed.</p>
        ) : (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Municipality</th>
                  <th>Preferred Time</th>
                  <th>Assigned Doctor</th>
                  <th aria-label="Action" />
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/services/${r.id}`} className="strong-link">
                        {r.ref}
                      </Link>
                      <span className="cell-sub">{SERVICE_STATUS[r.status]?.label ?? r.status}</span>
                    </td>
                    <td>{r.client.name}</td>
                    <td>{r.municipality}</td>
                    <td>{r.preferredAt ? dateTime(r.preferredAt) : 'As soon as possible'}</td>
                    <td>
                      {r.assignedProvider ? (
                        <Badge tone="good">Dr. {r.assignedProvider.fullName}</Badge>
                      ) : (
                        <Badge tone="warn">Unassigned</Badge>
                      )}
                    </td>
                    <td>
                      <Button
                        variant={r.assignedProvider ? 'secondary' : 'primary'}
                        busy={assigningId === r.id}
                        onClick={() => onAssign(r.id)}
                      >
                        {r.assignedProvider ? 'Change doctor' : 'Assign doctor'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

export function ActivityList({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <p className="muted">No activity yet.</p>;
  return (
    <ul className="activity">
      {entries.map((e) => (
        <li key={e.id}>
          <span className={`dot ${isFailureAction(e.action) ? 'dot-bad' : ''}`} aria-hidden="true" />
          <span className="activity-text">
            <b>{personName(e.actor)}</b> {actionLabel(e.action).toLowerCase()}
          </span>
          <time dateTime={e.createdAt} className="muted small">
            {relative(e.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
