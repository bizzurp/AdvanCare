import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import emblem from '../assets/logo-emblem.png';
import { useAuth, useMe } from '../auth';
import { personName, ROLE_LABEL, scopeLabel } from '../format';
import { Icon, type IconName } from './Icon';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  superOnly?: boolean;
}

const NAV: { heading?: string; items: NavItem[] }[] = [
  {
    heading: 'Operations',
    items: [
      { to: '/', label: 'Overview', icon: 'home-angle' },
      { to: '/requests', label: 'Requests', icon: 'document-medicine' },
      { to: '/shifts', label: 'Shifts board', icon: 'calendar' },
      { to: '/services', label: 'Service requests', icon: 'stethoscope' },
      { to: '/clients', label: 'Clients', icon: 'users-group-rounded' },
      { to: '/caregivers', label: 'Caregivers', icon: 'user-heart' },
      { to: '/drivers', label: 'Transport Drivers', icon: 'users-group-rounded' },
      { to: '/payments', label: 'Payments', icon: 'wallet' },
      { to: '/reports', label: 'Reports', icon: 'chart-square' },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { to: '/admins', label: 'Admin accounts', icon: 'users-group-rounded', superOnly: true },
      { to: '/telehealth', label: 'Telehealth Doctors', icon: 'stethoscope', superOnly: true },
      { to: '/audit', label: 'Audit log', icon: 'document-text' },
    ],
  },
  { heading: 'You', items: [{ to: '/account', label: 'My account', icon: 'user-rounded' }] },
];

export function Layout() {
  const me = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSuper = me.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  const initials = personName(me)
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <div className="brand">
          <img src={emblem} alt="" width={32} height={28} />
          <span>
            advan<b>CARE</b>
          </span>
          <span className="brand-tag">Admin</span>
        </div>
        <nav aria-label="Main">
          {NAV.map((group, i) => {
            const items = group.items.filter((item) => !item.superOnly || isSuper);
            if (!items.length) return null;
            return (
              <div className="nav-group" key={i}>
                {group.heading ? <p className="nav-heading">{group.heading}</p> : null}
                {items.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} className="nav-link">
                    <Icon name={item.icon} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <p className="sidebar-note">Caregiver bookings are under Requests; TeleHealth, RHU, Triage, Prescriptions and Transport are under Service requests.</p>
      </aside>
      <div className="main-col">
        <header className="topbar">
          <span className={`scope-chip ${isSuper ? 'scope-all' : ''}`} title={me.municipalities === 'ALL' ? 'All municipalities' : me.municipalities.join(', ')}>
            <Icon name="map-point" size={16} />
            {scopeLabel(me.municipalities)}
          </span>
          <div className="user-menu" ref={menuRef}>
            <button type="button" className="user-button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              <span className="avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="user-text">
                <span className="user-name">{personName(me)}</span>
                <span className="user-role">{ROLE_LABEL[me.role]}</span>
              </span>
            </button>
            {menuOpen ? (
              <div className="menu" role="menu">
                <p className="menu-email">{me.email}</p>
                <button
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/account');
                  }}
                >
                  My account
                </button>
                <button role="menuitem" type="button" onClick={() => void signOut()}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
