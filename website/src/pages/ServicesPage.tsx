import React from 'react';
import { Link } from 'react-router-dom';
import { SERVICE_PILLARS, CAREGIVER_BADGES } from '../data/servicesData';
import { Icon } from '../components/Icon';
import { REVENUE_STREAMS } from '../data/roadmapData';

export const ServicesPage: React.FC = () => {
  return (
    <div className="services-page">
      {/* Hero */}
      <section style={{ padding: '64px 0 48px 0', backgroundColor: 'var(--advancare-paper)', borderBottom: '1px solid var(--advancare-line)' }}>
        <div className="container" style={{ maxWidth: 840 }}>
          <span className="kicker" style={{ marginBottom: 12 }}>
            <Icon name="medical-kit" size={14} />
            Services
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 46px)', fontWeight: 800, marginBottom: 16 }}>
            One closed care loop, built for barangays in provinces across the country
          </h1>
          <p style={{ fontSize: 17, color: 'var(--advancare-muted)', lineHeight: 1.6 }}>
            Local care, reliable transport, MediBox triage, multi-language TeleHealth, caregivers and discounted supplies, coordinated in one record.
          </p>
        </div>
      </section>

      {/* Services Deep Dive */}
      <section className="section-py" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--advancare-line)' }}>
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {SERVICE_PILLARS.map((s, idx) => (
              <div
                key={s.id}
                id={s.id}
                className="card-base"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
                  gap: 36,
                  alignItems: 'start',
                  backgroundColor: idx % 2 === 0 ? '#FFFFFF' : 'var(--advancare-paper)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: 'var(--advancare-mint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--advancare-teal)',
                      }}
                    >
                      <Icon name={s.icon} size={22} />
                    </span>
                    <div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--advancare-ink)' }}>{s.name}</h2>
                      <span style={{ fontSize: 12, color: 'var(--advancare-muted)', fontWeight: 600 }}>{s.scope}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 15, color: 'var(--advancare-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                    {s.description}
                  </p>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--advancare-ink)', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 12 }}>
                    What's included
                  </h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {s.highlights.map((h, hIdx) => (
                      <li key={hIdx} style={{ fontSize: 14, color: 'var(--advancare-ink)', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                        <Icon name="check-circle" size={16} color="var(--advancare-teal)" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Rates Box */}
                <div style={{ background: '#FFFFFF', padding: 24, borderRadius: 14, border: '1px solid var(--advancare-line)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--advancare-muted)', textTransform: 'uppercase' }}>Rate</span>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--advancare-teal)', margin: '4px 0 10px 0' }} className="tabular">
                    {s.rate}
                  </div>
                  {s.payoutBreakdown && (
                    <div style={{ fontSize: 12, color: 'var(--advancare-deep)', background: 'var(--advancare-mint)', padding: '6px 12px', borderRadius: 8, marginBottom: 16 }}>
                      {s.payoutBreakdown}
                    </div>
                  )}

                  <div style={{ fontSize: 13, color: 'var(--advancare-muted)', marginBottom: 20 }}>
                    <strong>Response SLA:</strong> {s.sla}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <a href="https://advancare-app.pages.dev" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-pill" style={{ justifyContent: 'center', fontSize: 13 }}>
                      Request in App ↗
                    </a>
                    <Link to="/donate" className="btn btn-primary btn-pill" style={{ justifyContent: 'center', fontSize: 13 }}>
                      Sponsor care
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Caregiver Badges & Accreditation */}
      <section className="section-py" style={{ backgroundColor: 'var(--advancare-paper)', borderBottom: '1px solid var(--advancare-line)' }}>
        <div className="container">
          <div style={{ maxWidth: 720, marginBottom: 40 }}>
            <span className="kicker" style={{ marginBottom: 10 }}>
              <Icon name="shield-check" size={14} />
              Accreditation Matrix
            </span>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
              Digital Skill Badges & Competency Verification
            </h2>
            <p style={{ fontSize: 15, color: 'var(--advancare-muted)' }}>
              Caregivers are matched to requests based on the training badges verified on their profile.
            </p>
          </div>

          <div className="grid-2">
            {CAREGIVER_BADGES.map((b) => (
              <div key={b.code} className="card-base" style={{ background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--advancare-mint)', color: 'var(--advancare-deep)', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                    {b.code}
                  </span>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--advancare-ink)' }}>{b.name}</h3>
                </div>
                <p style={{ fontSize: 14, color: 'var(--advancare-muted)', lineHeight: 1.5 }}>
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue model (Docs/AdvanCare.pdf, Business Model Canvas) */}
      <section className="section-py section-paper">
        <div className="container" style={{ maxWidth: 840 }}>
          <div className="section-head">
            <span className="kicker">
              <Icon name="chart-square" size={14} />
              How AdvanCare sustains itself
            </span>
            <h2>Revenue streams</h2>
            <p>The proposal aims for self-sustaining revenue loops: private market income with limited government subsidy.</p>
          </div>
          <ul className="list-check card-base">
            {REVENUE_STREAMS.map((r) => (
              <li key={r}>
                <Icon name="check-circle" size={16} color="var(--advancare-teal)" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
