import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { Pagination, ScopeNote, useUrlFilters } from '../components/ops';
import { Badge, Button, ErrorNotice, Loading, PageHeader, useLoad } from '../components/ui';
import { relative } from '../format';

const KEYS = ['q', 'municipality', 'barangay'] as const;

export function Clients() {
  const me = useMe();
  const navigate = useNavigate();
  const f = useUrlFilters(KEYS);
  const list = useLoad(() => api.clients({ ...f.values, page: String(f.page) }), [f.key]);

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={
          <>
            Registered clients · <ScopeNote municipalities={me.municipalities} />. Opening a client is recorded in the audit log.
          </>
        }
      />
      <div className="filters">
        <input className="input" type="search" placeholder="Search by name" value={f.values.q} onChange={(e) => f.set('q', e.target.value)} aria-label="Search clients" />
        {me.municipalities === 'ALL' || me.municipalities.length > 1 ? (
          <input className="input" placeholder="Municipality" value={f.values.municipality} onChange={(e) => f.set('municipality', e.target.value)} aria-label="Municipality" />
        ) : null}
        <input className="input" placeholder="Barangay" value={f.values.barangay} onChange={(e) => f.set('barangay', e.target.value)} aria-label="Barangay" />
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
                  <th>Location</th>
                  <th>Account phone</th>
                  <th className="num">Open requests</th>
                  <th className="num">All requests</th>
                  <th>Last request</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {list.data.clients.map((c) => (
                  <tr key={c.id} className="row-link" onClick={() => navigate(`/clients/${c.id}`)}>
                    <td>
                      <Link to={`/clients/${c.id}`} className="strong-link" onClick={(e) => e.stopPropagation()}>
                        {c.fullName}
                      </Link>
                    </td>
                    <td>
                      {[c.sitio, `Brgy. ${c.barangay}`].filter(Boolean).join(', ')}
                      <span className="cell-sub">{c.municipality}</span>
                    </td>
                    <td>{c.phone ?? '—'}</td>
                    <td className="num">{c.openRequests ? <Badge tone="info">{c.openRequests}</Badge> : 0}</td>
                    <td className="num">{c.totalRequests}</td>
                    <td>{relative(c.lastRequestAt)}</td>
                    <td className="chev">
                      <Icon name="alt-arrow-right" size={16} />
                    </td>
                  </tr>
                ))}
                {!list.data.clients.length ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      {f.active ? 'No clients match these filters.' : 'No clients registered yet.'}
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
