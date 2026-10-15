import { Link } from 'react-router-dom';
import { api } from '../api';
import { useMe } from '../auth';
import { ExportButton, Pagination, PaymentBadge, ScopeNote, useUrlFilters } from '../components/ops';
import { Button, ErrorNotice, Loading, PageHeader, useLoad } from '../components/ui';
import { dateTime, METHOD_LABEL, money, num, PAYMENT_STATUS } from '../format';

const KEYS = ['status', 'method', 'from', 'to'] as const;

export function Payments() {
  const me = useMe();
  const f = useUrlFilters(KEYS);
  const list = useLoad(() => api.payments({ ...f.values, page: String(f.page) }), [f.key]);
  const t = list.data?.totals;

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle={
          <>
            Client payments for shifts · <ScopeNote municipalities={me.municipalities} />
          </>
        }
        actions={<ExportButton table="payments" filters={{ from: f.values.from, to: f.values.to }} />}
      />
      <div className="filters">
        <select className="input" value={f.values.status} onChange={(e) => f.set('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {Object.entries(PAYMENT_STATUS).map(([value, m]) => (
            <option key={value} value={value}>
              {m.label}
            </option>
          ))}
        </select>
        <select className="input" value={f.values.method} onChange={(e) => f.set('method', e.target.value)} aria-label="Method">
          <option value="">Any method</option>
          {Object.entries(METHOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
      {list.error ? <ErrorNotice error={list.error} /> : null}
      {t ? (
        <div className="kpis">
          <div className="kpi">
            <span className="kpi-label">Received</span>
            <span className="kpi-value">{money(t.succeeded)}</span>
          </div>
          <div className={`kpi ${t.pendingCount ? 'kpi-warn' : ''}`}>
            <span className="kpi-label">Pending</span>
            <span className="kpi-value">{money(t.pending)}</span>
            <span className="kpi-sub">{num(t.pendingCount)} payment(s)</span>
          </div>
          <div className={`kpi ${t.failedCount ? 'kpi-bad' : ''}`}>
            <span className="kpi-label">Failed</span>
            <span className="kpi-value">{num(t.failedCount)}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Payments shown</span>
            <span className="kpi-value">{num(list.data!.total)}</span>
          </div>
        </div>
      ) : null}
      {!list.data ? (
        list.loading ? <Loading /> : null
      ) : (
        <div className={list.loading ? 'refetching' : undefined}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Request</th>
                  <th>Client</th>
                  <th>Caregiver</th>
                  <th>Method</th>
                  <th className="num">Amount</th>
                  <th className="num">Caregiver / platform</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.ref}</b>
                      <span className="cell-sub">{dateTime(p.createdAt)}</span>
                    </td>
                    <td>
                      <Link to={`/requests/${p.request.id}`}>{p.request.ref}</Link>
                    </td>
                    <td>
                      <Link to={`/clients/${p.client.id}`}>{p.client.name}</Link>
                      <span className="cell-sub">{p.municipality}</span>
                    </td>
                    <td>{p.caregiver ? <Link to={`/caregivers/${p.caregiver.id}`}>{p.caregiver.name}</Link> : <span className="muted">—</span>}</td>
                    <td>
                      {METHOD_LABEL[p.method]}
                      <span className="cell-sub">{p.providerReference ?? (p.method === 'CASH' ? 'Cash' : '—')}</span>
                    </td>
                    <td className="num">{money(p.amount)}</td>
                    <td className="num">
                      {money(p.split.caregiver)} / {money(p.split.platform)}
                    </td>
                    <td>
                      <PaymentBadge status={p.status} />
                      {p.paidAt ? <span className="cell-sub">{dateTime(p.paidAt)}</span> : null}
                    </td>
                  </tr>
                ))}
                {!list.data.payments.length ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      {f.active ? 'No payments match these filters.' : 'No payments recorded yet.'}
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
