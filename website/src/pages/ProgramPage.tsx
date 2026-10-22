import React from 'react';
import { Icon } from '../components/Icon';
import { GanttChart } from '../components/GanttChart';
import { BUDGET, BUSINESS_MODEL, MARKET, PHASES, REVENUE_STREAMS, peso } from '../data/roadmapData';

export const ProgramPage: React.FC = () => (
  <div className="program-page">
    <section className="page-hero">
      <div className="container">
        <span className="kicker">
          <Icon name="calendar" size={14} />
          Program & roadmap
        </span>
        <h1>Implementation plan: adoption and sustainability</h1>
        <p>A two-year program that starts with a pilot in Peñablanca and scales province-wide, with research running alongside.</p>
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Phases</span>
          <h2>Pilot, expand, scale, sustain</h2>
        </div>
        <div className="grid-4">
          {PHASES.map((p) => (
            <div key={p.name} className="card-base" style={{ padding: 24 }}>
              <h3>{p.name}</h3>
              <ul className="list-check" style={{ marginTop: 8 }}>
                {p.items.map((i) => (
                  <li key={i} style={{ fontSize: 13 }}>
                    <Icon name="check-circle" size={14} color="var(--advancare-teal)" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="section-py section-paper">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Schedule</span>
          <h2>Two-year implementation schedule</h2>
          <p>Bars show months when any activity in each category is scheduled.</p>
        </div>
        <GanttChart />
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Market opportunity</span>
          <h2>Cagayan Province: TAM · SAM · SOM</h2>
          <p>{MARKET.population} at {MARKET.price}. {MARKET.nationwide}</p>
        </div>
        <div className="grid-3">
          {MARKET.tiers.map((t) => (
            <div key={t.name} className="card-base">
              <span className="kicker">{t.name}</span>
              <p style={{ marginTop: 8 }}>{t.full}</p>
              <div className="stat-value" style={{ color: 'var(--advancare-deep)', marginTop: 8 }}>{t.people}</div>
              <p>people · {t.share}</p>
              <div style={{ fontWeight: 700, color: 'var(--advancare-teal)', marginTop: 8 }}>{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="section-py section-paper">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Business model canvas</span>
          <h2>How the model fits together</h2>
        </div>
        <div className="grid-4" style={{ marginBottom: 20 }}>
          {BUSINESS_MODEL.map((b) => (
            <div key={b.title} className="card-base" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16 }}>{b.title}</h3>
              <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--advancare-muted)', lineHeight: 1.6 }}>
                {b.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="card-base" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16 }}>Revenue streams</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--advancare-muted)', lineHeight: 1.6 }}>
            {REVENUE_STREAMS.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container" style={{ maxWidth: 880 }}>
        <div className="section-head">
          <span className="kicker">Budget</span>
          <h2>Two-year budget: {peso(BUDGET.grandTotal)}</h2>
          <p>Personal services and maintenance and other operating expenses (MOOE), in Philippine pesos.</p>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="num">Year 1</th>
                <th className="num">Year 2</th>
              </tr>
            </thead>
            <tbody>
              {BUDGET.lines.map((l) => (
                <tr key={l.item}>
                  <td>{l.item}</td>
                  <td className="num">{l.year1 ? peso(l.year1) : '—'}</td>
                  <td className="num">{l.year2 ? peso(l.year2) : '—'}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Subtotal, personal services</th>
                <td className="num">{peso(BUDGET.personalServices.year1)}</td>
                <td className="num">{peso(BUDGET.personalServices.year2)}</td>
              </tr>
              <tr>
                <th scope="row">Subtotal, MOOE</th>
                <td className="num">{peso(BUDGET.mooe.year1)}</td>
                <td className="num">{peso(BUDGET.mooe.year2)}</td>
              </tr>
              <tr className="highlight">
                <th scope="row">Yearly total</th>
                <td className="num"><strong>{peso(BUDGET.yearly.year1)}</strong></td>
                <td className="num"><strong>{peso(BUDGET.yearly.year2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
);
