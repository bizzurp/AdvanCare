import React from 'react';
import { Icon } from '../Icon';
import { CARE_LOOP, LOOP_VALUES, PROCESS_STEPS, SOLUTION_STEPS } from '../../data/storyData';

export const SolutionSection: React.FC = () => (
  <>
    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <span className="kicker">03 · The proposed solution</span>
          <h2>Connect. Coordinate. Continue care.</h2>
          <p>
            An integrated, community-based ecosystem for accessible, coordinated and sustainable care, linking people,
            services and communities across provinces across the country.
          </p>
        </div>
        <div className="panel-cols">
          {SOLUTION_STEPS.map((s, i) => (
            <div key={s.title}>
              <span className="step-num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="care-loop" className="section-py section-paper">
      <div className="container">
        <div className="loop-split">
          <div className="section-head">
            <h2>One closed care loop.</h2>
            <p>Community-driven. Technology-enabled. People-centered.</p>
          </div>
          <ol className="loop-list">
            {CARE_LOOP.map((s, i) => (
              <li key={s.title}>
                <span className="step-num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                <Icon name={s.icon} size={26} color="var(--advancare-teal)" />
              </li>
            ))}
          </ol>
        </div>
        <div className="value-band">
          {LOOP_VALUES.map((v) => (
            <div key={v.title}>
              <div style={{ fontWeight: 700 }}>{v.title}</div>
              <div style={{ fontSize: 13, color: 'var(--advancare-mint)' }}>{v.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <h2>From family requests to coordinated care.</h2>
          <p>
            Patients and families use the mobile app. Coordinators run the operations dashboard. Caregivers, RHU teams,
            telehealth doctors, MediBox health workers and transport drivers deliver care.
          </p>
        </div>
        <ol className="step-flow" style={{ '--steps': PROCESS_STEPS.length } as React.CSSProperties}>
          {PROCESS_STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  </>
);
