import { Link } from 'react-router-dom';
import { api, type Account, type AuditEntry } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { Badge, ErrorNotice, Loading, Notice, PageHeader, useLoad } from '../components/ui';
import { actionLabel, isFailureAction, personName, relative } from '../format';

function greeting(): string {
  const hour = Number(new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', hour12: false }));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home() {
  const me = useMe();
  const isSuper = me.role === 'SUPER_ADMIN';
  const activity = useLoad(() => api.audit({}), []);
  const accounts = useLoad(() => (isSuper ? api.accounts().then((r) => r.accounts) : Promise.resolve([] as Account[])), [isSuper]);

  return (
    <>
      <PageHeader title={`${greeting()}, ${personName(me).split(' ')[0]}`} subtitle={isSuper ? 'You can see every municipality and manage staff access.' : `You’re working in ${me.municipalities === 'ALL' ? 'all municipalities' : me.municipalities.join(', ')}.`} />

      {me.recoveryCodesRemaining <= 3 ? (
        <Notice tone="warn" title={me.recoveryCodesRemaining === 0 ? 'You have no recovery codes left' : `Only ${me.recoveryCodesRemaining} recovery codes left`}>
          If you lose your phone you won’t be able to sign in. <Link to="/account">Make new recovery codes</Link>.
        </Notice>
      ) : null}

      {isSuper ? <StaffSummary accounts={accounts.data} loading={accounts.loading} error={accounts.error} /> : null}

      <section className="card">
        <div className="card-head">
          <h2>{isSuper ? 'Recent activity' : 'Your recent activity'}</h2>
          <Link to="/audit" className="link-arrow">
            Full audit log <Icon name="alt-arrow-right" size={16} />
          </Link>
        </div>
        {activity.loading ? <Loading /> : activity.error ? <ErrorNotice error={activity.error} /> : <ActivityList entries={activity.data?.entries.slice(0, 8) ?? []} />}
      </section>

      <section className="card card-mint">
        <h2>What’s next in this console</h2>
        <p className="muted">
          Phase B adds the operations dashboards: today’s requests and SLA alerts, the shifts board, clients, caregivers, payments and exports, all limited to each Admin’s municipalities. They’ll appear in the sidebar as they go live.
        </p>
      </section>
    </>
  );
}

function StaffSummary({ accounts, loading, error }: { accounts: Account[] | null; loading: boolean; error: unknown }) {
  if (loading) return <Loading />;
  if (error) return <ErrorNotice error={error} />;
  const list = accounts ?? [];
  const tiles = [
    { label: 'Active Admins', value: list.filter((a) => a.role === 'ADMIN' && a.status === 'ACTIVE').length, to: '/admins?role=ADMIN&status=ACTIVE' },
    { label: 'Active Super Admins', value: list.filter((a) => a.role === 'SUPER_ADMIN' && a.status === 'ACTIVE').length, to: '/admins?role=SUPER_ADMIN&status=ACTIVE' },
    { label: 'Invites pending', value: list.filter((a) => a.status === 'INVITED').length, to: '/admins?status=INVITED' },
    { label: 'Suspended', value: list.filter((a) => a.status === 'SUSPENDED').length, to: '/admins?status=SUSPENDED' },
  ];
  const attention = list.filter((a) => a.locked || a.pendingInvite?.awaitingApproval || a.pendingInvite?.expired);
  return (
    <>
      <div className="kpis">
        {tiles.map((t) => (
          <Link key={t.label} to={t.to} className="kpi">
            <span className="kpi-value">{t.value}</span>
            <span className="kpi-label">{t.label}</span>
          </Link>
        ))}
      </div>
      {attention.length ? (
        <section className="card">
          <div className="card-head">
            <h2>Needs your attention</h2>
          </div>
          <ul className="list">
            {attention.map((a) => (
              <li key={a.id}>
                <Link to={`/admins/${a.id}`} className="list-row">
                  <span>{personName(a)}</span>
                  {a.locked ? <Badge tone="bad">Locked out</Badge> : null}
                  {a.pendingInvite?.awaitingApproval ? <Badge tone="warn">Super Admin invite needs approval</Badge> : null}
                  {a.pendingInvite?.expired ? <Badge tone="warn">Invite expired</Badge> : null}
                  <Icon name="alt-arrow-right" size={16} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export function ActivityList({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <p className="muted">No activity yet.</p>;
  return (
    <ul className="activity">
      {entries.map((e) => (
        <li key={e.id}>
          <span className={`dot ${isFailureAction(e.action) ? 'dot-bad' : ''}`} aria-hidden="true" />
          <span className="activity-text">
            <b>{personName(e.actor)}</b> {actionLabel(e.action).toLowerCase()}
          </span>
          <time dateTime={e.createdAt} className="muted small">
            {relative(e.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
