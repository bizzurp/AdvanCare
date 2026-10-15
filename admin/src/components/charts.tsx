import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Small, dependency-free charts for the console (dataviz method: one hue for a single series,
 * thin capped bars with rounded data-ends, hairline grid, hover/focus tooltip, table view).
 */

function niceMax(max: number): number {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => max / s <= 4) ?? 10 * pow;
  return Math.ceil(max / step) * step;
}

/** Path for a bar with 4px rounded top corners and a square base. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export interface ColumnPoint {
  key: string;
  label: string;
  /** Short axis label; empty = no tick. */
  tick: string;
  value: number;
  href?: string;
}

export function ColumnChart({ points, valueLabel, height = 220 }: { points: ColumnPoint[]; valueLabel: (n: number) => string; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const width = 760;
  const pad = { top: 12, right: 8, bottom: 26, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const slot = innerW / Math.max(points.length, 1);
  const barW = Math.max(2, Math.min(24, slot * 0.62));
  const y = (v: number) => pad.top + innerH - (v / max) * innerH;
  const activePoint = active !== null ? points[active] : undefined;

  return (
    <div className="chart">
      <div className="chart-tools">
        <button type="button" className="link-btn small" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {asTable ? (
        <div className="table-wrap chart-table">
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Day</th>
                <th className="num">Requests</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td className="num">{valueLabel(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-plot" onMouseLeave={() => setActive(null)}>
          <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Column chart, ${points.length} days`} className="chart-svg">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} className="grid" />
                <text x={pad.left - 8} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">
                  {t.toLocaleString('en-PH')}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const x = pad.left + i * slot + (slot - barW) / 2;
              const top = y(p.value);
              return (
                <g key={p.key}>
                  <path d={barPath(x, top, barW, pad.top + innerH - top)} className={`bar ${active === i ? 'bar-active' : ''}`} />
                  {p.tick ? (
                    <text x={pad.left + i * slot + slot / 2} y={height - 8} className="axis" textAnchor="middle">
                      {p.tick}
                    </text>
                  ) : null}
                  {/* Hit target: the full column slot, bigger than the mark. */}
                  <rect
                    x={pad.left + i * slot}
                    y={pad.top}
                    width={slot}
                    height={innerH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${p.label}: ${valueLabel(p.value)}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                </g>
              );
            })}
          </svg>
          {activePoint && active !== null ? (
            <div className="chart-tip" style={{ left: `${((pad.left + active * slot + slot / 2) / width) * 100}%` }} role="status">
              <strong>{valueLabel(activePoint.value)}</strong>
              <span>{activePoint.label}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  href?: string;
  note?: string;
}

/** Horizontal bars, one hue, value at the tip; each row drills down when it has an href. */
export function BarList({ items, valueLabel, empty = 'Nothing yet.' }: { items: BarItem[]; valueLabel: (n: number) => string; empty?: string }) {
  const max = Math.max(0, ...items.map((i) => i.value));
  if (!items.length || max === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="barlist">
      {items.map((item) => {
        const pct = max ? (item.value / max) * 100 : 0;
        const inner = (
          <>
            <span className="barlist-label">{item.label}</span>
            <span className="barlist-track" aria-hidden="true">
              <span className="barlist-fill" style={{ width: `${Math.max(pct, item.value ? 1.5 : 0)}%` }} />
            </span>
            <span className="barlist-value">{valueLabel(item.value)}</span>
          </>
        );
        return (
          <li key={item.key} title={item.note}>
            {item.href ? (
              <Link to={item.href} className="barlist-row">
                {inner}
              </Link>
            ) : (
              <span className="barlist-row">{inner}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
