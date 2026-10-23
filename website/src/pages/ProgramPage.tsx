import React from 'react';
import { Icon } from '../components/Icon';
import { BUSINESS_MODEL, MARKET, PHASES, REVENUE_STREAMS } from '../data/roadmapData';

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

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Market opportunity</span>
          <h2>Provinces across the country</h2>
          <p>{MARKET.population} at {MARKET.price}. {MARKET.nationwide}</p>
        </div>
        <div className="grid-3">
          {MARKET.tiers.map((t) => (
            <div key={t.name} className="card-base">
              <span className="kicker">{t.name}</span>
              <p style={{ marginTop: 8 }}>{t.full}</p>
              <div className="stat-value" style={{ color: 'var(--advancare-deep)', marginTop: 8 }}>{t.value}</div>
              <p>{t.people} people · {t.share}</p>
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

  </div>
);
