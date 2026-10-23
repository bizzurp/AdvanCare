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
        <div className="grid-4">
          {SOLUTION_STEPS.map((s, i) => (
            <div key={s.title} className="card-base" style={{ padding: 24 }}>
              <span className="step-num" style={{ marginBottom: 12 }}>{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section id="care-loop" className="section-py section-paper">
      <div className="container">
        <div className="section-head">
          <span className="kicker">The proposed care ecosystem</span>
          <h2>One closed care loop.</h2>
          <p>Community-driven. Technology-enabled. People-centered.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {CARE_LOOP.map((s, i) => (
            <div key={s.title} className="card-base" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span className="step-num">{i + 1}</span>
                <Icon name={s.icon} size={22} color="var(--advancare-teal)" />
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <div className="grid-4">
          {LOOP_VALUES.map((v) => (
            <div key={v.title} style={{ background: 'var(--advancare-deep)', color: '#FFFFFF', borderRadius: 12, padding: '16px 20px' }}>
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
          <span className="kicker">Connected care process map</span>
          <h2>From family requests to coordinated care.</h2>
          <p>
            Patients and families use the mobile app. Coordinators run the operations dashboard. Caregivers, RHU teams,
            telehealth doctors, MediBox health workers and transport drivers deliver care.
          </p>
        </div>
        <ol style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
          {PROCESS_STEPS.map((s, i) => (
            <li key={s.title} className="card-base" style={{ padding: 20 }}>
              <span className="step-num" style={{ marginBottom: 10 }}>{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  </>
);
