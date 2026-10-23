import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import emblemLogo from '../assets/logo-emblem.png';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid var(--advancare-line)',
        paddingTop: 64,
        paddingBottom: 40,
        marginTop: 'auto',
      }}
    >
      <div className="container">
        {/* Top Emergency Notice Banner */}
        <div
          style={{
            background: 'var(--advancare-redBg)',
            border: '1px solid rgba(168, 58, 50, 0.25)',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Icon name="shield-check" size={22} color="var(--advancare-red)" />
          <div style={{ fontSize: 13, color: 'var(--advancare-red)', lineHeight: 1.5 }}>
            <strong>Not an emergency service:</strong> AdvanCare provides scheduled, non-emergency transport, caregiving, triage and telehealth. In life-threatening emergencies, dial <strong>911</strong> or go to the nearest emergency facility.
          </div>
        </div>

        {/* 4-Column Footer Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 36,
            marginBottom: 48,
          }}
        >
          {/* Col 1: Brand & Mission */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img src={emblemLogo} alt="AdvanCare Emblem" style={{ width: 32, height: 32 }} />
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
                <span style={{ color: 'var(--brand-blue)' }}>Advan</span>
                <span style={{ color: 'var(--brand-green)' }}>Care</span>
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--advancare-muted)', lineHeight: 1.6, marginBottom: 16 }}>
              AI-enabled healthcare management platform for grassroots communities. A program of Cagayan State University.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--advancare-ink)', fontWeight: 600 }}>Proposed pilot:</span>
              <span style={{ color: 'var(--advancare-muted)' }}>2 remote barangays in Peñablanca, Cagayan</span>
            </div>
          </div>

          {/* Col 2: Services & Care */}
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 16 }}>
              Services
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <li>
                <Link to="/services#rhu-services" style={{ color: 'var(--advancare-muted)' }}>
                  RHU / barangay-led care
                </Link>
              </li>
              <li>
                <Link to="/services#nemt-transport" style={{ color: 'var(--advancare-muted)' }}>
                  Non-emergency transport
                </Link>
              </li>
              <li>
                <Link to="/services#telehealth" style={{ color: 'var(--advancare-muted)' }}>
                  Multi-language TeleHealth
                </Link>
              </li>
              <li>
                <Link to="/services#medibox" style={{ color: 'var(--advancare-muted)' }}>
                  MediBox triage
                </Link>
              </li>
              <li>
                <Link to="/services#caregivers" style={{ color: 'var(--advancare-muted)' }}>
                  Caregivers (₱300 / ₱500 per 8 hrs)
                </Link>
              </li>
              <li>
                <Link to="/services#rx-logistics" style={{ color: 'var(--advancare-muted)' }}>
                  Discounted medical supplies
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Impact & Plans */}
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 16 }}>
              Program
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <li>
                <Link to="/donate" style={{ color: 'var(--advancare-muted)' }}>
                  Donor network
                </Link>
              </li>
              <li>
                <Link to="/program" style={{ color: 'var(--advancare-muted)' }}>
                  Program & roadmap
                </Link>
              </li>
              <li>
                <Link to="/plans" style={{ color: 'var(--advancare-muted)' }}>
                  Subscription plans
                </Link>
              </li>
              <li>
                <Link to="/about" style={{ color: 'var(--advancare-muted)' }}>
                  Project team
                </Link>
              </li>
              <li>
                <Link to="/contact#partnerships" style={{ color: 'var(--advancare-muted)' }}>
                  LGU partnership inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform & Governance */}
          <div>
            <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 16 }}>
              Apps
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              <a
                href="https://advancare-app.pages.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13, justifyContent: 'space-between' }}
              >
                <span>Patient Web App</span>
                <span>↗</span>
              </a>
              <a
                href="https://advancare-admin.pages.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: 13, justifyContent: 'space-between' }}
              >
                <span>Municipal Staff Console</span>
                <span>↗</span>
              </a>
            </div>
            <div style={{ fontSize: 12, color: 'var(--advancare-muted)', lineHeight: 1.5 }}>
              Adheres to Republic Act No. 10173 (Philippine Data Privacy Act of 2012). Clinical data is role-restricted.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid var(--advancare-line)',
            paddingTop: 24,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            fontSize: 13,
            color: 'var(--advancare-muted)',
          }}
        >
          <div>
            © {new Date().getFullYear()} AdvanCare · Cagayan State University. For families. With communities.
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link to="/about" style={{ color: 'var(--advancare-muted)' }}>
              About
            </Link>
            <Link to="/contact" style={{ color: 'var(--advancare-muted)' }}>
              Contact
            </Link>
            <Link to="/donate" style={{ color: 'var(--advancare-teal)', fontWeight: 600 }}>
              Donate
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
