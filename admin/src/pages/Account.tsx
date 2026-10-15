import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useAuth, useMe } from '../auth';
import { Badge, Button, CodeInput, ErrorNotice, Field, fieldError, Loading, Modal, Notice, PageHeader, RecoveryCodes, useAction, useLoad } from '../components/ui';
import { dateTime, relative, ROLE_LABEL, scopeLabel } from '../format';

function deviceLabel(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} on ${os}` : browser;
}

export function Account() {
  const me = useMe();
  const { refresh, setMe } = useAuth();
  const sessions = useLoad(() => api.mySessions().then((r) => r.sessions), []);
  const [flash, setFlash] = useState<string | null>(null);
  const [modal, setModal] = useState<'codes' | 'reset' | null>(null);
  const revoke = useAction();

  return (
    <>
      <PageHeader title="My account" subtitle={me.email} />
      {flash ? <Notice tone="good">{flash}</Notice> : null}
      <div className="grid-detail">
        <section className="card">
          <h2>Profile</h2>
          <dl className="facts">
            <dt>Name</dt>
            <dd>{me.fullName}</dd>
            <dt>Role</dt>
            <dd>{ROLE_LABEL[me.role]}</dd>
            <dt>Access</dt>
            <dd>{scopeLabel(me.municipalities)}</dd>
            <dt>Signed in</dt>
            <dd>{dateTime(me.lastLoginAt)}</dd>
          </dl>
          <p className="muted small">Your name, role and access are managed by a Super Admin.</p>
        </section>
        <PasswordCard onDone={(n) => setFlash(n ? `Password changed. ${n} other session(s) were signed out.` : 'Password changed.')} />
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Two-step verification</h2>
          <Badge tone="good">On</Badge>
        </div>
        <p>
          Recovery codes left: <b>{me.recoveryCodesRemaining}</b> of 10.
          {me.recoveryCodesRemaining <= 3 ? ' Make new ones soon.' : ''}
        </p>
        <div className="row gap8 wrap">
          <Button variant="secondary" onClick={() => setModal('codes')}>
            Make new recovery codes
          </Button>
          <Button variant="secondary" onClick={() => setModal('reset')}>
            Move to a new phone
          </Button>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Where you’re signed in</h2>
          {(sessions.data?.length ?? 0) > 1 ? (
            <Button
              variant="secondary"
              busy={revoke.busy}
              onClick={async () => {
                const res = await revoke.run(() => api.revokeOtherSessions());
                if (res) {
                  setFlash(`Signed out ${res.ended} other session(s).`);
                  void sessions.reload();
                }
              }}
            >
              Sign out all others
            </Button>
          ) : null}
        </div>
        <ErrorNotice error={revoke.error} />
        {sessions.loading && !sessions.data ? (
          <Loading />
        ) : (
          <ul className="list">
            {(sessions.data ?? []).map((s) => (
              <li key={s.id} className="list-row">
                <span>
                  <b>{deviceLabel(s.userAgent)}</b> {s.current ? <Badge tone="info">This browser</Badge> : null}
                  <span className="muted small block">
                    Started {dateTime(s.createdAt)} · active {relative(s.lastSeenAt)}
                    {s.ip ? ` · IP ${s.ip}` : ''}
                  </span>
                </span>
                {!s.current ? (
                  <Button
                    variant="quiet"
                    onClick={async () => {
                      if (await revoke.run(() => api.revokeMySession(s.id))) void sessions.reload();
                    }}
                  >
                    Sign out
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">Sessions end after 30 minutes without activity, and always after 8 hours.</p>
      </section>

      {modal === 'codes' ? <NewCodesModal email={me.email} onClose={() => { setModal(null); void refresh(); }} /> : null}
      {modal === 'reset' ? <ResetMfaModal onClose={() => setModal(null)} onDone={() => setMe(null)} /> : null}
    </>
  );
}

function PasswordCard({ onDone }: { onDone: (otherSessionsEnded: number) => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const action = useAction();
  const mismatch = confirm.length > 0 && confirm !== next;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    const res = await action.run(() => api.changePassword(current, next));
    if (res) {
      setCurrent('');
      setNext('');
      setConfirm('');
      onDone(res.otherSessionsEnded);
    }
  };
  return (
    <section className="card">
      <h2>Password</h2>
      <form onSubmit={submit} className="stack12">
        <Field label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required error={fieldError(action.error, 'currentPassword')} />
        <Field label="New password" type="password" autoComplete="new-password" minLength={12} value={next} onChange={(e) => setNext(e.target.value)} required hint="At least 12 characters." error={fieldError(action.error, 'newPassword')} />
        <Field label="Type it again" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required error={mismatch ? 'The passwords don’t match.' : undefined} />
        {!fieldError(action.error, 'currentPassword') && !fieldError(action.error, 'newPassword') ? <ErrorNotice error={action.error} /> : null}
        <Button type="submit" variant="secondary" busy={action.busy} disabled={mismatch}>
          Change password
        </Button>
      </form>
    </section>
  );
}

function NewCodesModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const action = useAction();
  return (
    <Modal
      title={codes ? 'Your new recovery codes' : 'Make new recovery codes'}
      onClose={onClose}
      footer={
        codes ? (
          <Button onClick={onClose}>I saved them</Button>
        ) : (
          <>
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button
              busy={action.busy}
              disabled={code.length !== 6}
              onClick={async () => {
                const res = await action.run(() => api.regenerateRecoveryCodes(code));
                if (res) setCodes(res.recoveryCodes);
                else setCode('');
              }}
            >
              Make new codes
            </Button>
          </>
        )
      }
    >
      {codes ? (
        <>
          <Notice tone="warn">Your old codes no longer work. These are shown only once.</Notice>
          <RecoveryCodes codes={codes} email={email} />
        </>
      ) : (
        <>
          <p>Your old codes will stop working. Confirm with your authenticator app.</p>
          <CodeInput value={code} onChange={setCode} autoFocus />
          <ErrorNotice error={action.error} />
        </>
      )}
    </Modal>
  );
}

function ResetMfaModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [code, setCode] = useState('');
  const action = useAction();
  return (
    <Modal
      title="Move to a new phone"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            busy={action.busy}
            disabled={code.length !== 6}
            onClick={async () => {
              if (await action.run(async () => (await api.resetMyMfa(code), true))) onDone();
              else setCode('');
            }}
          >
            Turn off and sign out
          </Button>
        </>
      }
    >
      <p>This turns off your current authenticator and signs you out everywhere. When you sign in again with your password, you’ll scan a new QR code with your new phone.</p>
      <CodeInput value={code} onChange={setCode} autoFocus />
      <ErrorNotice error={action.error} />
    </Modal>
  );
}
