import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { Pagination, ScopeNote, StatusBadge, useUrlFilters } from '../components/ops';
import { Badge, Button, ErrorNotice, Loading, PageHeader, useLoad } from '../components/ui';
import { dateTime, day, money, TIER_LABEL, timeOnly } from '../format';

const KEYS = ['q', 'municipality', 'accredited', 'available', 'badge'] as const;
const BADGE_LABEL: Record<string, string> = { BADGE_ADL: 'ADL', BADGE_CVMC_WATCHER: 'CVMC watcher' };
const badgeLabel = (b: string) => BADGE_LABEL[b] ?? b.replace(/^BADGE_/, '').replace(/_/g, ' ');

export function Caregivers() {
  const me = useMe();
  const navigate = useNavigate();
  const f = useUrlFilters(KEYS);
  const list = useLoad(() => api.caregivers({ ...f.values, page: String(f.page) }), [f.key]);

  return (
    <>
      <PageHeader
        title="Caregivers"
        subtitle={
          <>
            Roster · <ScopeNote municipalities={me.municipalities} />
          </>
        }
      />
      <div className="filters">
        <input className="input" type="search" placeholder="Search by name" value={f.values.q} onChange={(e) => f.set('q', e.target.value)} aria-label="Search caregivers" />
        <select className="input" value={f.values.accredited} onChange={(e) => f.set('accredited', e.target.value)} aria-label="Accreditation">
          <option value="">Accredited or not</option>
          <option value="yes">Accredited</option>
          <option value="no">Not accredited</option>
        </select>
        <select className="input" value={f.values.available} onChange={(e) => f.set('available', e.target.value)} aria-label="Availability">
          <option value="">Any availability</option>
          <option value="yes">Available</option>
          <option value="no">Not available</option>
        </select>
        <select className="input" value={f.values.badge} onChange={(e) => f.set('badge', e.target.value)} aria-label="Badge">
          <option value="">Any badge</option>
          <option value="BADGE_ADL">ADL</option>
          <option value="BADGE_CVMC_WATCHER">CVMC watcher</option>
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
                  <th>Name</th>
                  <th>Area</th>
                  <th>Accredited</th>
                  <th>Badges</th>
                  <th>Available</th>
                  <th className="num">Rating</th>
                  <th className="num">Shifts done</th>
                  <th className="num">Active now</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {list.data.caregivers.map((g) => (
                  <tr key={g.id} className="row-link" onClick={() => navigate(`/caregivers/${g.id}`)}>
                    <td>
                      <Link to={`/caregivers/${g.id}`} className="strong-link" onClick={(e) => e.stopPropagation()}>
                        {g.fullName ?? 'Unnamed'}
                      </Link>
                      <span className="cell-sub">{g.phone ?? ''}</span>
                    </td>
                    <td>
                      {g.barangay ? `Brgy. ${g.barangay}` : '—'}
                      <span className="cell-sub">{g.municipality ?? ''}</span>
                    </td>
                    <td>{g.isAccredited ? <Badge tone="good">Yes</Badge> : <Badge tone="warn">Not yet</Badge>}</td>
                    <td>
                      <span className="badges">{g.badges.length ? g.badges.map((b) => <Badge key={b}>{badgeLabel(b)}</Badge>) : <span className="muted">—</span>}</span>
                    </td>
                    <td>{g.isAvailable ? <Badge tone="good">Available</Badge> : <span className="muted">No</span>}</td>
                    <td className="num">{g.averageRating?.toFixed(1) ?? '—'}</td>
                    <td className="num">{g.totalShiftsCompleted}</td>
                    <td className="num">{g.activeShifts}</td>
                    <td className="chev">
                      <Icon name="alt-arrow-right" size={16} />
                    </td>
                  </tr>
                ))}
                {!list.data.caregivers.length ? (
                  <tr>
                    <td colSpan={9} className="empty">
                      {f.active ? 'No caregivers match these filters.' : 'No caregivers yet.'}
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

export function CaregiverDetail() {
  const { id = '' } = useParams();
  const detail = useLoad(() => api.caregiver(id), [id]);
  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error || !detail.data) return <ErrorNotice error={detail.error} />;
  const { caregiver: g, shifts, earnings } = detail.data;

  return (
    <>
      <PageHeader
        back={
          <Link to="/caregivers" className="back-link">
            <Icon name="alt-arrow-left" size={16} /> Caregivers
          </Link>
        }
        title={g.fullName ?? 'Unnamed caregiver'}
        subtitle={[g.sitio, g.barangay ? `Brgy. ${g.barangay}` : null, g.municipality].filter(Boolean).join(', ')}
        actions={
          <Link to={`/requests?caregiverId=${g.id}`} className="btn btn-secondary">
            All their requests
          </Link>
        }
      />
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Completed shifts (here)</span>
          <span className="kpi-value">{earnings.completedShifts}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Earned (80% share)</span>
          <span className="kpi-value">{money(earnings.payouts)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Upcoming confirmed</span>
          <span className="kpi-value">{earnings.upcoming}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Rating</span>
          <span className="kpi-value">{g.averageRating?.toFixed(1) ?? '—'}</span>
          <span className="kpi-sub">{g.totalShiftsCompleted} shifts overall</span>
        </div>
      </div>
      <section className="card">
        <h2>Profile</h2>
        <dl className="facts">
          <dt>Phone</dt>
          <dd>{g.phone ?? '—'}</dd>
          <dt>Accredited</dt>
          <dd>{g.isAccredited ? 'Yes' : 'Not yet'}</dd>
          <dt>Available for shifts</dt>
          <dd>{g.isAvailable ? 'Yes' : 'No'}</dd>
          <dt>Badges</dt>
          <dd>
            <span className="badges">{g.badges.length ? g.badges.map((b) => <Badge key={b}>{badgeLabel(b)}</Badge>) : 'None yet'}</span>
          </dd>
          <dt>App account</dt>
          <dd>{g.accountActive ? 'Active' : 'Deactivated'}</dd>
          <dt>Joined</dt>
          <dd>{dateTime(g.createdAt)}</dd>
        </dl>
        <p className="muted small">Accreditation, availability and badge changes arrive with the next phase (actions).</p>
      </section>
      <section className="card">
        <h2>Shifts</h2>
        {shifts.length ? (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Clock in / out</th>
                  <th className="num">Pay</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/requests/${s.id}`}>{s.ref}</Link>
                    </td>
                    <td className="nowrap">{day(s.scheduledDate)}</td>
                    <td>
                      <Link to={`/clients/${s.client.id}`}>{s.client.name}</Link>
                      <span className="cell-sub">Brgy. {s.barangay}</span>
                    </td>
                    <td>{TIER_LABEL[s.tier]}</td>
                    <td className="nowrap">
                      {timeOnly(s.clockIn)} – {timeOnly(s.clockOut)}
                    </td>
                    <td className="num">{money(s.caregiverPayout)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No shifts in your municipalities yet.</p>
        )}
      </section>
    </>
  );
}
