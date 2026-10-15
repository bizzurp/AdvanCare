import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Account, type AuditEntry } from '../api';
import { useMe } from '../auth';
import { Button, ErrorNotice, Loading, Notice, PageHeader, useLoad } from '../components/ui';
import { ACTION_LABEL, actionLabel, dateTime, isFailureAction, metadataSummary, personName } from '../format';

const FILTER_KEYS = ['actor', 'action', 'entityType', 'entityId', 'from', 'to'] as const;

export function Audit() {
  const me = useMe();
  const isSuper = me.role === 'SUPER_ADMIN';
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]));
  const key = FILTER_KEYS.map((k) => params.get(k) ?? '').join('|');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const page = useLoad(() => api.audit(filters), [key]);
  const people = useLoad(() => (isSuper ? api.accounts().then((r) => r.accounts) : Promise.resolve([] as Account[])), [isSuper]);

  useEffect(() => {
    if (page.data) {
      setEntries(page.data.entries);
      setCursor(page.data.nextCursor);
    }
  }, [page.data]);

  const setFilter = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const more = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await api.audit({ ...filters, before: cursor });
      setEntries((e) => [...e, ...res.entries]);
      setCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const entityFilter = params.get('entityId');
  const entityName = entityFilter ? people.data?.find((p) => p.id === entityFilter) : null;

  return (
    <>
      <PageHeader title="Audit log" subtitle={isSuper ? 'Every sign-in and staff action, newest first. Entries can’t be edited or deleted.' : 'Your own sign-ins and actions, newest first.'} />
      <div className="filters">
        {isSuper ? (
          <select className="input" value={params.get('actor') ?? ''} onChange={(e) => setFilter('actor', e.target.value)} aria-label="Person">
            <option value="">Everyone</option>
            {(people.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {personName(p)}
              </option>
            ))}
          </select>
        ) : null}
        <select className="input" value={params.get('action') ?? ''} onChange={(e) => setFilter('action', e.target.value)} aria-label="Action">
          <option value="">All actions</option>
          {Object.entries(ACTION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="date-filter">
          From
          <input className="input" type="date" value={params.get('from') ?? ''} onChange={(e) => setFilter('from', e.target.value)} />
        </label>
        <label className="date-filter">
          To
          <input className="input" type="date" value={params.get('to') ?? ''} onChange={(e) => setFilter('to', e.target.value)} />
        </label>
        {key.replace(/\|/g, '') ? (
          <Button variant="quiet" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {entityFilter ? (
        <Notice tone="info">
          Showing changes to {entityName ? <Link to={`/admins/${entityFilter}`}>{personName(entityName)}</Link> : 'one record'}.{' '}
          <button type="button" className="link-btn" onClick={() => { setFilter('entityId', ''); setFilter('entityType', ''); }}>
            Show all
          </button>
        </Notice>
      ) : null}
      {page.loading && !entries.length ? (
        <Loading />
      ) : page.error ? (
        <ErrorNotice error={page.error} />
      ) : (
        <div className="table-wrap">
          <table className="table table-compact">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What</th>
                <th>Record</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className={isFailureAction(e.action) ? 'row-warn' : undefined}>
                  <td className="nowrap">{dateTime(e.createdAt)}</td>
                  <td>{e.actor ? isSuper ? <Link to={`/admins/${e.actor.id}`}>{personName(e.actor)}</Link> : personName(e.actor) : <span className="muted">Unknown / system</span>}</td>
                  <td>{actionLabel(e.action)}</td>
                  <td>
                    <RecordLink entry={e} people={people.data ?? []} canOpen={isSuper} />
                  </td>
                  <td className="muted small">
                    {metadataSummary(e)}
                    {e.ip ? <span className="ip"> · IP {e.ip}</span> : null}
                  </td>
                </tr>
              ))}
              {!entries.length ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No entries match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      {cursor ? (
        <div className="center">
          <Button variant="secondary" busy={loadingMore} onClick={() => void more()}>
            Load older entries
          </Button>
        </div>
      ) : null}
    </>
  );
}

function RecordLink({ entry, people, canOpen }: { entry: AuditEntry; people: Account[]; canOpen: boolean }) {
  if (!entry.entityType || !entry.entityId) return <span className="muted">—</span>;
  if (entry.entityType === 'staff') {
    const person = people.find((p) => p.id === entry.entityId);
    const label = person ? personName(person) : 'Staff account';
    return canOpen ? <Link to={`/admins/${entry.entityId}`}>{label}</Link> : <span>{label}</span>;
  }
  if (entry.entityType === 'staff_session') return <span className="muted">Session</span>;
  return <span className="muted">{entry.entityType}</span>;
}
