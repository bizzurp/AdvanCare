import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Account } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { MunicipalityPicker } from '../components/MunicipalityPicker';
import { Badge, Button, CopyField, ErrorNotice, fieldError, Loading, Modal, Notice, PageHeader, useAction, useLoad } from '../components/ui';
import { dateTime, personName, relative, ROLE_LABEL } from '../format';
import { StatusBadges } from './Admins';
import { ActivityList } from './Home';

type Confirm = { title: string; body: ReactNode; cta: string; done: string; danger?: boolean; withReason?: boolean; run: (reason: string) => Promise<unknown> };

export function AdminDetail() {
  const { id = '' } = useParams();
  const me = useMe();
  const detail = useLoad(() => api.account(id), [id]);
  const byThem = useLoad(() => api.audit({ actor: id }), [id]);
  const aboutThem = useLoad(() => api.audit({ entityType: 'staff', entityId: id }), [id]);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [editingScope, setEditingScope] = useState(false);
  const [inviteLink, setInviteLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error || !detail.data) return <ErrorNotice error={detail.error} />;
  const { account, scopeHistory, invitedAccounts } = detail.data;
  const isSelf = account.id === me.id;

  const refreshAll = async (message?: string) => {
    await Promise.all([detail.reload(), byThem.reload(), aboutThem.reload()]);
    setFlash(message ?? null);
  };

  const ask = (c: Confirm) => {
    setFlash(null);
    setConfirm(c);
  };

  const actions: ReactNode[] = [];
  if (!isSelf) {
    if (account.status === 'INVITED') {
      if (account.pendingInvite?.awaitingApproval && account.pendingInvite.invitedByUserId !== me.id) {
        actions.push(
          <Button key="approve" onClick={() => ask({ title: 'Approve Super Admin invite?', body: <>Once approved, {personName(account)} can use their invite link to become a Super Admin with access to everything.</>, cta: 'Approve', done: 'Invite approved. They can now use their link.', run: () => api.approveInvite(account.id) })}>
            Approve invite
          </Button>,
        );
      }
      actions.push(
        <Button
          key="renew"
          variant="secondary"
          onClick={() =>
            ask({
              title: 'Send a new invite link?',
              body: 'The old link stops working. You’ll get a new link to send.',
              cta: 'Create new link', done: 'New invite link created. The old one no longer works.',
              run: async () => {
                const res = await api.renewInvite(account.id);
                setInviteLink({ url: res.inviteUrl, expiresAt: res.expiresAt });
              },
            })
          }
        >
          New invite link
        </Button>,
        <Button key="revoke" variant="danger" onClick={() => ask({ title: 'Cancel this invite?', body: 'The link stops working and the account is suspended. You can invite them again with a different email later.', cta: 'Cancel invite', done: 'Invite cancelled.', danger: true, run: () => api.revokeInvite(account.id) })}>
          Cancel invite
        </Button>,
      );
    }
    if (account.locked) {
      actions.push(
        <Button key="unlock" variant="secondary" onClick={() => ask({ title: 'Unlock this account?', body: 'They were locked out after 5 wrong attempts. Unlock only if you’ve confirmed it was them.', cta: 'Unlock', done: 'Account unlocked.', run: () => api.unlock(account.id) })}>
          Unlock
        </Button>,
      );
    }
    if (account.status === 'ACTIVE') {
      if (account.activeSessions > 0) {
        actions.push(
          <Button key="signout" variant="secondary" onClick={() => ask({ title: 'Sign them out everywhere?', body: `Ends ${account.activeSessions} open session(s). They can sign in again right away.`, cta: 'Sign out everywhere', done: 'They were signed out everywhere.', run: () => api.revokeSessions(account.id) })}>
            Sign out everywhere
          </Button>,
        );
      }
      if (account.mfaEnabled) {
        actions.push(
          <Button
            key="mfa"
            variant="secondary"
            onClick={() => ask({ title: 'Reset two-step verification?', body: 'Use this if they lost their phone. Their authenticator and recovery codes stop working and they’re signed out. Next time they sign in with their password, they set up a new authenticator. Confirm who you’re talking to first.', cta: 'Reset 2-step', done: '2-step verification reset. They’ll set it up again at their next sign-in.', danger: true, run: () => api.resetMfa(account.id) })}
          >
            Reset 2-step
          </Button>,
        );
      }
      actions.push(
        <Button key="suspend" variant="danger" onClick={() => ask({ title: `Suspend ${personName(account)}?`, body: 'They’re signed out immediately and can’t sign in until reactivated. Their history stays in the audit log.', cta: 'Suspend', done: 'Account suspended and signed out.', danger: true, withReason: true, run: (reason) => api.updateAccount(account.id, { status: 'SUSPENDED', reason: reason || undefined }) })}>
          Suspend
        </Button>,
      );
    }
    if (account.status === 'SUSPENDED' && account.hasPassword && account.mfaEnabled) {
      actions.push(
        <Button key="reactivate" onClick={() => ask({ title: `Reactivate ${personName(account)}?`, body: 'They can sign in again with their existing password and authenticator.', cta: 'Reactivate', done: 'Account reactivated.', withReason: true, run: (reason) => api.updateAccount(account.id, { status: 'ACTIVE', reason: reason || undefined }) })}>
          Reactivate
        </Button>,
      );
    }
  }

  return (
    <>
      <PageHeader
        back={
          <Link to="/admins" className="back-link">
            <Icon name="alt-arrow-left" size={16} /> Admin accounts
          </Link>
        }
        title={
          <>
            {personName(account)} {account.role === 'SUPER_ADMIN' ? <Badge tone="deep">Super Admin</Badge> : null}
          </>
        }
        subtitle={account.email}
        actions={<div className="row gap8 wrap">{actions}</div>}
      />
      {isSelf ? <Notice tone="info">This is your own account. Change your password, sessions and 2-step verification from <Link to="/account">My account</Link>; another Super Admin manages your role and status.</Notice> : null}
      {flash ? <Notice tone="good">{flash}</Notice> : null}
      {inviteLink ? (
        <Notice tone="warn" title="New invite link (shown once)">
          <CopyField value={inviteLink.url} label="Invite link" />
          <p className="small">Expires {dateTime(inviteLink.expiresAt)}. Send it privately.</p>
        </Notice>
      ) : null}

      <div className="grid-detail">
        <section className="card">
          <h2>Account</h2>
          <dl className="facts">
            <dt>Status</dt>
            <dd>
              <StatusBadges account={account} />
            </dd>
            <dt>Role</dt>
            <dd>{ROLE_LABEL[account.role]}</dd>
            <dt>2-step verification</dt>
            <dd>{account.mfaEnabled ? 'On' : 'Not set up'}</dd>
            <dt>Open sessions</dt>
            <dd>{account.activeSessions}</dd>
            <dt>Last sign-in</dt>
            <dd title={dateTime(account.lastLoginAt)}>{relative(account.lastLoginAt)}</dd>
            <dt>Invited by</dt>
            <dd>{account.createdBy ? <Link to={`/admins/${account.createdBy.id}`}>{personName(account.createdBy)}</Link> : 'Initial setup (CLI)'}</dd>
            <dt>Created</dt>
            <dd>{dateTime(account.createdAt)}</dd>
            {account.pendingInvite ? (
              <>
                <dt>Invite expires</dt>
                <dd>{dateTime(account.pendingInvite.expiresAt)}</dd>
              </>
            ) : null}
          </dl>
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Municipality access</h2>
            {account.role === 'ADMIN' && !isSelf && account.status !== 'SUSPENDED' ? (
              <Button variant="secondary" onClick={() => setEditingScope(true)}>
                Change
              </Button>
            ) : null}
          </div>
          {account.municipalities === 'ALL' ? (
            <p>All municipalities (Super Admin).</p>
          ) : (
            <div className="tags">
              {account.municipalities.map((m) => (
                <span key={m} className="tag">
                  {m}
                </span>
              ))}
            </div>
          )}
          {scopeHistory.length ? (
            <details className="history">
              <summary>Access history</summary>
              <ul>
                {scopeHistory.map((h, i) => (
                  <li key={i}>
                    <b>{h.municipality}</b> added {dateTime(h.assignedAt)}
                    {h.assignedBy ? ` by ${personName(h.assignedBy)}` : ''}
                    {h.revokedAt ? `, removed ${dateTime(h.revokedAt)}${h.revokedBy ? ` by ${personName(h.revokedBy)}` : ''}` : ''}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      </div>

      {invitedAccounts.length ? (
        <section className="card">
          <h2>People they invited</h2>
          <div className="tags">
            {invitedAccounts.map((p) => (
              <Link key={p.id} to={`/admins/${p.id}`} className="tag tag-link">
                {personName(p)} · {ROLE_LABEL[p.role]}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid-detail">
        <section className="card">
          <div className="card-head">
            <h2>What they did</h2>
            <Link to={`/audit?actor=${account.id}`} className="link-arrow">
              All <Icon name="alt-arrow-right" size={16} />
            </Link>
          </div>
          {byThem.loading ? <Loading /> : <ActivityList entries={byThem.data?.entries.slice(0, 8) ?? []} />}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>Changes to this account</h2>
            <Link to={`/audit?entityType=staff&entityId=${account.id}`} className="link-arrow">
              All <Icon name="alt-arrow-right" size={16} />
            </Link>
          </div>
          {aboutThem.loading ? <Loading /> : <ActivityList entries={aboutThem.data?.entries.slice(0, 8) ?? []} />}
        </section>
      </div>

      {confirm ? <ConfirmModal confirm={confirm} onClose={() => setConfirm(null)} onDone={(msg) => void refreshAll(msg)} /> : null}
      {editingScope ? <ScopeModal account={account} onClose={() => setEditingScope(false)} onDone={() => void refreshAll('Municipality access updated.')} /> : null}
    </>
  );
}

function ConfirmModal({ confirm, onClose, onDone }: { confirm: Confirm; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = useState('');
  const action = useAction();
  return (
    <Modal
      title={confirm.title}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={confirm.danger ? 'danger' : 'primary'}
            busy={action.busy}
            onClick={async () => {
              const ok = await action.run(async () => {
                await confirm.run(reason.trim());
                return true;
              });
              if (ok) {
                onClose();
                onDone(confirm.done);
              }
            }}
          >
            {confirm.cta}
          </Button>
        </>
      }
    >
      <p>{confirm.body}</p>
      {confirm.withReason ? (
        <div className="field">
          <label htmlFor="reason">Reason (saved in the audit log)</label>
          <textarea id="reason" className="input" rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Left the RHU on 15 Oct" />
        </div>
      ) : null}
      <ErrorNotice error={action.error} />
    </Modal>
  );
}

function ScopeModal({ account, onClose, onDone }: { account: Account; onClose: () => void; onDone: () => void }) {
  const [value, setValue] = useState<string[]>(account.municipalities === 'ALL' ? [] : account.municipalities);
  const [reason, setReason] = useState('');
  const action = useAction();
  return (
    <Modal
      title={`Municipality access for ${personName(account)}`}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            busy={action.busy}
            disabled={!value.length}
            onClick={async () => {
              if (await action.run(() => api.updateAccount(account.id, { municipalities: value, reason: reason.trim() || undefined }))) {
                onClose();
                onDone();
              }
            }}
          >
            Save access
          </Button>
        </>
      }
    >
      <MunicipalityPicker value={value} onChange={setValue} error={fieldError(action.error, 'municipalities')} />
      <div className="field">
        <label htmlFor="scope-reason">Reason (optional, saved in the audit log)</label>
        <input id="scope-reason" className="input" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <p className="muted small">Takes effect on their next page load.</p>
      <ErrorNotice error={action.error} />
    </Modal>
  );
}
