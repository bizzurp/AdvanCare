import { useCallback, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { ApiError } from '../api';
import { Icon } from './Icon';

export function Button({ variant = 'primary', busy, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; busy?: boolean }) {
  return (
    <button type="button" {...rest} className={`btn btn-${variant} ${rest.className ?? ''}`} disabled={rest.disabled || busy} aria-busy={busy || undefined}>
      {busy ? <span className="spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = input.type === 'password';
  const field = (
    <input
      id={id}
      className="input"
      aria-invalid={!!error || undefined}
      aria-describedby={hint || error ? `${id}-note` : undefined}
      {...input}
      type={isPassword && shown ? 'text' : input.type}
    />
  );
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {isPassword ? (
        <div className="input-wrap">
          {field}
          <button type="button" className="input-reveal" aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} onClick={() => setShown((s) => !s)}>
            <Icon name={shown ? 'eye-closed' : 'eye'} size={18} />
          </button>
        </div>
      ) : (
        field
      )}
      {error ? (
        <p className="field-error" id={`${id}-note`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field-hint" id={`${id}-note`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' | 'deep'; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'good' | 'warn' | 'bad'; title?: string; children?: ReactNode }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      {title ? <strong>{title}</strong> : null}
      {children ? <div>{children}</div> : null}
    </div>
  );
}

export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
  const ref = error instanceof ApiError && error.requestId ? ` (ref ${error.requestId.slice(0, 8)})` : '';
  return <Notice tone="bad">{message + ref}</Notice>;
}

export function fieldError(error: unknown, field: string): string | undefined {
  return error instanceof ApiError ? error.fieldErrors[field]?.[0] : undefined;
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="page-header">
      {back}
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" /> {label}
    </div>
  );
}

/** Loads data on mount (and when deps change); `reload` refetches. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void reload(), deps);
  return { data, setData, error, loading, reload };
}

/** Runs an action, tracking busy/error. Returns the result, or undefined if it failed. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button type="button" className="icon-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {footer ? <div className="modal-foot">{footer}</div> : null}
    </dialog>
  );
}

export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="copy-field">
      <span className="sr-only">{label}</span>
      <code>{value}</code>
      <Button
        variant="secondary"
        onClick={async () => {
          await navigator.clipboard.writeText(value).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  );
}

/** One-time display of recovery codes, with copy and download. */
export function RecoveryCodes({ codes, email }: { codes: string[]; email: string }) {
  const text = `AdvanCare Admin recovery codes for ${email}\nEach code works once. Keep them somewhere safe and private.\n\n${codes.join('\n')}\n`;
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'advancare-admin-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="recovery">
      <ol className="recovery-codes">
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ol>
      <div className="row gap8">
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(text).catch(() => undefined)}>
          Copy all
        </Button>
        <Button variant="secondary" onClick={download}>
          Download .txt
        </Button>
      </div>
    </div>
  );
}

export function CodeInput({ value, onChange, allowRecovery, autoFocus }: { value: string; onChange: (v: string) => void; allowRecovery?: boolean; autoFocus?: boolean }) {
  return (
    <Field
      label={allowRecovery ? 'Authenticator code or recovery code' : '6-digit code'}
      inputMode={allowRecovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      maxLength={allowRecovery ? 12 : 6}
      value={value}
      onChange={(e) => onChange(allowRecovery ? e.target.value : e.target.value.replace(/\D/g, ''))}
      hint={allowRecovery ? 'Open your authenticator app, or use one of your saved recovery codes (like K7QM-4XTB).' : 'Open your authenticator app and enter the current code for AdvanCare Admin.'}
      required
    />
  );
}
