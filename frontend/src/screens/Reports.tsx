import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Banner, Button, DependencyNote, PageHeader, Screen, Segmented, SelectField, ServiceRow, STATUS_META, StatusBadge } from '../components/ui';
import { peso, SERVICES, serviceTitle, SHIFT_RATES } from '../data/catalog';
import { buildDemoOperationsRecords } from '../data/demo';
import type { ServiceKind, ServiceRequest } from '../data/types';
import { useApp } from '../state/AppState';

// ---------- data access (role-aware) ----------
let opsCache: ServiceRequest[] | null = null;

function useRecords() {
  const { requests, session } = useApp();
  const role = session?.role ?? 'household';
  const records = useMemo(() => {
    if (role === 'coordinator') {
      opsCache ??= buildDemoOperationsRecords();
      return [...requests, ...opsCache];
    }
    return requests; // households see only their own records
  }, [requests, role]);
  return { records, role };
}

const dayMs = 864e5;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const recordDate = (r: ServiceRequest) => new Date(r.scheduledFor ?? r.createdAt);

type RangeId = '7' | '30' | '90' | 'all';
const RANGES: { value: RangeId; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

function rangeBounds(id: RangeId): [Date, Date] {
  const end = new Date(startOfDay(new Date()).getTime() + dayMs - 1);
  if (id === 'all') return [new Date(0), new Date(8.64e15)];
  return [new Date(startOfDay(new Date()).getTime() - (Number(id) - 1) * dayMs), end];
}

const fmtShort = (d: Date) => `${d.getDate()} ${d.toLocaleDateString('en-PH', { month: 'short' })}`;
const rangeLabel = (id: RangeId) => {
  if (id === 'all') return 'All time';
  const [s, e] = rangeBounds(id);
  return `${fmtShort(s)} – ${fmtShort(e)}`;
};

function filterRecords(records: ServiceRequest[], service: string, range: RangeId) {
  const [s, e] = rangeBounds(range);
  return records
    .filter((r) => (service === 'all' ? true : r.kind === service))
    .filter((r) => {
      // A record belongs to a period if it was scheduled or requested within it.
      const inside = (t: number) => t >= s.getTime() && t <= e.getTime();
      return inside(recordDate(r).getTime()) || inside(new Date(r.createdAt).getTime());
    })
    .sort((a, b) => recordDate(b).getTime() - recordDate(a).getTime());
}

// ---------------- 12 / Reports ----------------
export function Reports() {
  const { role } = useRecords();
  return (
    <Screen nav>
      <PageHeader title="Reports" back={false} />
      <div className="screen-body stack gap-16">
        <h2 className="t-h2">
          A clearer picture
          <br />
          of your care.
        </h2>
        <p className="t-body t-muted mb-8">View service records, explore trends, or see everything at a glance.</p>
        <ServiceRow icon="document-text" title="Service records" desc="Detailed records, dates, and status" to="/reports/records" />
        <ServiceRow icon="chart" title="Service trends" desc="Compare usage over time" to="/reports/trends" />
        <ServiceRow icon="pie-chart" title="Dashboard" desc={role === 'coordinator' ? 'Clients, services, plans, and revenue' : 'For coordinators and LGU partners'} to="/reports/dashboard" />
        <div className="card card-mint stack gap-8 mt-8">
          <Icon name="shield-check" className="t-teal" />
          <p className="t-section">Your records, together.</p>
          <p className="t-small t-muted">
            Reports reflect the services recorded in your AdvanCare account.
          </p>
        </div>
      </div>
    </Screen>
  );
}

// ---------------- 13 / Service records ----------------
export function ServiceRecords() {
  const navigate = useNavigate();
  const { records, role } = useRecords();
  const [params, setParams] = useSearchParams();
  const service = params.get('service') ?? 'all';
  const range = (params.get('range') as RangeId) ?? '30';
  const [shown, setShown] = useState(30);
  const list = useMemo(() => filterRecords(records, service, range), [records, service, range]);
  const update = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    p.set(k, v);
    setParams(p, { replace: true });
    setShown(30);
  };

  return (
    <Screen nav>
      <PageHeader title="Service records" back="/reports" />
      <div className="screen-body stack gap-16">
        <div className="grid-2">
          <SelectField label="Service" options={[{ value: 'all', label: 'All services' }, ...SERVICES.map((s) => ({ value: s.kind, label: s.title }))]} value={service} onChange={(e) => update('service', e.target.value)} />
          <SelectField label="Date range" options={RANGES} value={range} onChange={(e) => update('range', e.target.value)} />
        </div>
        <div className="row between">
          <p className="t-section" aria-live="polite">
            {list.length} service record{list.length === 1 ? '' : 's'}
          </p>
          <button className="link-btn" disabled={list.length === 0} onClick={() => navigate(`/reports/records/export?${params.toString() || `service=${service}&range=${range}`}`)}>
            Export
          </button>
        </div>
        <p className="t-caption t-muted" style={{ marginTop: -12 }}>
          {rangeLabel(range)}
          {role === 'coordinator' && (
            <>
              {' '}
            </>
          )}
        </p>
        {list.length === 0 ? (
          <div className="card t-center stack gap-8" style={{ alignItems: 'center', padding: 28 }}>
            <Icon name="document-text" className="t-teal" />
            <p className="t-medium">No records match these filters</p>
            <p className="t-caption t-muted">Try a longer date range or all services.</p>
          </div>
        ) : (
          <ul className="stack gap-12" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {list.slice(0, shown).map((r) => (
              <li key={r.id}>
                <RecordItem r={r} />
              </li>
            ))}
          </ul>
        )}
        {list.length > shown && (
          <Button variant="secondary" onClick={() => setShown((n) => n + 30)}>
            Show more ({list.length - shown} left)
          </Button>
        )}
      </div>
    </Screen>
  );
}

function RecordItem({ r }: { r: ServiceRequest }) {
  const body = (
    <>
      <div className="title-badge">
        <span className="t-semibold">{serviceTitle(r.kind)}</span>
        <StatusBadge status={r.status} />
      </div>
      <p className="t-caption t-muted mt-8" style={{ letterSpacing: '.02em' }}>
        {fmtShort(recordDate(r)).toUpperCase()} · {r.clientName}
      </p>
    </>
  );
  return r.isDemoRecord && r.id.startsWith('demo-op') ? (
    <div className="record">{body}</div>
  ) : (
    <Link className="record" to={`/requests/${r.id}`}>
      {body}
    </Link>
  );
}

// ---------------- 26 / Export report ----------------
// Spreadsheet-safe cell: text starting with = + - @ is prefixed with ' so Excel/Sheets never run it as a formula.
const csvCell = (raw: string) => {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

export function ExportReport() {
  const { records } = useRecords();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const service = params.get('service') ?? 'all';
  const range = (params.get('range') as RangeId) ?? '30';
  const list = useMemo(() => filterRecords(records, service, range), [records, service, range]);
  const [done, setDone] = useState('');

  const csv = () => {
    const rows = [['Date', 'Service', 'Client', 'Status', 'Summary'], ...list.map((r) => [recordDate(r).toISOString().slice(0, 10), serviceTitle(r.kind), r.clientName, STATUS_META[r.status].label, r.summary])];
    // BOM so Excel opens UTF-8 (₱, ·, ñ) correctly; CRLF per RFC 4180.
    const blob = new Blob(['\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `advancare-service-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDone(`Downloaded ${list.length} records as CSV.`);
  };

  return (
    <Screen nav="reports">
      <PageHeader title="Export service records" />
      <div className="screen-body stack gap-20">
        <h2 className="t-h2">Choose a format for your records.</h2>
        <p className="t-small t-muted" style={{ marginTop: -8 }}>
          {list.length} records · {service === 'all' ? 'All services' : serviceTitle(service as ServiceKind)} · {rangeLabel(range)}
        </p>
        <Button onClick={() => navigate(`/reports/records/print?${params.toString()}`)}>Export as PDF</Button>
        <Button variant="secondary" onClick={csv}>
          Export as CSV
        </Button>
        {done && (
          <Banner icon="check-circle">
            <span role="status">{done}</span>
          </Banner>
        )}
        <p className="t-caption t-muted">PDF opens your device’s print dialog — choose “Save as PDF”. Exports use the selected service and date filters.</p>
      </div>
    </Screen>
  );
}

export function PrintRecords() {
  const { records } = useRecords();
  const [params] = useSearchParams();
  const service = params.get('service') ?? 'all';
  const range = (params.get('range') as RangeId) ?? '30';
  const list = filterRecords(records, service, range);
  const printed = useRef(false);
  useEffect(() => {
    if (printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ padding: 24, background: '#fff', minHeight: '100dvh' }}>
      <h1 className="t-section">AdvanCare service records</h1>
      <p className="t-caption t-muted">
        {service === 'all' ? 'All services' : serviceTitle(service as ServiceKind)} · {rangeLabel(range)} · generated {new Date().toLocaleString('en-PH')}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 16 }}>
        <thead>
          <tr>
            {['Date', 'Service', 'Client', 'Status'].map((h) => (
              <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', padding: 6 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td style={{ padding: 6, borderBottom: '1px solid var(--line)' }}>{recordDate(r).toLocaleDateString('en-PH')}</td>
              <td style={{ padding: 6, borderBottom: '1px solid var(--line)' }}>{serviceTitle(r.kind)}</td>
              <td style={{ padding: 6, borderBottom: '1px solid var(--line)' }}>{r.clientName}</td>
              <td style={{ padding: 6, borderBottom: '1px solid var(--line)' }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="t-caption mt-16">
        <button className="link-btn" onClick={() => history.back()}>
          ← Back
        </button>
      </p>
    </div>
  );
}

// ---------------- 14 / Service trends ----------------
type Period = 'weekly' | 'monthly' | 'quarterly';
const SERIES: { id: string; label: string; color: string; kinds: ServiceKind[] }[] = [
  { id: 'consult', label: 'Consultation', color: 'var(--teal)', kinds: ['telehealth', 'rhu', 'triage'] },
  { id: 'transport', label: 'Transport', color: 'var(--olive)', kinds: ['transport'] },
  { id: 'care', label: 'Caregiver', color: 'var(--blue)', kinds: ['home-caregiver', 'cvmc-caregiver'] },
];

function buckets(period: Period, offset = 0): { label: string; start: Date; end: Date }[] {
  const today = startOfDay(new Date());
  const count = period === 'weekly' ? 7 : period === 'monthly' ? 4 : 3;
  const size = period === 'weekly' ? 1 : period === 'monthly' ? 7 : 30;
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const end = new Date(today.getTime() - (i + offset * count) * size * dayMs + dayMs - 1);
    const start = new Date(end.getTime() - size * dayMs + 1);
    out.push({ start, end, label: period === 'weekly' ? String(start.getDate()) : period === 'monthly' ? fmtShort(start) : start.toLocaleDateString('en-PH', { month: 'short' }) });
  }
  return out;
}

export function ServiceTrends() {
  const { records } = useRecords();
  const [period, setPeriod] = useState<Period>('weekly');
  const active = records.filter((r) => r.status !== 'cancelled');
  const cur = buckets(period);
  const prev = buckets(period, 1);
  const inRange = (r: ServiceRequest, s: Date, e: Date) => {
    const t = recordDate(r).getTime();
    return t >= s.getTime() && t <= e.getTime();
  };
  const curRecords = active.filter((r) => inRange(r, cur[0].start, cur[cur.length - 1].end));
  const prevCount = active.filter((r) => inRange(r, prev[0].start, prev[prev.length - 1].end)).length;
  const total = curRecords.length;
  const change = prevCount ? Math.round(((total - prevCount) / prevCount) * 100) : null;
  const bySeries = SERIES.map((s) => ({ ...s, n: curRecords.filter((r) => s.kinds.includes(r.kind)).length }));
  const top = [...bySeries].sort((a, b) => b.n - a.n)[0];
  const data = cur.map((b) => ({ ...b, values: SERIES.map((s) => active.filter((r) => s.kinds.includes(r.kind) && inRange(r, b.start, b.end)).length) }));
  const max = Math.max(4, ...data.flatMap((d) => d.values));
  const step = Math.ceil(max / 3 / 5) * 5 || 1;
  const ticks = [0, step, step * 2, step * 3];
  const top3 = ticks[3];
  const periodName = period === 'weekly' ? 'week' : period === 'monthly' ? '4 weeks' : 'quarter';

  return (
    <Screen nav>
      <PageHeader title="Service trends" back="/reports" />
      <div className="screen-body stack gap-20">
        <Segmented
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'quarterly', label: 'Quarterly' },
          ]}
        />
        <div>
          <h2 className="t-h2">Service usage</h2>
          <p className="t-small t-muted">
            {fmtShort(cur[0].start)} – {fmtShort(cur[cur.length - 1].end)} 
          </p>
        </div>
        <div className="grid-2">
          <div className="kpi">
            <div className="t-caption t-muted">Total services</div>
            <div className="value">{total}</div>
            <div className="t-caption t-teal">{change === null ? 'No previous data' : `${change >= 0 ? '+' : ''}${change}% vs previous ${periodName}`}</div>
          </div>
          <div className="kpi">
            <div className="t-caption t-muted">Most used</div>
            <div className="value" style={{ fontSize: top.n ? 24 : 26 }}>{top.n ? top.label.replace('Consultation', 'Consults') : '—'}</div>
            <div className="t-caption t-teal">{total ? `${Math.round((top.n / total) * 100)}% of all services` : 'No services yet'}</div>
          </div>
        </div>
        <figure className="card" style={{ margin: 0 }} aria-labelledby="chart-cap">
          <div className="bars" aria-hidden="true">
            {ticks.map((t) => (
              <div key={t} className="gridline" style={{ bottom: `${(t / top3) * 100}%` }}>
                <span>{t}</span>
              </div>
            ))}
            {data.map((d) => (
              <div key={d.label + d.start.toISOString()} className="group">
                {d.values.map((v, i) => (
                  <span key={i} className="bar" style={{ height: `${(v / top3) * 100}%`, background: SERIES[i].color, minHeight: v ? 2 : 0 }} />
                ))}
              </div>
            ))}
          </div>
          <div className="bars-x" aria-hidden="true">
            {data.map((d) => (
              <span key={d.start.toISOString()}>{d.label}</span>
            ))}
          </div>
          <div className="legend mt-16" aria-hidden="true">
            {SERIES.map((s) => (
              <span key={s.id}>
                <i style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
          <figcaption id="chart-cap" className="sr-only">
            Services per {period === 'weekly' ? 'day' : period === 'monthly' ? 'week' : 'month'}:{' '}
            {data.map((d) => `${d.label}: ${SERIES.map((s, i) => `${s.label} ${d.values[i]}`).join(', ')}`).join('; ')}
          </figcaption>
        </figure>
        <details className="card">
          <summary className="t-medium" style={{ cursor: 'pointer', minHeight: 28 }}>
            Show as table
          </summary>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 4 }}>Period</th>
                {SERIES.map((s) => (
                  <th key={s.id} style={{ textAlign: 'right', padding: 4 }}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.start.toISOString()}>
                  <td style={{ padding: 4 }}>{fmtShort(d.start)}</td>
                  {d.values.map((v, i) => (
                    <td key={i} style={{ textAlign: 'right', padding: 4 }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
        <p className="t-body">{total ? `${top.label === 'Consultation' ? 'Consultations' : top.label === 'Caregiver' ? 'Caregiver visits' : 'Transport'} ${top.label === 'Transport' ? 'was' : 'were'} the most used service this ${periodName}.` : 'No services recorded in this period yet.'}</p>
        <Link to="/reports/records" className="btn btn-secondary">
          View all service records
        </Link>
      </div>
    </Screen>
  );
}

// ---------------- 15 / Dashboard (coordinator / LGU) ----------------
const DONUT: { kinds: ServiceKind[]; label: string; color: string }[] = [
  { kinds: ['telehealth', 'rhu', 'triage'], label: 'Consultation', color: '#086B5B' },
  { kinds: ['prescription', 'supplies'], label: 'Pharmacy', color: '#376E85' },
  { kinds: ['transport'], label: 'Transport', color: '#697D34' },
  { kinds: ['home-caregiver'], label: 'Home care', color: '#996116' },
  { kinds: ['cvmc-caregiver'], label: 'CVMC care', color: '#536D65' },
];

export function Dashboard() {
  const { records, role } = useRecords();
  const [range, setRange] = useState<RangeId>('7');
  if (role !== 'coordinator')
    return (
      <Screen nav>
        <PageHeader title="Dashboard" back="/reports" />
        <div className="screen-body stack gap-16">
          <h2 className="t-h2">For coordinators and LGU partners.</h2>
          <p className="t-body t-muted">The dashboard summarizes all clients and revenue, so it’s only available to authorized operations accounts. Your own records are in Service records.</p>
          <Link to="/reports/records" className="btn btn-primary">
            View your service records
          </Link>
          <DependencyNote title="Staff console">Coordinators and LGU partners see live operations in the AdvanCare staff console.</DependencyNote>
        </div>
      </Screen>
    );

  const [s, e] = rangeBounds(range);
  const len = e.getTime() - s.getTime();
  const within = (r: ServiceRequest, a: number, b: number) => {
    const t = recordDate(r).getTime();
    return t >= a && t <= b && r.status !== 'cancelled';
  };
  const cur = records.filter((r) => within(r, s.getTime(), e.getTime()));
  const prev = range === 'all' ? [] : records.filter((r) => within(r, s.getTime() - len - 1, s.getTime() - 1));
  const clients = new Set(cur.map((r) => r.clientName)).size;
  const prevClients = new Set(prev.map((r) => r.clientName)).size;
  const revenue = (list: ServiceRequest[]) =>
    list.reduce((sum, r) => sum + (r.status === 'completed' ? (r.kind === 'home-caregiver' ? SHIFT_RATES.BGAY_HOME_300.gross : r.kind === 'cvmc-caregiver' ? SHIFT_RATES.CVMC_INSTITUTIONAL_500.gross : 0) : 0), 0);
  const pct = (a: number, b: number) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}% vs previous` : 'No previous data');
  const parts = DONUT.map((d) => ({ ...d, n: cur.filter((r) => d.kinds.includes(r.kind)).length }));
  const total = cur.length || 1;
  let acc = 0;
  const C = 2 * Math.PI * 42;

  return (
    <Screen nav>
      <PageHeader title="Dashboard" back="/reports" />
      <div className="screen-body stack gap-20">
        <SelectField label="Reporting period" options={RANGES} value={range} onChange={(ev) => setRange(ev.target.value as RangeId)} hint={rangeLabel(range)} />
        <div className="grid-2">
          <Kpi label="Total clients" value={String(clients)} delta={pct(clients, prevClients)} />
          <Kpi label="Total services" value={String(cur.length)} delta={pct(cur.length, prev.length)} />
          <Kpi label="Active plans" value="—" delta="Needs membership API" />
          <Kpi label="Caregiver revenue" value={peso(revenue(cur))} delta={pct(revenue(cur), revenue(prev))} />
        </div>
        <section className="stack gap-12">
          <h3 className="t-section">Service breakdown</h3>
          <div className="card row gap-16" style={{ flexWrap: 'wrap' }}>
            <svg viewBox="0 0 100 100" width="120" height="120" role="img" aria-label={`${cur.length} services`}>
              {parts.map((p) => {
                const len2 = (p.n / total) * C;
                const el = <circle key={p.label} cx="50" cy="50" r="42" fill="none" stroke={p.color} strokeWidth="12" strokeDasharray={`${len2} ${C - len2}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />;
                acc += len2;
                return el;
              })}
              <text x="50" y="50" textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--ink)">
                {cur.length}
              </text>
              <text x="50" y="64" textAnchor="middle" fontSize="8" fill="var(--muted)">
                services
              </text>
            </svg>
            <ul className="stack gap-4 grow" style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 13, minWidth: 140 }}>
              {parts.map((p) => (
                <li key={p.label} className="row gap-8" style={{ flexWrap: 'wrap' }}>
                  <i style={{ width: 8, height: 8, borderRadius: 4, background: p.color, display: 'inline-block' }} />
                  {p.label} <span className="t-muted">{Math.round((p.n / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="t-caption t-muted">
            All clients · All recorded services
          </p>
          <p className="t-caption t-muted">Revenue counts completed caregiver shifts at ₱300 and ₱500. Membership and other service fees need their APIs.</p>
        </section>
      </div>
    </Screen>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="kpi">
      <div className="t-caption t-muted">{label}</div>
      <div className="value">{value}</div>
      <div className="t-caption t-teal">{delta}</div>
    </div>
  );
}
