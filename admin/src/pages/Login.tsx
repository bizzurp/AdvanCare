import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, type Me } from '../api';
import { useAuth } from '../auth';
import { Button, CodeInput, ErrorNotice, Field, Notice, useAction } from '../components/ui';
import { AuthShell } from './AuthShell';
import { Enroll } from './Enroll';

type Step = { kind: 'password' } | { kind: 'mfa'; challenge: string } | { kind: 'enroll'; challenge: string };

export function Login() {
  const { me, setMe, endedReason } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState<Step>({ kind: 'password' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const action = useAction();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (me) return <Navigate to={from} replace />;

  const done = (next: Me) => setMe(next);
  const restart = () => {
    setStep({ kind: 'password' });
    setPassword('');
    setCode('');
    action.setError(null);
  };

  if (step.kind === 'enroll') return <Enroll challenge={step.challenge} onDone={done} onRestart={restart} />;

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    const res = await action.run(() => api.login(email, password));
    if (!res) return;
    setPassword('');
    setStep(res.next === 'mfa' ? { kind: 'mfa', challenge: res.challenge } : { kind: 'enroll', challenge: res.challenge });
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (step.kind !== 'mfa') return;
    const res = await action.run(() => api.verifyMfa(step.challenge, code));
    if (res) done(res.me);
    else setCode('');
  };

  if (step.kind === 'mfa') {
    return (
      <AuthShell title="Two-step verification" subtitle={`Signing in as ${email}`}>
        <form onSubmit={submitCode} className="stack16">
          <CodeInput value={code} onChange={setCode} allowRecovery autoFocus />
          <ErrorNotice error={action.error} />
          <Button type="submit" className="block" busy={action.busy} disabled={code.trim().length < 6}>
            Verify
          </Button>
          <Button variant="quiet" className="block" onClick={restart}>
            Use a different account
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Sign in" subtitle="AdvanCare staff console">
      {endedReason ? <Notice tone="warn">{endedReason}</Notice> : null}
      <form onSubmit={submitPassword} className="stack16">
        <Field label="Work email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <ErrorNotice error={action.error} />
        <Button type="submit" className="block" busy={action.busy}>
          Continue
        </Button>
      </form>
      <p className="muted small">Forgot your password or lost your phone? Ask a Super Admin to reset your access.</p>
    </AuthShell>
  );
}
