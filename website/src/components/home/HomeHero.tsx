import React from 'react';
import { Link } from 'react-router-dom';
import { DonationCard } from '../DonationCard';
import { BASELINE_STATS, TAGLINE } from '../../data/storyData';
import emblemLogo from '../../assets/logo-emblem.png';

export const HomeHero: React.FC = () => (
  <section style={{ padding: '64px 0 80px', background: 'var(--advancare-paper)', borderBottom: '1px solid var(--advancare-line)' }}>
    <div className="container split-2">
      <div>
        <span className="kicker">
          <span className="kicker-dot" />
          AI-enabled healthcare management · provinces across the country
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '20px 0' }}>
          <img src={emblemLogo} alt="" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
              <span style={{ color: 'var(--brand-blue)' }}>Advan</span>
              <span style={{ color: 'var(--brand-green)' }}>Care</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--advancare-muted)', fontWeight: 600 }}>
              For families. With communities.
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: 'clamp(34px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: 20 }}>
          Care closer to every community.
        </h1>

        <p style={{ fontSize: 'clamp(16px, 1.8vw, 18px)', lineHeight: 1.6, marginBottom: 12 }}>
          Connecting families to accessible, affordable, coordinated care in provinces across the country. AdvanCare is an AI-enabled healthcare
          management platform for grassroots communities, proposed by Cagayan State University with the Province of Cagayan.
        </p>
        <p style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--advancare-deep)', marginBottom: 28 }}>{TAGLINE}</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 36 }}>
          <Link to="/plans" className="btn btn-primary btn-pill" style={{ padding: '14px 28px' }}>
            See the plans
          </Link>
          <Link to="/program" className="btn btn-secondary btn-pill" style={{ padding: '14px 24px' }}>
            Program & roadmap
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, paddingTop: 24, borderTop: '1px solid var(--advancare-line)' }}>
          {BASELINE_STATS.map((s) => (
            <div key={s.value}>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--advancare-teal)' }} className="tabular">
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--advancare-muted)', lineHeight: 1.3 }}>{s.label}</div>
              <div className="source-note">{s.source}</div>
            </div>
          ))}
        </div>
      </div>

      <div id="hero-donation-card">
        <DonationCard isHero />
      </div>
    </div>
  </section>
);
