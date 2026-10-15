import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Button, ErrorNotice, Field, fieldError, Loading, Notice, useAction, useLoad } from '../components/ui';
import { dateTime, ROLE_LABEL } from '../format';
import { AuthShell } from './AuthShell';
import { Enroll } from './Enroll';

/** Reads the invite token from the URL fragment (never sent to the server in a URL). */
function tokenFromHash(): string {
  return new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
}

export function AcceptInvite() {
  const { me, setMe } = useAuth();
  const [token] = useState(tokenFromHash);
  const invite = useLoad(() => api.invitation(token), [token]);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const action = useAction();

  // Drop the token from the address bar once read.
  useEffect(() => {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  }, []);
  useEffect(() => {
    if (invite.data?.fullName) setFullName((v) => v || invite.data!.fullName!);
  }, [invite.data]);

  if (me && !challenge) return <Navigate to="/" replace />;
  if (challenge) return <Enroll challenge={challenge} onDone={setMe} onRestart={() => (window.location.href = '/login')} />;

  if (!token) {
    return (
      <AuthShell title="Invite link incomplete">
        <Notice tone="bad">This page needs the full link from your invite. Open the link exactly as you received it.</Notice>
        <Link to="/login">Go to sign in</Link>
      </AuthShell>
    );
  }
  if (invite.loading) return <AuthShell title="Checking your invite…"><Loading /></AuthShell>;
  if (invite.error || !invite.data) {
    return (
      <AuthShell title="This invite can’t be used">
        <ErrorNotice error={invite.error} />
        <Link to="/login">Go to sign in</Link>
      </AuthShell>
    );
  }

  const inv = invite.data;
  const mismatch = confirm.length > 0 && confirm !== password;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    const res = await action.run(() => api.acceptInvite(token, fullName, password));
    if (res) setChallenge(res.challenge);
  };

  return (
    <AuthShell title="Set up your staff account" subtitle={<>You were invited as <b>{ROLE_LABEL[inv.role]}</b>{inv.invitedBy ? ` by ${inv.invitedBy}` : ''}.</>} wide>
      <dl className="facts">
        <dt>Email</dt>
        <dd>{inv.email}</dd>
        <dt>Access</dt>
        <dd>{inv.role === 'SUPER_ADMIN' ? 'All municipalities, plus staff accounts and audit' : inv.municipalities.join(', ')}</dd>
        <dt>Link expires</dt>
        <dd>{dateTime(inv.expiresAt)}</dd>
      </dl>
      {inv.awaitingApproval ? (
        <Notice tone="warn" title="Waiting for approval">
          A second Super Admin must approve this Super Admin invite before you can set it up. Try this link again once they have.
        </Notice>
      ) : (
        <form onSubmit={submit} className="stack16">
          <Field label="Full name" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required error={fieldError(action.error, 'fullName')} />
          <input type="email" autoComplete="username" value={inv.email} readOnly hidden />
          <Field
            label="Choose a password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            hint="At least 12 characters. A short sentence is easiest to remember."
            error={fieldError(action.error, 'password')}
          />
          <Field label="Type it again" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required error={mismatch ? 'The passwords don’t match.' : undefined} />
          {!fieldError(action.error, 'password') ? <ErrorNotice error={action.error} /> : null}
          <Button type="submit" className="block" busy={action.busy} disabled={!password || mismatch}>
            Continue to two-step verification
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
