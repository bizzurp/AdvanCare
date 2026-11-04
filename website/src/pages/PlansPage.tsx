import React from 'react';
import { Link } from 'react-router-dom';
import { PlanCards } from '../components/PlanCards';
import { CARE_PLANS, PLAN_INCLUSIONS, SLA_DEFINITION } from '../data/plansData';
import { peso } from '../data/roadmapData';

export const PlansPage: React.FC = () => (
  <div className="plans-page">
    <section className="page-hero">
      <div className="container">
        <h1>Accessible care for every family</h1>
        <p>
          Three yearly plans: Silver (₱150/mo), Gold (₱250/mo), and Platinum (₱350/mo). Under the proposed 50% LGU
          subsidy, households pay ₱75 to ₱175 a month.
        </p>
      </div>
    </section>

    <section className="section-py section-paper">
      <div className="container">
        <PlanCards />
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container">
        <div className="section-head">
          <h2>Feature comparison</h2>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Feature</th>
                {CARE_PLANS.map((p) => (
                  <th key={p.id}>
                    {p.name} · {peso(p.totalMonthly)}/mo ({peso(p.totalAnnual)}/yr)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_INCLUSIONS.map((f) => (
                <tr key={f}>
                  <th scope="row">{f}</th>
                  {CARE_PLANS.map((p) => (
                    <td key={p.id}>Included</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">Non-emergency medical transport SLA</th>
                {CARE_PLANS.map((p) => (
                  <td key={p.id}>Urban {p.transportSla.urban} · Rural {p.transportSla.rural}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Caregiver SLA (clinical/hospital ₱500 per 8 hrs; barangay ₱300 per 8 hrs)</th>
                {CARE_PLANS.map((p) => (
                  <td key={p.id}>Hospital {p.caregiverSla.hospital} · Barangay {p.caregiverSla.barangay}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Discount*</th>
                {CARE_PLANS.map((p) => (
                  <td key={p.id}>{p.discountNote}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Best for</th>
                {CARE_PLANS.map((p) => (
                  <td key={p.id}>{p.bestFor}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Unemployed 65+</th>
                {CARE_PLANS.map((p) => (
                  <td key={p.id}>{p.unemployedSeniors ? 'Covered' : 'Not covered'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="source-note" style={{ marginTop: 12 }}>{SLA_DEFINITION}</p>
      </div>
    </section>

    <section style={{ padding: '48px 0', background: 'var(--advancare-paper)', textAlign: 'center' }}>
      <div className="container">
        <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Is your LGU interested in co-funding plans?</h3>
        <Link to="/contact" className="btn btn-primary btn-pill">Contact the program office</Link>
      </div>
    </section>
  </div>
);
