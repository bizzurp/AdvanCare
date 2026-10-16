import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../components/Icon';
import { Brand, LinkButton, PageHeader, Screen, SectionHeading, ServiceRow, StatusBadge } from '../components/ui';
import { PLANS, serviceIcon, serviceTitle, SERVICES } from '../data/catalog';
import { useApp } from '../state/AppState';
import { formatWhen } from './requestUtils';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

// ---------------- 03 / Home ----------------
export function Home() {
  const navigate = useNavigate();
  const { profile, requests, session } = useApp();
  if (session?.role === 'caregiver') return <Navigate to="/caregiver" replace />;
  const active = requests.filter((r) => !['completed', 'cancelled'].includes(r.status)).slice(0, 3);
  const plan = PLANS.find((p) => p.id === profile.planId);
  const tiles: { label: string; icon: IconName; to: string }[] = [
    { label: 'Consult a doctor', icon: 'stethoscope', to: '/services/telehealth' },
    { label: 'Book transport', icon: 'bus', to: '/services/transport' },
    { label: 'RHU services', icon: 'medical-kit', to: '/services/rhu' },
    { label: 'Get assessed', icon: 'heart-pulse', to: '/services/triage' },
  ];
  return (
    <Screen nav>
      <header className="row between" style={{ padding: 'calc(var(--safe-top) + 14px) 12px 4px var(--gutter)' }}>
        <Brand />
        <button className="icon-btn" aria-label="Client profile" onClick={() => navigate('/profile')}>
          <Icon name="user-rounded" />
        </button>
      </header>
      <div className="screen-body stack gap-24" style={{ paddingTop: 16 }}>
        <h1 className="t-h1" tabIndex={-1} data-autofocus>
          {greeting()},
          <br />
          {profile.fullName}.
        </h1>
        <section className="card-deep">
          <p className="t-eyebrow row gap-8" style={{ color: 'var(--lime)' }}>
            <Icon name="user-heart" size={18} /> Here for your family
          </p>
          <p className="t-h2 mt-12" style={{ color: '#fff', fontSize: 22, lineHeight: '30px' }}>
            The right care,
            <br />
            within reach.
          </p>
          <Link to="/services" className="btn btn-quiet mt-16" style={{ background: 'var(--mint)' }}>
            Request a service
          </Link>
        </section>

        <section className="stack gap-12" aria-labelledby="help-h">
          <h2 className="t-section" id="help-h">
            How can we help?
          </h2>
          <div className="grid-2">
            {tiles.map((t) => (
              <Link key={t.to} to={t.to} className="card" style={{ textDecoration: 'none', color: 'inherit', minHeight: 92, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <Icon name={t.icon} className="t-teal" />
                <span className="t-medium">{t.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {active.length > 0 && (
          <section className="stack gap-12">
            <SectionHeading title="Your requests" action={<Link className="link-btn" to="/requests">See all</Link>} />
            {active.map((r) => (
              <Link key={r.id} to={`/requests/${r.id}`} className="record row gap-12">
                <span className="icon-tile">
                  <Icon name={serviceIcon(r.kind)} />
                </span>
                <span className="grow">
                  <span className="row-title" style={{ display: 'block' }}>{serviceTitle(r.kind)}</span>
                  <span className="row-desc" style={{ display: 'block' }}>{formatWhen(r.scheduledFor ?? r.createdAt)}</span>
                  <span className="mt-4" style={{ display: 'inline-block' }}><StatusBadge status={r.status} /></span>
                </span>
                <Icon name="alt-arrow-right" size={20} className="chev" />
              </Link>
            ))}
          </section>
        )}

        <Link to="/plans" className="card card-mint row gap-12" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Icon name="shield-check" className="t-teal" />
          <span className="grow">
            <span className="t-semibold" style={{ display: 'block' }}>{plan ? `${plan.name} plan` : 'Your family, covered.'}</span>
            <span className="t-caption t-muted">{plan ? planStatusText(profile.planStatus) : 'Explore AdvanCare plans'}</span>
          </span>
          <Icon name="alt-arrow-right" size={20} className="chev" />
        </Link>
        <Link to="/assistant" className="row gap-12 t-teal t-medium" style={{ textDecoration: 'none', minHeight: 44 }}>
          <Icon name="chat-round-dots" /> Ask your care assistant
        </Link>
      </div>
    </Screen>
  );
}

export function planStatusText(s?: string) {
  switch (s) {
    case 'pending-payment':
      return 'Waiting for payment';
    case 'pending-subsidy':
      return 'Waiting for LGU subsidy verification';
    case 'active':
      return 'Active';
    default:
      return 'Not enrolled';
  }
}

// ---------------- 06 / Services ----------------
export function Services() {
  const groups: { id: 'consult' | 'travel' | 'care'; title: string }[] = [
    { id: 'consult', title: 'Consult & assess' },
    { id: 'travel', title: 'Get to your visit' },
    { id: 'care', title: 'Caregivers' },
  ];
  return (
    <Screen nav>
      <PageHeader title="Request a service" back={false} />
      <div className="screen-body stack gap-24">
        <div>
          <h2 className="t-h2">
            What care do
            <br />
            you need today?
          </h2>
          <p className="t-body t-muted mt-8">Choose a service to get started.</p>
        </div>
        <div className="banner banner-warn">
          <Icon name="phone" />
          <div>
            <strong>For emergencies, call 911</strong> or go to the nearest hospital. AdvanCare services are scheduled and not for emergencies.
          </div>
        </div>
        {groups.map((g) => (
          <section key={g.id} className="stack gap-12" aria-labelledby={`g-${g.id}`}>
            <h3 className="t-caption t-muted t-medium" id={`g-${g.id}`} style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {g.title}
            </h3>
            {SERVICES.filter((s) => s.group === g.id).map((s) => (
              <ServiceRow key={s.kind} icon={s.icon} title={s.title} desc={s.desc} to={s.path} />
            ))}
          </section>
        ))}
        <ServiceRow icon="document-text" title="Track your requests" desc="Status of everything you’ve requested" to="/requests" />
      </div>
    </Screen>
  );
}

// ---------------- 19 / More ----------------
export function More() {
  const { session, signOut } = useApp();
  const navigate = useNavigate();
  return (
    <Screen nav>
      <PageHeader title="Your AdvanCare" back={false} />
      <div className="screen-body stack gap-12">
        <h2 className="t-h2 mb-8">Care, all in one place.</h2>
        <ServiceRow icon="user-rounded" title="Client & family profile" desc="Personal details and caregivers" to="/profile" />
        <ServiceRow icon="shield-check" title="Account details" desc="Your name, mobile number and sign-in email" to="/account" />
        <ServiceRow icon="shield-check" title="Care plans" desc="Silver, Gold, and Platinum" to="/plans" />
        <ServiceRow icon="document-text" title="Your requests" desc="Status, details, and updates" to="/requests" />
        <ServiceRow icon="chat-round-dots" title="Care assistant" desc="Find information and get support" to="/assistant" />
        <ServiceRow icon="menu-dots" title="Settings" desc="Language, text size, notifications" to="/settings" />
        <ServiceRow icon="phone" title="Help & support" desc="Contact your AdvanCare team" to="/help" />
        <div className="mt-16">
          <button
            className="btn btn-secondary"
            onClick={() => {
              signOut();
              navigate('/sign-in', { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
        {session && (
          <p className="t-caption t-muted t-center mt-8">
            Signed in as {session.email ?? session.phone}
          </p>
        )}
      </div>
    </Screen>
  );
}

// ---------------- 04 / Plans ----------------
export function Plans() {
  const { profile } = useApp();
  return (
    <Screen nav="more">
      <PageHeader title="Care plans" />
      <div className="screen-body stack gap-16">
        <h2 className="t-h2">
          Support for every
          <br />
          stage of family life.
        </h2>
        <p className="t-small t-muted" style={{ marginTop: -8 }}>
          Your LGU pays half of your plan. You pay the other half.
        </p>
        {PLANS.map((p) => {
          const featured = p.id === 'gold';
          const current = profile.planId === p.id;
          return (
            <section key={p.id} className={`plan ${featured ? 'featured' : ''}`} aria-labelledby={`plan-${p.id}`}>
              <div className="row between">
                <h3 className="t-section" id={`plan-${p.id}`}>
                  {p.name}
                </h3>
                {current ? (
                  <span className={`badge ${profile.planStatus === 'active' ? 'badge-success' : 'badge-pending'}`}>{profile.planStatus === 'active' ? 'Your plan' : 'Enrollment pending'}</span>
                ) : featured ? <span className="t-caption t-teal t-medium">Popular with families</span> : p.note ? <span className="t-caption t-muted">{p.note}</span> : null}
              </div>
              <p className="mt-8">
                <span className="price">₱{p.householdMonthly}</span> <span className="t-small t-muted">/ month for your household</span>
              </p>
              <p className="t-caption t-muted">
                ₱{p.annualTotal.toLocaleString()} a year in total · LGU pays ₱{p.lguMonthly}/month
              </p>
              <div className="feature">
                <Icon name="check-circle" />
                <span>Response: {p.response}</span>
              </div>
              {p.inclusions.map((i) => (
                <div className="feature" key={i}>
                  <Icon name="check-circle" />
                  <span>{i}</span>
                </div>
              ))}
              {p.limitation && <p className="t-caption t-muted mt-8">{p.limitation}</p>}
              <div className="mt-16">
                <LinkButton to={`/plans/${p.id}`} variant={featured ? 'primary' : 'secondary'}>
                  {current ? 'View membership' : `Choose ${p.name}`}
                </LinkButton>
              </div>
            </section>
          );
        })}
        <p className="t-caption t-muted">Caregiver shifts are paid separately: ₱300 per 8-hour home visit, ₱500 per 8-hour CVMC shift.</p>
      </div>
    </Screen>
  );
}
