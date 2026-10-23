import React from 'react';
import { Icon } from '../Icon';
import { BARRIERS, BASELINE_STATS, JOURNEY } from '../../data/storyData';

export const ProblemSection: React.FC = () => (
  <>
    <section className="section-py section-white">
      <div className="container split-2">
        <div>
          <span className="kicker">01 · Our lived patient experience</span>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, margin: '10px 0 12px' }}>
            We did not imagine these barriers. We witnessed them firsthand.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
            An aging farmer’s route to care at a Rural Health Unit can mean more than one difficult trip. Distance, travel
            costs, waiting, and another stop for medicines can turn a routine visit into a demanding journey.
          </p>
          <div className="journey" style={{ marginBottom: 20 }}>
            {JOURNEY.map((stop, i) => (
              <React.Fragment key={stop}>
                {i > 0 && <Icon name="arrow-right" size={16} color="var(--advancare-control)" />}
                <span className="stop">{stop}</span>
              </React.Fragment>
            ))}
          </div>
          <blockquote style={{ background: 'var(--advancare-mint)', borderRadius: 12, padding: '16px 20px', color: 'var(--advancare-deep)', fontWeight: 600 }}>
            “A care journey is only workable when access, affordability, and follow-up work together.”
          </blockquote>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {BARRIERS.map((b, i) => (
            <div key={b.title} className="card-base" style={{ display: 'flex', gap: 14, padding: 24 }}>
              <span className="step-num">{i + 1}</span>
              <div>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            </div>
          ))}
          <p className="source-note">Typical rural healthcare barriers in provinces across the country. Illustrative persona based on AdvanCare’s project context.</p>
        </div>
      </div>
    </section>

    <section className="section-py section-paper">
      <div className="container">
        <div className="section-head">
          <span className="kicker">02 · The problem</span>
          <h2>Care exists. Reliable, affordable support doesn’t reach everyone.</h2>
          <p>
            Aging farmers and fishers, people with special needs, and their families face distance, high costs, and scattered
            services.
          </p>
        </div>
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {BASELINE_STATS.map((s) => (
            <div key={s.value} className="card-base">
              <div className="stat-value" style={{ color: 'var(--advancare-deep)' }}>{s.value}</div>
              <p style={{ marginTop: 8 }}>{s.label}</p>
              <div className="source-note">Source: {s.source}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </>
);
