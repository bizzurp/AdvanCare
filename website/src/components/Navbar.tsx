import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import emblemLogo from '../assets/logo-emblem.png';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  // Lift the header off the page once content scrolls under it
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on navigation and on Escape
  useEffect(() => setMobileMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Services', path: '/services' },
    { label: 'Plans', path: '/plans' },
    { label: 'Program', path: '/program' },
    { label: 'Donate', path: '/donate' },
    { label: 'Contact', path: '/contact' },
  ];

  return (
    <header
      className="site-header"
      data-scrolled={scrolled ? '' : undefined}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(247, 249, 245, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--advancare-line)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
        {/* Brand Lockup */}
        <Link to="/" className="brand-lockup" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={emblemLogo} alt="AdvanCare Emblem" style={{ width: 34, height: 34, objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              <span style={{ color: 'var(--brand-blue)' }}>Advan</span>
              <span style={{ color: 'var(--brand-green)' }}>Care</span>
            </span>
            <span style={{ fontSize: 10, color: 'var(--advancare-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              provinces across the country
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: 24,
          }}
          className="desktop-nav"
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === '/'}
              className="nav-link"
              style={({ isActive }) => ({
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--advancare-teal)' : 'var(--advancare-ink)',
                paddingBottom: 4,
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right CTA Cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href="https://advancare-app.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-pill"
            style={{ padding: '8px 16px', fontSize: 13, display: 'none' }}
            id="nav-patient-app-btn"
          >
            <span>Patient App</span>
            <span style={{ fontSize: 11, opacity: 0.7 }}>↗</span>
          </a>

          <Link to="/donate" className="btn btn-primary btn-pill" style={{ padding: '8px 18px', fontSize: 13 }}>
            <Icon name="heart-pulse" size={16} />
            <span>Donate</span>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'flex',
              padding: 8,
              borderRadius: 8,
              color: 'var(--advancare-ink)',
              border: '1px solid var(--advancare-line)',
            }}
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-drawer"
          >
            <Icon name={mobileMenuOpen ? 'alt-arrow-down' : 'menu-dots'} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <div id="mobile-drawer" className="mobile-drawer" data-open={mobileMenuOpen ? '' : undefined} aria-hidden={!mobileMenuOpen}>
        <div className="mobile-drawer-inner">
        <div
          style={{
            backgroundColor: 'var(--advancare-paper)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              style={({ isActive }) => ({
                fontSize: 16,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--advancare-teal)' : 'var(--advancare-ink)',
                padding: '8px 0',
              })}
            >
              {link.label}
            </NavLink>
          ))}
          <div style={{ height: 1, backgroundColor: 'var(--advancare-line)', margin: '4px 0' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="https://advancare-app.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              Launch Patient App ↗
            </a>
            <a
              href="https://advancare-admin.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--advancare-muted)', textAlign: 'center', padding: 4 }}
            >
              Municipal Staff Console ↗
            </a>
          </div>
        </div>
        </div>
      </div>

      {/* Responsive Inline CSS for Navbar */}
      <style>{`
        @media (min-width: 880px) {
          .desktop-nav { display: flex !important; }
          #nav-patient-app-btn { display: inline-flex !important; }
          .mobile-menu-toggle { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
      `}</style>
    </header>
  );
};
