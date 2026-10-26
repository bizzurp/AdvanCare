import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { COMPETITORS, DIFFERENTIATORS, TAGLINE, TEAM } from '../data/storyData';

export const AboutPage: React.FC = () => (
  <div className="about-page">
    <section className="page-hero">
      <div className="container">
        <span className="kicker">
          <Icon name="user-heart" size={14} />
          About AdvanCare
        </span>
        <h1>AI-enabled healthcare management for grassroots communities</h1>
        <p>
          AdvanCare is a program of Cagayan State University, in Community &amp; Family Development. {TAGLINE}
        </p>
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Project team</span>
          <h2>The people behind AdvanCare</h2>
        </div>
        <div className="grid-3">
          {TEAM.map((m) => (
            <div key={m.name} className="card-base" style={{ padding: 24 }}>
              {m.photo && (
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginBottom: 14,
                    border: '1px solid var(--advancare-line)',
                  }}
                >
                  <img
                    src={m.photo}
                    alt={m.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      transform: m.photoScale ? `scale(${m.photoScale})` : undefined,
                      transformOrigin: 'center',
                    }}
                  />
                </div>
              )}
              <h3>{m.name}</h3>
              <p>{m.role}</p>
              {m.project && (
                <span style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 700, background: 'var(--advancare-mint)', color: 'var(--advancare-deep)', padding: '3px 10px', borderRadius: 9999 }}>
                  {m.project}
                </span>
              )}
              {m.linkedin && (
                <a
                  href={m.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.name} on LinkedIn`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 600, color: 'var(--advancare-teal)', width: 'fit-content' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
                  </svg>
                  LinkedIn
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="section-py section-paper">
      <div className="container">
        <div className="section-head">
          <span className="kicker">What makes us different</span>
          <h2>Others match, track or staff care. AdvanCare closes the loop.</h2>
        </div>
        <div className="grid-3" style={{ marginBottom: 20 }}>
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="card-base">
              <h3>{d.title}</h3>
              <p style={{ fontStyle: 'italic', color: 'var(--advancare-deep)', marginBottom: 8 }}>{d.question}</p>
              <p>{d.body}</p>
            </div>
          ))}
        </div>
        <p className="source-note">SLA (Service Level Agreement): the response time AdvanCare commits to for each membership tier.</p>
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Competitive analysis</span>
          <h2>How AdvanCare stands out</h2>
          <p>
            We build on what exists, and go further for farmers, fishers, PWDs, and low and middle income families across provinces across the country.
          </p>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature / criteria</th>
                {COMPETITORS.rows.map((r) => (
                  <th key={r.name}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.criteria.map((c, i) => (
                <tr key={c}>
                  <th scope="row" style={{ fontWeight: 600, color: 'var(--advancare-ink)' }}>{c}</th>
                  {COMPETITORS.rows.map((r) => (
                    <td key={r.name} className={r.name === 'AdvanCare' ? 'highlight' : undefined}>
                      {r.values[i]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section style={{ padding: '48px 0', background: 'var(--advancare-paper)', textAlign: 'center' }}>
      <div className="container">
        <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>See how the program rolls out</h3>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
          <Link to="/program" className="btn btn-primary btn-pill">Program & roadmap</Link>
          <Link to="/plans" className="btn btn-secondary btn-pill">Subscription plans</Link>
        </div>
      </div>
    </section>
  </div>
);
