import type { ReactNode } from 'react';
import emblem from '../assets/logo-emblem.png';

export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <main className="auth-page">
      <div className={`auth-card ${wide ? 'auth-card-wide' : ''}`}>
        <div className="auth-brand">
          <img src={emblem} alt="" width={40} height={35} />
          <span>
            advan<b>CARE</b> <span className="auth-brand-tag">Admin</span>
          </span>
        </div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted auth-subtitle">{subtitle}</p> : null}
        {children}
      </div>
      <p className="auth-footer">Staff only. Every sign-in and action is recorded.</p>
    </main>
  );
}
