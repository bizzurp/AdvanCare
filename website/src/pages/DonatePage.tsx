import React from 'react';
import { DonationCard } from '../components/DonationCard';
import { Icon } from '../components/Icon';

export const DonatePage: React.FC = () => (
  <div className="donate-page">
    <section className="page-hero">
      <div className="container">
        <span className="kicker">
          <Icon name="heart-pulse" size={14} />
          Donor network
        </span>
        <h1>Community support for families who need it most</h1>
        <p>
          In the AdvanCare care loop, a donor network of community supporters helps cover care for households that cannot pay
          their share. Plans can be funded by public funds or private donors.
        </p>
      </div>
    </section>

    <section className="section-py section-white">
      <div className="container split-2">
        <div>
          <div className="section-head">
            <h2>What a gift covers</h2>
            <p>Every amount maps to a published AdvanCare rate.</p>
          </div>
          <ul className="list-check">
            <li>
              <Icon name="check-circle" size={16} color="var(--advancare-teal)" />
              <span><strong>₱300</strong> covers one 8-hour barangay-level caregiver shift.</span>
            </li>
            <li>
              <Icon name="check-circle" size={16} color="var(--advancare-teal)" />
              <span><strong>₱500</strong> covers one 8-hour clinical or hospital-level caregiver shift.</span>
            </li>
            <li>
              <Icon name="check-circle" size={16} color="var(--advancare-teal)" />
              <span><strong>₱900</strong> covers six months of a household’s ₱75 monthly Silver share.</span>
            </li>
            <li>
              <Icon name="check-circle" size={16} color="var(--advancare-teal)" />
              <span><strong>₱1,800</strong> covers a full year of Silver for one household.</span>
            </li>
          </ul>
          <div className="card-base" style={{ background: 'var(--advancare-goldBg)', marginTop: 28, padding: 20 }}>
            <p style={{ margin: 0, color: 'var(--advancare-gold)' }}>
              AdvanCare is a proposed program. The pilot starts with 30-50 households in 2 remote barangays of Peñablanca.
              Pledges are coordinated directly with the program leader.
            </p>
          </div>
        </div>
        <DonationCard isHero />
      </div>
    </section>
  </div>
);
