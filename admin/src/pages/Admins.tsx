import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Account, type StaffRole } from '../api';
import { Icon } from '../components/Icon';
import { MunicipalityPicker } from '../components/MunicipalityPicker';
import { Badge, Button, CopyField, ErrorNotice, Field, fieldError, Loading, Modal, Notice, PageHeader, useAction, useLoad } from '../components/ui';
import { dateTime, personName, relative, scopeLabel, STATUS_LABEL } from '../format';

export function StatusBadges({ account }: { account: Account }) {
  return (
    <span className="badges">
      <Badge tone={account.status === 'ACTIVE' ? 'good' : account.status === 'INVITED' ? 'info' : 'bad'}>{STATUS_LABEL[account.status]}</Badge>
      {account.locked ? <Badge tone="bad">Locked</Badge> : null}
      {account.pendingInvite?.awaitingApproval ? <Badge tone="warn">Needs approval</Badge> : null}
      {account.pendingInvite?.expired ? <Badge tone="warn">Invite expired</Badge> : null}
    </span>
  );
}

export function Admins() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const list = useLoad(() => api.accounts().then((r) => r.accounts), []);
  const [inviting, setInviting] = useState(false);
  const q = params.get('q') ?? '';
  const role = params.get('role') ?? '';
  const status = params.get('status') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const rows = useMemo(
    () =>
      (list.data ?? []).filter(
        (a) =>
          (!role || a.role === role) &&
          (!status || a.status === status) &&
          (!q || `${a.fullName} ${a.email} ${a.municipalities === 'ALL' ? '' : a.municipalities.join(' ')}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [list.data, q, role, status],
  );

  return (
    <>
      <PageHeader
        title="Admin accounts"
        subtitle="Invite staff, choose which municipalities each Admin can see, and remove access."
        actions={
          <Button onClick={() => setInviting(true)}>
            Invite staff
          </Button>
        }
      />
      <div className="filters">
        <input className="input" type="search" placeholder="Search name, email or municipality" value={q} onChange={(e) => setFilter('q', e.target.value)} aria-label="Search accounts" />
        <select className="input" value={role} onChange={(e) => setFilter('role', e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <select className="input" value={status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="INVITED">Invited</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>
      {list.loading && !list.data ? (
        <Loading />
      ) : list.error ? (
        <ErrorNotice error={list.error} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Municipalities</th>
                <th>Status</th>
                <th>2-step</th>
                <th>Last sign-in</th>
                <th>Invited by</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="row-link" onClick={() => navigate(`/admins/${a.id}`)}>
                  <td>
                    <Link to={`/admins/${a.id}`} onClick={(e) => e.stopPropagation()} className="strong-link">
                      {personName(a)}
                    </Link>
                    <div className="muted small">{a.email}</div>
                  </td>
                  <td>{a.role === 'SUPER_ADMIN' ? <Badge tone="deep">Super Admin</Badge> : 'Admin'}</td>
                  <td title={a.municipalities === 'ALL' ? undefined : a.municipalities.join(', ')}>{scopeLabel(a.municipalities)}</td>
                  <td>
                    <StatusBadges account={a} />
                  </td>
                  <td>{a.mfaEnabled ? <Badge tone="good">On</Badge> : <span className="muted">Not set up</span>}</td>
                  <td title={dateTime(a.lastLoginAt)}>{relative(a.lastLoginAt)}</td>
                  <td>
                    {a.createdBy ? (
                      <Link to={`/admins/${a.createdBy.id}`} onClick={(e) => e.stopPropagation()}>
                        {personName(a.createdBy)}
                      </Link>
                    ) : (
                      <span className="muted">Setup (CLI)</span>
                    )}
                  </td>
                  <td className="chev">
                    <Icon name="alt-arrow-right" size={16} />
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={8} className="empty">
                    {list.data?.length ? 'No accounts match these filters.' : 'No staff accounts yet.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
      {inviting ? (
        <InviteModal
          onClose={() => setInviting(false)}
          onInvited={() => void list.reload()}
        />
      ) : null}
    </>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('ADMIN');
  const [municipalities, setMunicipalities] = useState<string[]>([]);
  const [result, setResult] = useState<{ url: string; expiresAt: string; awaitingApproval: boolean; account: Account } | null>(null);
  const action = useAction();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await action.run(() => api.invite({ fullName, email, role, municipalities: role === 'ADMIN' ? municipalities : [] }));
    if (res) {
      setResult({ url: res.inviteUrl, expiresAt: res.expiresAt, awaitingApproval: res.awaitingApproval, account: res.account });
      onInvited();
    }
  };

  if (result) {
    return (
      <Modal title="Invite created" onClose={onClose} footer={<Button onClick={onClose}>Done</Button>}>
        <p>
          Send this link to <b>{result.account.email}</b> through a private channel (not a group chat). It works once and expires {dateTime(result.expiresAt)}.
        </p>
        <CopyField value={result.url} label="Invite link" />
        <Notice tone="warn">This link is shown only now. If it’s lost, open the account and send a new link.</Notice>
        {result.awaitingApproval ? <Notice tone="info" title="Needs a second Super Admin">Another Super Admin must approve this invite (from the account page) before the link can be used.</Notice> : null}
      </Modal>
    );
  }

  return (
    <Modal
      title="Invite staff"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" busy={action.busy} disabled={role === 'ADMIN' && municipalities.length === 0}>
            Create invite
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} className="stack16">
        <div className="grid2">
          <Field label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required error={fieldError(action.error, 'fullName')} />
          <Field label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required error={fieldError(action.error, 'email')} />
        </div>
        <fieldset className="field">
          <legend>Role</legend>
          <div className="role-options">
            <label className={`role-option ${role === 'ADMIN' ? 'selected' : ''}`}>
              <input type="radio" name="role" checked={role === 'ADMIN'} onChange={() => setRole('ADMIN')} />
              <span>
                <b>Admin</b>
                <span className="muted small">Runs day-to-day operations in the municipalities you choose.</span>
              </span>
            </label>
            <label className={`role-option ${role === 'SUPER_ADMIN' ? 'selected' : ''}`}>
              <input type="radio" name="role" checked={role === 'SUPER_ADMIN'} onChange={() => setRole('SUPER_ADMIN')} />
              <span>
                <b>Super Admin</b>
                <span className="muted small">Sees everything and manages staff. Needs a second Super Admin to approve.</span>
              </span>
            </label>
          </div>
        </fieldset>
        {role === 'ADMIN' ? <MunicipalityPicker value={municipalities} onChange={setMunicipalities} error={fieldError(action.error, 'municipalities')} /> : null}
        <ErrorNotice error={action.error} />
      </form>
    </Modal>
  );
}

