import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { CONTACT } from '../data/storyData';

export const ContactPage: React.FC = () => {
  const [tab, setTab] = useState<'lgu' | 'caregiver' | 'general'>('lgu');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="contact-page">
      {/* Header */}
      <section style={{ padding: '64px 0 48px 0', backgroundColor: 'var(--advancare-paper)', borderBottom: '1px solid var(--advancare-line)' }}>
        <div className="container" style={{ maxWidth: 840 }}>
          <span className="kicker" style={{ marginBottom: 12 }}>
            <Icon name="chat-round-dots" size={14} />
            Connect & Partner
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 46px)', fontWeight: 800, marginBottom: 16 }}>
            Partner with AdvanCare
          </h1>
          <p style={{ fontSize: 17, color: 'var(--advancare-muted)', lineHeight: 1.6 }}>
            LGUs, barangay health workers, hospitals, pharmacies, transport providers, caregivers and donors: reach the AdvanCare program office at Cagayan State University.
          </p>
        </div>
      </section>

      {/* Main Content & Form */}
      <section className="section-py" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid var(--advancare-line)' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 440px)',
              gap: 48,
              alignItems: 'start',
            }}
            className="contact-grid"
          >
            {/* Left: Contact Form */}
            <div>
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--advancare-line)', paddingBottom: 12 }}>
                <button
                  onClick={() => setTab('lgu')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: tab === 'lgu' ? 'var(--advancare-mint)' : 'transparent',
                    color: tab === 'lgu' ? 'var(--advancare-deep)' : 'var(--advancare-muted)',
                  }}
                >
                  LGU Mayors & Health Boards
                </button>
                <button
                  onClick={() => setTab('caregiver')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: tab === 'caregiver' ? 'var(--advancare-mint)' : 'transparent',
                    color: tab === 'caregiver' ? 'var(--advancare-deep)' : 'var(--advancare-muted)',
                  }}
                >
                  Caregivers & Providers
                </button>
                <button
                  onClick={() => setTab('general')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    background: tab === 'general' ? 'var(--advancare-mint)' : 'transparent',
                    color: tab === 'general' ? 'var(--advancare-deep)' : 'var(--advancare-muted)',
                  }}
                >
                  General Inquiries
                </button>
              </div>

              {submitted ? (
                <div style={{ background: 'var(--advancare-mint)', padding: 32, borderRadius: 16, textAlign: 'center', border: '1px solid rgba(8, 107, 91, 0.2)' }}>
                  <Icon name="check-circle" size={40} color="var(--advancare-teal)" />
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--advancare-deep)', marginTop: 12, marginBottom: 6 }}>
                    Inquiry Received
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--advancare-deep)', margin: 0 }}>
                    Thank you. This form is not connected yet, so please also email {CONTACT.email} so the program office receives your message.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 6 }}>
                      Full Name / Contact Official
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mayor Juan Dela Cruz / Maria Santos"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--advancare-line)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div className="grid-2" style={{ gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 6 }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@cagayan.gov.ph"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--advancare-line)',
                          fontSize: 14,
                          fontFamily: 'inherit',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 6 }}>
                        Mobile Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0917-xxx-xxxx"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--advancare-line)',
                          fontSize: 14,
                          fontFamily: 'inherit',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 6 }}>
                      Municipality in Cagayan
                    </label>
                    <select
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--advancare-line)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        outline: 'none',
                        background: '#FFFFFF',
                      }}
                    >
                      <option>Tuguegarao City</option>
                      <option>Solana</option>
                      <option>Peñablanca</option>
                      <option>Baggao</option>
                      <option>Alcala</option>
                      <option>Aparri</option>
                      <option>Amulung</option>
                      <option>Enrile</option>
                      <option>Other Cagayan Municipality</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--advancare-ink)', marginBottom: 6 }}>
                      Message / Partnership Proposal
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder={
                        tab === 'lgu'
                          ? 'Describe your municipality’s health goals and target barangays for the 50% LGU subsidy...'
                          : 'Tell us about your background, clearances, or driving experience...'
                      }
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--advancare-line)',
                        fontSize: 14,
                        fontFamily: 'inherit',
                        outline: 'none',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-pill" style={{ padding: '14px 28px', fontSize: 15, alignSelf: 'flex-start' }}>
                    Submit Inquiry
                  </button>
                </form>
              )}
            </div>

            {/* Right: Provincial Anchor Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card-base" style={{ background: 'var(--advancare-paper)', padding: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--advancare-ink)', marginBottom: 12 }}>Contact person</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--advancare-muted)' }}>
                  <div>
                    <strong style={{ color: 'var(--advancare-ink)' }}>{CONTACT.person}</strong>
                    <div>{CONTACT.institution}</div>
                    <div>{CONTACT.college}</div>
                  </div>
                  <div>
                    <a href={`mailto:${CONTACT.email}`} style={{ color: 'var(--advancare-teal)', fontWeight: 600 }}>{CONTACT.email}</a>
                    <div>{CONTACT.phone}</div>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--advancare-ink)' }}>Corporate address</strong>
                    <div>{CONTACT.address}</div>
                  </div>
                  <div style={{ color: 'var(--advancare-red)', fontWeight: 600 }}>For emergencies, call 911.</div>
                </div>
              </div>

              <div id="partnerships" className="card-base" style={{ background: 'var(--advancare-mint)', border: '1px solid rgba(8, 107, 91, 0.2)', padding: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--advancare-deep)', marginBottom: 8 }}>Key partners we work with</h4>
                <p style={{ fontSize: 13, color: 'var(--advancare-deep)', lineHeight: 1.5, margin: 0 }}>
                  Local Government Units · Barangay health workers · Hospitals · DOH & local health offices · Doctors, nurses & midwives · Transport providers · Caregiver pool · Pharmacies
                </p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .contact-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>
    </div>
  );
};
