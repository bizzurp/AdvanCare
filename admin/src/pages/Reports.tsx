import { useState } from 'react';
import { useMe } from '../auth';
import { ExportButton, ScopeNote } from '../components/ops';
import { Notice, PageHeader } from '../components/ui';
import { todayManila } from '../format';

const REPORTS = [
  { table: 'requests', title: 'Service request ledger', body: 'Every request with client, location, service, schedule, caregiver and status (spec Table 1).' },
  { table: 'payouts', title: 'Shift & payout ledger', body: 'Completed shifts with clock times and the 80/20 split between caregiver and platform (spec Table 2).' },
  { table: 'payments', title: 'Client payments', body: 'Payments received or pending, with method and provider reference.' },
] as const;

export function Reports() {
  const me = useMe();
  const [from, setFrom] = useState(todayManila(-29));
  const [to, setTo] = useState(todayManila());
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={
          <>
            CSV exports for Excel or Google Sheets · <ScopeNote municipalities={me.municipalities} />
          </>
        }
      />
      <div className="filters">
        <label className="date-filter">
          From
          <input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="date-filter">
          To
          <input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <div className="report-grid">
        {REPORTS.map((r) => (
          <section key={r.table} className="card">
            <h2>{r.title}</h2>
            <p className="muted">{r.body}</p>
            <ExportButton table={r.table} filters={{ from, to }} label="Download CSV" />
          </section>
        ))}
      </div>
      <Notice tone="info">Exports include full client names, so treat the files as confidential. Each download is recorded in the audit log with your name and the filters used. LGU subsidy reconciliation (Table 4) comes with plan subscriptions in a later phase.</Notice>
    </>
  );
}
