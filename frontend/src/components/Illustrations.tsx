import fullLogo from '../assets/logo-full.png';
import { Icon } from './Icon';

/** Welcome hero: hills, path, sun, and a family walking (01 / Welcome). */
export function WelcomeHero() {
  return (
    <svg viewBox="0 0 342 222" role="img" aria-label="A family walking along a path through green hills" style={{ width: '100%', borderRadius: 18, display: 'block' }}>
      <rect width="342" height="222" fill="#E3F0E8" />
      <circle cx="276" cy="44" r="24" fill="#CBE49C" />
      <path d="M0 150 L70 72 L130 130 L196 52 L276 128 L342 92 L342 222 L0 222Z" fill="#A9CDB9" />
      <path d="M0 172 L84 112 L150 160 L224 104 L342 162 L342 222 L0 222Z" fill="#5E9C83" />
      <path d="M0 196 C80 170 150 178 230 160 C280 150 320 150 342 152 L342 222 L0 222Z" fill="#124E43" />
      <path d="M170 222 C190 196 214 186 236 170 C250 160 262 156 276 158 C258 166 244 180 232 196 C222 210 218 216 216 222Z" fill="#F2F6EE" />
      <g fill="#173E37">
        <circle cx="80" cy="132" r="8" />
        <path d="M70 144 h20 l3 32 h-7 l-2 22 h-8 l-2 -22 h-7z" />
        <circle cx="104" cy="148" r="6" />
        <path d="M96 157 h16 l2 22 h-5 l-1 16 h-8 l-1 -16 h-5z" />
      </g>
      <path d="M36 178 C36 160 44 150 52 146 C48 156 46 166 46 178Z" fill="#697D34" />
      <path d="M44 166 C52 156 62 154 68 156 C60 160 54 166 48 172Z" fill="#CBE49C" />
    </svg>
  );
}

export function OnboardingArtConnected() {
  return (
    <div className="onb-art">
      <div className="stack gap-12" style={{ alignItems: 'center' }}>
        <img src={fullLogo} alt="AdvanCare logo" style={{ width: '52%', maxWidth: 170, height: 'auto' }} draggable={false} />
        <p className="t-eyebrow t-teal">Care Today. Stronger Tomorrow.</p>
      </div>
    </div>
  );
}

export function OnboardingArtCareWay() {
  return (
    <div className="onb-art" aria-hidden="true">
      <div style={{ width: '100%' }} className="stack gap-16">
        <div className="card" style={{ border: 0, borderRadius: 14 }}>
          <div className="row gap-12">
            <span className="avatar" style={{ width: 44, height: 44 }}>
              <Icon name="stethoscope" />
            </span>
            <div>
              <div className="t-semibold">Dr. Santos Reyes</div>
              <div className="t-caption t-muted">General practitioner</div>
            </div>
          </div>
          <div className="grid-3 mt-12">
            {['9:00', '10:00', '11:00'].map((t) => (
              <span key={t} className="chip" style={{ display: 'grid', placeItems: 'center', border: 0, background: t === '10:00' ? 'var(--teal)' : 'var(--paper)', color: t === '10:00' ? '#fff' : 'inherit' }}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="row between t-caption t-medium" style={{ padding: '0 4px' }}>
          <span className="row gap-4"><Icon name="stethoscope" size={18} />Consult</span>
          <span className="row gap-4"><Icon name="bus" size={18} />Transport</span>
          <span className="row gap-4"><Icon name="user-heart" size={18} />Caregiver</span>
        </div>
      </div>
    </div>
  );
}

export function OnboardingArtClearer() {
  const bars = [34, 52, 42, 66, 54, 76, 60];
  return (
    <div className="onb-art" aria-hidden="true">
      <div style={{ width: '100%' }} className="stack gap-16">
        <div className="card" style={{ border: 0, borderRadius: 14 }}>
          <div className="row between">
            <span className="t-semibold">Your care, together</span>
            <Icon name="chart-square" size={20} className="t-teal" />
          </div>
          <div className="row gap-8 mt-12" style={{ alignItems: 'flex-end', height: 80 }}>
            {bars.map((h, i) => (
              <span key={i} style={{ flex: 1, height: `${h}px`, borderRadius: 4, background: i === 5 ? 'var(--teal)' : '#A9CDB9' }} />
            ))}
          </div>
        </div>
        <div className="row gap-8" style={{ background: 'var(--deep)', color: '#fff', borderRadius: 12, padding: '10px 12px', fontSize: 13 }}>
          <Icon name="chat-round-dots" size={20} /> A little help, whenever you need it.
        </div>
      </div>
    </div>
  );
}
