import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { ExportButton, Pagination, ScopeNote, StatusBadge, useUrlFilters } from '../components/ops';
import { Button, ErrorNotice, Loading, PageHeader, useLoad } from '../components/ui';
import { clock, day, dateTime, money, SHIFT_STATUS, TIER_LABEL } from '../format';
import type { ShiftStatus, ShiftTier } from '../api';

const KEYS = ['q', 'status', 'tier', 'municipality', 'barangay', 'from', 'to', 'clientId', 'caregiverId'] as const;

export function Requests() {
  const me = useMe();
  const navigate = useNavigate();
  const f = useUrlFilters(KEYS);
  const list = useLoad(() => api.requests({ ...f.values, page: String(f.page) }), [f.key]);
  const scope = me.municipalities;

  return (
    <>
      <PageHeader
        title="Requests"
        subtitle={
          <>
            Every service request, newest first · <ScopeNote municipalities={scope} />
          </>
        }
        actions={<ExportButton table="requests" filters={{ status: SHIFT_STATUS[f.values.status as ShiftStatus] ? f.values.status : undefined, tier: f.values.tier, from: f.values.from, to: f.values.to }} />}
      />
      <div className="filters">
        <input className="input" type="search" placeholder="Search client name or REQ- number" value={f.values.q} onChange={(e) => f.set('q', e.target.value)} aria-label="Search requests" />
        <select className="input" value={f.values.status} onChange={(e) => f.set('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="OPEN">All open</option>
          <option value="WAITING">Waiting for a caregiver</option>
          {Object.entries(SHIFT_STATUS).map(([value, m]) => (
            <option key={value} value={value}>
              {m.label}
            </option>
          ))}
        </select>
        <select className="input" value={f.values.tier} onChange={(e) => f.set('tier', e.target.value)} aria-label="Service">
          <option value="">All services</option>
          {Object.entries(TIER_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {scope === 'ALL' || scope.length > 1 ? (
          <input className="input" placeholder="Municipality" value={f.values.municipality} onChange={(e) => f.set('municipality', e.target.value)} aria-label="Municipality" list="scope-municipalities" />
        ) : null}
        <datalist id="scope-municipalities">{scope !== 'ALL' ? scope.map((m) => <option key={m} value={m} />) : null}</datalist>
        <label className="date-filter">
          From
          <input className="input" type="date" value={f.values.from} onChange={(e) => f.set('from', e.target.value)} />
        </label>
        <label className="date-filter">
          To
          <input className="input" type="date" value={f.values.to} onChange={(e) => f.set('to', e.target.value)} />
        </label>
        {f.active ? (
          <Button variant="quiet" onClick={f.clear}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {f.values.clientId || f.values.caregiverId ? (
        <p className="muted small">
          Showing requests for one {f.values.clientId ? 'client' : 'caregiver'}.{' '}
          <button type="button" className="link-btn" onClick={() => (f.set('clientId', ''), f.set('caregiverId', ''))}>
            Show all
          </button>
        </p>
      ) : null}
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
                  <th>Client</th>
                  <th>Location</th>
                  <th>Service</th>
                  <th>Scheduled</th>
                  <th>Caregiver</th>
                  <th>Status</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {list.data.requests.map((r) => (
                  <tr key={r.id} className="row-link" onClick={() => navigate(`/requests/${r.id}`)}>
                    <td>
                      <Link to={`/requests/${r.id}`} className="strong-link" onClick={(e) => e.stopPropagation()}>
                        {r.ref}
                      </Link>
                      <span className="cell-sub">{dateTime(r.createdAt)}</span>
                    </td>
                    <td>
                      <Link to={`/clients/${r.client.id}`} onClick={(e) => e.stopPropagation()}>
                        {r.client.name}
                      </Link>
                    </td>
                    <td>
                      Brgy. {r.barangay}
                      <span className="cell-sub">{r.municipality}</span>
                    </td>
                    <td>
                      {TIER_LABEL[r.tier as ShiftTier]}
                      <span className="cell-sub">{money(r.grossRate)} / 8 h</span>
                    </td>
                    <td className="nowrap">
                      {day(r.scheduledDate)}
                      <span className="cell-sub">{clock(r.scheduledStartTime)}</span>
                    </td>
                    <td>
                      {r.caregiver ? (
                        <Link to={`/caregivers/${r.caregiver.id}`} onClick={(e) => e.stopPropagation()}>
                          {r.caregiver.name}
                        </Link>
                      ) : (
                        <span className="muted">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="chev">
                      <Icon name="alt-arrow-right" size={16} />
                    </td>
                  </tr>
                ))}
                {!list.data.requests.length ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      {f.active ? 'No requests match these filters.' : 'No requests yet. They’ll appear here as soon as families book care.'}
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
