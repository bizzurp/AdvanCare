import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type ExportTable, type PaymentStatus, type ShiftStatus } from '../api';
import { PAYMENT_STATUS, SHIFT_STATUS } from '../format';
import { Badge, Button, ErrorNotice } from './ui';

export function StatusBadge({ status }: { status: ShiftStatus }) {
  const meta = SHIFT_STATUS[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const meta = PAYMENT_STATUS[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

/** Filters live in the URL so any view can be shared or bookmarked. */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ''])) as Record<K, string>;
  const set = useCallback(
    (key: K | 'page', value: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  const page = Number(params.get('page') ?? '1') || 1;
  const active = keys.some((k) => values[k]);
  return { values, set, clear, page, active, key: params.toString() };
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <div className="pagination">
      <span className="muted small">
        {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()}
      </span>
      {pages > 1 ? (
        <span className="row gap8">
          <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </span>
      ) : null}
    </div>
  );
}

export function ExportButton({ table, filters, label = 'Export CSV' }: { table: ExportTable; filters: Record<string, string | undefined>; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <span className="export">
      <Button
        variant="secondary"
        busy={busy}
        title="Downloads what you can see. Every export is recorded in the audit log."
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await api.exportCsv(table, filters);
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        {label}
      </Button>
      {error ? <ErrorNotice error={error} /> : null}
    </span>
  );
}

/** "Showing data for …" line under page titles, so the scope is never ambiguous. */
export function ScopeNote({ municipalities }: { municipalities: string[] | 'ALL' }) {
  return <>{municipalities === 'ALL' ? 'All municipalities' : municipalities.join(', ')}</>;
}
