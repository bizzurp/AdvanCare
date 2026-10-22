import React, { useState } from 'react';
import { Icon } from './Icon';
import { CONTACT } from '../data/storyData';

interface DonationTier {
  id: string;
  amount: number;
  label: string;
  impactTitle: string;
  impactDesc: string;
}

const DONATION_TIERS: DonationTier[] = [
  {
    id: 'tier-300',
    amount: 300,
    label: '₱300',
    impactTitle: '1 barangay caregiver shift (8 hours)',
    impactDesc: 'Covers one 8-hour barangay-level caregiver shift for an elder at home.',
  },
  {
    id: 'tier-500',
    amount: 500,
    label: '₱500',
    impactTitle: '1 hospital caregiver shift (8 hours)',
    impactDesc: 'Covers one 8-hour clinical or hospital-level caregiver shift, so a family member can keep working.',
  },
  {
    id: 'tier-900',
    amount: 900,
    label: '₱900',
    impactTitle: '6 months of a Silver household share',
    impactDesc: 'Covers the ₱75 monthly household share of a Silver plan for half a year.',
  },
  {
    id: 'tier-1800',
    amount: 1800,
    label: '₱1,800',
    impactTitle: '1 full year of Silver coverage',
    impactDesc: 'Covers the full annual Silver plan for one household.',
  },
];

export const DonationCard: React.FC<{ className?: string; isHero?: boolean }> = ({ className = '', isHero = false }) => {
  const [selectedTier, setSelectedTier] = useState<DonationTier>(DONATION_TIERS[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(`${CONTACT.person} — ${CONTACT.email} · ${CONTACT.phone}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    `AdvanCare donor pledge: ${selectedTier.label} (${selectedTier.impactTitle})`
  )}`;

  return (
    <div
      className={`donation-card ${className}`}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid var(--advancare-line)',
        boxShadow: isHero ? 'var(--shadow-qr)' : 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          background: 'var(--advancare-goldBg)',
          borderBottom: '1px solid rgba(153, 97, 22, 0.15)',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--advancare-gold)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <Icon name="heart-pulse" size={15} color="var(--advancare-gold)" />
        Donor network
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Sponsor care for a family</h3>
        <p style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>
          Community support and donations help cover care for households that cannot pay their share.
        </p>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {DONATION_TIERS.map((tier) => {
            const isSelected = selectedTier.id === tier.id;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier)}
                aria-pressed={isSelected}
                style={{
                  flex: '1 1 auto',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  border: isSelected ? '1.5px solid var(--advancare-teal)' : '1px solid var(--advancare-line)',
                  background: isSelected ? 'var(--advancare-mint)' : '#FFFFFF',
                  color: isSelected ? 'var(--advancare-deep)' : 'var(--advancare-ink)',
                }}
              >
                {tier.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: 'var(--advancare-paper)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            border: '1px solid var(--advancare-line)',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--advancare-deep)', marginBottom: 2 }}>
            {selectedTier.impactTitle}
          </div>
          <p style={{ fontSize: 12, margin: 0, lineHeight: 1.4 }}>{selectedTier.impactDesc}</p>
        </div>

        <a href={mailto} className="btn btn-primary btn-pill" style={{ marginBottom: 12 }}>
          Pledge {selectedTier.label} by email
        </a>

        <div
          style={{
            background: 'var(--advancare-paper)',
            borderRadius: 8,
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            border: '1px solid var(--advancare-line)',
            marginBottom: 14,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 600, color: 'var(--advancare-muted)' }}>
              {CONTACT.person}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--advancare-ink)', overflowWrap: 'anywhere' }}>
              {CONTACT.email} · {CONTACT.phone}
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="btn btn-pill btn-secondary"
            style={{ padding: '6px 14px', fontSize: 12, flexShrink: 0 }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p style={{ fontSize: 11, lineHeight: 1.4, margin: 0, display: 'flex', gap: 8 }}>
          <Icon name="shield-check" size={16} color="var(--advancare-teal)" />
          <span>Payment channels will be shared by the program office when you pledge. AdvanCare does not collect payments on this site.</span>
        </p>
      </div>
    </div>
  );
};
