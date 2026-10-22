import React from 'react';
import { Icon } from './Icon';
import { CARE_PLANS, PLAN_INCLUSIONS, SUBSIDY_NOTE } from '../data/plansData';
import { peso } from '../data/roadmapData';

export const PlanCards: React.FC = () => (
  <>
    <div className="grid-3" style={{ marginBottom: 20 }}>
      {CARE_PLANS.map((plan) => (
        <div key={plan.id} className="card-base" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {plan.badge && (
            <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 11, fontWeight: 700, background: 'var(--advancare-mint)', color: 'var(--advancare-deep)', padding: '3px 10px', borderRadius: 9999, textTransform: 'uppercase' }}>
              {plan.badge}
            </span>
          )}
          <div>
            <h3 style={{ fontSize: 22, fontWeight: 800 }}>{plan.name}</h3>
            <p style={{ fontSize: 13 }}>{plan.tagline}</p>
          </div>
          <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--advancare-line)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="stat-value">{peso(plan.totalAnnual)}</span>
              <span style={{ fontSize: 14, color: 'var(--advancare-muted)' }}>/ year</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--advancare-muted)' }}>{peso(plan.totalMonthly)} / month equivalent</div>
            <div style={{ fontSize: 13, color: 'var(--advancare-teal)', fontWeight: 700, marginTop: 4 }}>
              Household share: {peso(plan.householdOopMonthly)} / month*
            </div>
          </div>
          <ul className="list-check">
            <li>
              <Icon name="tricycle" size={16} color="var(--advancare-teal)" />
              <span><strong>Transport SLA:</strong> urban {plan.transportSla.urban}, rural {plan.transportSla.rural}</span>
            </li>
            <li>
              <Icon name="user-heart" size={16} color="var(--advancare-teal)" />
              <span><strong>Caregiver SLA:</strong> hospital {plan.caregiverSla.hospital}, barangay {plan.caregiverSla.barangay}</span>
            </li>
            <li>
              <Icon name="shield-check" size={16} color="var(--advancare-teal)" />
              <span><strong>Funding:</strong> {plan.funding}</span>
            </li>
            <li>
              <Icon name="users-group-rounded" size={16} color="var(--advancare-teal)" />
              <span>Unemployed 65+ covered: <strong>{plan.unemployedSeniors ? 'Yes' : 'No'}</strong></span>
            </li>
          </ul>
        </div>
      ))}
    </div>
    <div className="card-base" style={{ padding: 20 }}>
      <strong style={{ color: 'var(--advancare-ink)' }}>Across all plans:</strong>{' '}
      <span style={{ color: 'var(--advancare-muted)' }}>{PLAN_INCLUSIONS.join(' · ')}</span>
      <p className="source-note" style={{ marginTop: 8 }}>*{SUBSIDY_NOTE}</p>
    </div>
  </>
);
