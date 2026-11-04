import React from 'react';
import { Icon } from '../Icon';
import { BARRIERS, JOURNEY, PATIENT_QUOTE } from '../../data/storyData';

export const ProblemSection: React.FC = () => (
  <>
    <section className="section-py section-white">
      <div className="container split-2">
        <div>
          <span className="kicker">01 · Our lived patient experience</span>
          <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, margin: '10px 0 12px' }}>
            A journey we witnessed.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
            An aging farmer's route to care can mean more than one difficult trip. Distance, travel
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
            {PATIENT_QUOTE}
          </blockquote>
          <p className="source-note" style={{ marginTop: 8 }}>
            Source-slide illustrations show a typical rural persona; they are not photographs of an identified patient.
          </p>
        </div>
        <div className="stack-list">
          {BARRIERS.map((b, i) => (
            <div key={b.title}>
              <span className="step-num">{i + 1}</span>
              <div>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

  </>
);
