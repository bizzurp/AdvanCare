import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { HomeHero } from '../components/home/HomeHero';
import { ProblemSection } from '../components/home/ProblemSection';
import { SolutionSection } from '../components/home/SolutionSection';
import { PlanCards } from '../components/PlanCards';
import { FAQAccordion } from '../components/FAQAccordion';
import { TAGLINE, TARGET_MARKET } from '../data/storyData';

export const HomePage: React.FC = () => (
  <div className="home-page">
    <HomeHero />
    <ProblemSection />
    <SolutionSection />

    <section className="section-py section-paper">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Target market</span>
          <h2>Serving underserved communities across Cagayan Province</h2>
          <p>Primary focus: low-income and rural households in Cagayan Province.</p>
        </div>
        <div className="grid-4">
          {TARGET_MARKET.map((t) => (
            <div key={t.title} className="card-base" style={{ padding: 24 }}>
              <Icon name={t.icon} size={28} color="var(--advancare-teal)" />
              <h3 style={{ marginTop: 12 }}>{t.title}</h3>
              <p>{t.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <span className="kicker">Subscription plans</span>
          <h2>A plan for every family.</h2>
          <p>Accessible care. Healthier communities.</p>
        </div>
        <PlanCards />
      </div>
    </section>

    <section className="section-py section-paper">
      <div className="container" style={{ maxWidth: 880 }}>
        <div className="section-head">
          <span className="kicker">Questions</span>
          <h2>Frequently asked questions</h2>
        </div>
        <FAQAccordion />
      </div>
    </section>

    <section style={{ padding: '64px 0', background: 'var(--advancare-deep)' }}>
      <div className="container" style={{ textAlign: 'center', maxWidth: 760 }}>
        <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 38px)', fontWeight: 800, color: '#FFFFFF', marginBottom: 16 }}>
          From lived experience to connected care.
        </h2>
        <p style={{ fontSize: 17, color: 'var(--advancare-mint)', lineHeight: 1.6, marginBottom: 32 }}>{TAGLINE}</p>
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
          <Link to="/contact" className="btn btn-pill" style={{ background: '#FFFFFF', color: 'var(--advancare-deep)', padding: '14px 28px' }}>
            Partner with us
          </Link>
          <Link to="/donate" className="btn btn-pill" style={{ border: '1px solid var(--advancare-mint)', color: '#FFFFFF', padding: '14px 28px' }}>
            Join the donor network
          </Link>
        </div>
      </div>
    </section>
  </div>
);
