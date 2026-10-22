import React from 'react';
import { DECISION_GATES, GANTT, GANTT_NOTES } from '../data/roadmapData';

const MONTHS = Array.from({ length: 24 }, (_, i) => i + 1);
const cell = (bg: string): React.CSSProperties => ({ height: 18, background: bg, borderRadius: 2 });

export const GanttChart: React.FC = () => (
  <div>
    <div className="data-table-wrap">
      <table className="data-table" style={{ minWidth: 900, fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ width: 260 }} rowSpan={2}>Category</th>
            <th colSpan={12} style={{ textAlign: 'center' }}>Year 1</th>
            <th colSpan={12} style={{ textAlign: 'center', borderLeft: '2px solid var(--advancare-ink)' }}>Year 2</th>
          </tr>
          <tr>
            {MONTHS.map((m) => (
              <th key={m} style={{ padding: '6px 2px', textAlign: 'center', borderLeft: m === 13 ? '2px solid var(--advancare-ink)' : undefined }}>
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GANTT.map((row, idx) => (
            <React.Fragment key={row.label}>
              {row.research && !GANTT[idx - 1]?.research && (
                <tr>
                  <th colSpan={25} style={{ color: 'var(--advancare-red)', background: 'var(--advancare-redBg)' }}>Research</th>
                </tr>
              )}
              <tr>
                <th scope="row" style={{ fontWeight: 500, color: row.research ? 'var(--advancare-red)' : 'var(--advancare-ink)' }}>
                  {row.label}
                </th>
                {MONTHS.map((m) => {
                  const on = row.months.includes(m);
                  const bg = !on
                    ? 'transparent'
                    : row.accentMonths?.includes(m)
                      ? 'var(--advancare-gold)'
                      : row.research
                        ? 'var(--advancare-red)'
                        : 'var(--advancare-teal)';
                  return (
                    <td key={m} style={{ padding: '8px 1px', borderLeft: m === 13 ? '2px solid var(--advancare-ink)' : undefined }}>
                      <div style={cell(bg)} title={on ? `${row.label}: month ${m}` : undefined} />
                    </td>
                  );
                })}
              </tr>
            </React.Fragment>
          ))}
          <tr>
            <th scope="row">Decision gates</th>
            {MONTHS.map((m) => {
              const gate = DECISION_GATES.find((g) => g.month === m);
              return (
                <td key={m} style={{ textAlign: 'center', padding: '8px 1px', color: 'var(--advancare-ink)', borderLeft: m === 13 ? '2px solid var(--advancare-ink)' : undefined }} title={gate?.label}>
                  {gate ? '◆' : ''}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
    <p className="source-note" style={{ marginTop: 12 }}>
      Gates: {DECISION_GATES.map((g) => `M${g.month} ${g.label.toLowerCase()}`).join('; ')}. {GANTT_NOTES.join(' ')}
    </p>
  </div>
);
