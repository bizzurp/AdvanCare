import { forwardRef, useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import emblem from '../assets/logo-emblem.png';
import { Icon, type IconName } from './Icon';
import { useApp } from '../state/AppState';
import type { RequestStatus } from '../data/types';

// ---------- Brand ----------
export function Brand({ size = 'md' }: { size?: 'md' | 'sm' }) {
  return (
    <span className="brand" role="img" aria-label="AdvanCare">
      <img src={emblem} alt="" style={{ width: size === 'sm' ? 30 : 36 }} />
      <span className="brand-word" aria-hidden="true" style={size === 'sm' ? { fontSize: 20 } : undefined}>
        <span className="a">Advan</span>
        <span className="c">Care</span>
      </span>
    </span>
  );
}

// ---------- Screen shell ----------
/**
 * Navigation rule (applied to every screen):
 * - Main tabs and pages inside a section show the bottom nav, with their section's tab active.
 *   Pass the tab when the URL does not start with it (e.g. /settings belongs to More).
 * - Focused tasks with a sticky ActionBar (forms), the print view and signed-out screens omit it.
 * - Main tabs have no Back button; every other screen does.
 */
export function Screen({ children, nav = false, className = '' }: { children: ReactNode; nav?: boolean | Tab; className?: string }) {
  const { online } = useApp();
  return (
    <div className={`screen ${className}`}>
      {!online && (
        <div className="offline-bar" role="status">
          <Icon name="wi-fi-router" size={18} />
          You’re offline. New requests will be saved and sent when you reconnect.
        </div>
      )}
      {children}
      {nav && <BottomNav active={typeof nav === 'string' ? nav : undefined} />}
    </div>
  );
}

export function PageHeader({ title, back, trailing }: { title: string; back?: string | (() => void) | false; trailing?: ReactNode }) {
  const navigate = useNavigate();
  const onBack = () => {
    if (typeof back === 'function') back();
    else if (typeof back === 'string') navigate(back);
    else navigate(-1);
  };
  return (
    <header className="page-header">
      {back !== false ? (
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          <Icon name="alt-arrow-left" />
        </button>
      ) : (
        <span style={{ width: 12 }} />
      )}
      <h1 tabIndex={-1} data-autofocus>
        {title}
      </h1>
      {trailing}
    </header>
  );
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}

// ---------- Buttons ----------
type BtnVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export function Button({
  variant = 'primary',
  loading,
  children,
  ...rest
}: { variant?: BtnVariant; loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-${variant}`} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', children }: { to: string; variant?: BtnVariant; children: ReactNode }) {
  return (
    <Link to={to} className={`btn btn-${variant}`}>
      {children}
    </Link>
  );
}

// ---------- Fields ----------
interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'error' : ''}`}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {children(id, describedBy)}
      {hint && !error && (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field-error" id={errId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

type TextFieldProps = { label: string; hint?: string; error?: string; lead?: string; trailing?: ReactNode } & InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, lead, trailing, className = '', ...input },
  ref,
) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <div className="input-wrap">
          {lead && (
            <span className="input-lead" aria-hidden="true">
              {lead}
            </span>
          )}
          <input
            {...input}
            ref={ref}
            id={id}
            className={`input ${trailing ? 'has-trail' : ''} ${lead ? 'has-lead' : ''} ${className}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
          />
          {trailing && <span className="input-trail">{trailing}</span>}
        </div>
      )}
    </Field>
  );
});

export function SelectField({
  label,
  hint,
  error,
  options,
  placeholder,
  ...select
}: {
  label: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options: readonly (string | { value: string; label: string })[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => (
        <div className="select-wrap">
          <select id={id} className="select" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...select}>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((o) => {
              const v = typeof o === 'string' ? o : o.value;
              const l = typeof o === 'string' ? o : o.label;
              return (
                <option key={v} value={v}>
                  {l}
                </option>
              );
            })}
          </select>
          <Icon name="alt-arrow-down" size={22} />
        </div>
      )}
    </Field>
  );
}

export function TextArea({ label, hint, error, ...ta }: { label: string; hint?: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id, describedBy) => <textarea id={id} className="textarea" aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...ta} />}
    </Field>
  );
}

export function Checkbox({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="t-medium">{label}</span>
        {desc && <span className="row-desc" style={{ display: 'block' }}>{desc}</span>}
      </span>
    </label>
  );
}

// ---------- Rows ----------
export function ServiceRow({ icon, title, desc, to, onClick, trailing }: { icon: IconName; title: string; desc?: string; to?: string; onClick?: () => void; trailing?: ReactNode }) {
  const inner = (
    <>
      <span className="icon-tile">
        <Icon name={icon} />
      </span>
      <span className="grow">
        <span className="row-title" style={{ display: 'block' }}>
          {title}
        </span>
        {desc && (
          <span className="row-desc" style={{ display: 'block' }}>
            {desc}
          </span>
        )}
      </span>
      {trailing ?? <Icon name="alt-arrow-right" size={20} className="chev" />}
    </>
  );
  if (to)
    return (
      <Link to={to} className="service-row">
        {inner}
      </Link>
    );
  return (
    <button type="button" className="service-row" onClick={onClick}>
      {inner}
    </button>
  );
}

export function ChoiceRow({
  icon,
  title,
  desc,
  selected,
  onSelect,
  disabled,
  role = 'radio',
  trailingNote,
}: {
  icon?: IconName;
  title: string;
  desc?: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  role?: 'radio' | 'checkbox';
  trailingNote?: ReactNode;
}) {
  return (
    <button type="button" role={role} aria-checked={selected} className="choice-row" onClick={onSelect} disabled={disabled}>
      {icon && (
        <span className="lead">
          <Icon name={icon} />
        </span>
      )}
      <span className="grow">
        <span className="t-medium" style={{ display: 'block' }}>
          {title}
        </span>
        {desc && (
          <span className="row-desc" style={{ display: 'block' }}>
            {desc}
          </span>
        )}
        {trailingNote}
      </span>
      <span className="choice-mark" aria-hidden="true">
        {selected && <Icon name="check-circle" size={22} />}
      </span>
    </button>
  );
}

export function ChoiceGroup({ label, children, className = 'stack gap-12' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export function DetailRow({ icon, label, value }: { icon: IconName; label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <Icon name={icon} />
      <div className="grow">
        <div className="detail-label">{label}</div>
        <div className="detail-value">{value}</div>
      </div>
    </div>
  );
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="row between" style={{ minHeight: 28 }}>
      <h2 className="t-section">{title}</h2>
      {action}
    </div>
  );
}

// ---------- Status ----------
export const STATUS_META: Record<RequestStatus, { label: string; tone: 'success' | 'pending' | 'info' | 'error' | 'neutral' }> = {
  'saved-demo': { label: 'Saved on device', tone: 'pending' },
  queued: { label: 'Waiting to send', tone: 'pending' },
  submitted: { label: 'Sent · awaiting confirmation', tone: 'info' },
  confirmed: { label: 'Confirmed', tone: 'success' },
  'in-progress': { label: 'In progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export function Badge({ tone, children }: { tone: 'success' | 'pending' | 'info' | 'error' | 'neutral'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function Banner({ tone = 'info', icon = 'shield-check', children }: { tone?: 'info' | 'warn' | 'error'; icon?: IconName; children: ReactNode }) {
  return (
    <div className={`banner banner-${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}

export function DemoTag({ children = 'Demo data' }: { children?: ReactNode }) {
  return <span className="demo-tag">{children}</span>;
}

export function DependencyNote({ title = 'Not yet connected', children }: { title?: string; children: ReactNode }) {
  return (
    <div className="dependency" role="note">
      <strong>{title}:</strong> {children}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav className="stepper" aria-label="Progress">
      <ol>
        {steps.map((s, i) => (
          <li key={s} aria-current={i === current ? 'step' : undefined} className={i < current ? 'done' : ''}>
            <span className="num">{i + 1}</span>
            {s}
            {i < current && <span className="sr-only"> (completed)</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------- Bottom navigation ----------
export type Tab = 'home' | 'services' | 'reports' | 'assistant' | 'more';

const NAV: { tab: Tab; to: string; label: string; icon: IconName }[] = [
  { tab: 'home', to: '/home', label: 'Home', icon: 'home-angle' },
  { tab: 'services', to: '/services', label: 'Services', icon: 'medical-kit' },
  { tab: 'reports', to: '/reports', label: 'Reports', icon: 'chart-square' },
  { tab: 'assistant', to: '/assistant', label: 'Assistant', icon: 'chat-round-dots' },
  { tab: 'more', to: '/more', label: 'More', icon: 'menu-dots' },
];

export function BottomNav({ active }: { active?: Tab }) {
  const { pathname } = useLocation();
  const current = active ?? NAV.find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`))?.tab;
  return (
    <nav className="bottom-nav" aria-label="Main">
      {NAV.map((n) => (
        <Link
          key={n.tab}
          to={n.to}
          aria-current={n.tab === current ? 'page' : undefined}
          // Re-tapping the tab you are on does nothing; from a page inside the section it returns to the tab.
          onClick={(e) => pathname === n.to && e.preventDefault()}
        >
          <Icon name={n.icon} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
