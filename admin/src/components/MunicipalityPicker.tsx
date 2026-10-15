import { useMemo, useState } from 'react';
import { api } from '../api';
import { useLoad } from './ui';

let cached: string[] | null = null;

export function MunicipalityPicker({ value, onChange, error }: { value: string[]; onChange: (next: string[]) => void; error?: string }) {
  const list = useLoad(async () => (cached ??= (await api.municipalities()).municipalities), []);
  const [filter, setFilter] = useState('');
  const shown = useMemo(() => (list.data ?? []).filter((m) => m.toLowerCase().includes(filter.trim().toLowerCase())), [list.data, filter]);
  const toggle = (m: string) => onChange(value.includes(m) ? value.filter((v) => v !== m) : [...value, m].sort());
  return (
    <fieldset className={`field picker ${error ? 'has-error' : ''}`}>
      <legend>
        Municipalities <span className="muted small">({value.length} selected)</span>
      </legend>
      <input className="input" type="search" placeholder="Filter Cagayan municipalities" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter municipalities" />
      <div className="picker-grid">
        {shown.map((m) => (
          <label key={m} className="check">
            <input type="checkbox" checked={value.includes(m)} onChange={() => toggle(m)} />
            {m}
          </label>
        ))}
        {list.loading ? <span className="muted">Loading…</span> : null}
      </div>
      {error ? <p className="field-error">{error}</p> : <p className="field-hint">The Admin will only see clients, requests and staff activity in these places.</p>}
    </fieldset>
  );
}
