import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { ManageProvider } from '../components/ProviderForms';
import { Badge, ErrorNotice, Loading, Notice, PageHeader, useLoad } from '../components/ui';
import { dateTime, SERVICE_KIND_LABEL, SERVICE_STATUS } from '../format';

export function ProviderDetail() {
  const me = useMe();
  const isSuper = me.role === 'SUPER_ADMIN';
  const { id = '' } = useParams();
  const detail = useLoad(() => api.provider(id), [id]);
  const [params] = useSearchParams();
  const [flash, setFlash] = useState<string | null>(
    params.get('added') ? 'Provider added. Verify their credentials and ensure they are marked Available for assignments.' : null,
  );

  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error || !detail.data) return <ErrorNotice error={detail.error} />;

  const { provider: p, requests, stats } = detail.data;
  const isDoctor = p.type === 'DOCTOR';

  if (isDoctor && !isSuper) {
    return (
      <div className="card">
        <h1>Access restricted</h1>
        <p className="muted">Only Super Admins can view and manage doctor profiles.</p>
        <Link to="/drivers">Back to Transport Drivers</Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        back={
          <Link to={isDoctor ? '/telehealth' : '/drivers'} className="back-link">
            <Icon name="alt-arrow-left" size={16} /> {isDoctor ? 'Telehealth Doctors' : 'Transport Drivers'}
          </Link>
        }
        title={isDoctor ? `Dr. ${p.fullName}` : p.fullName}
        subtitle={`${isDoctor ? 'Teleconsultant / Doctor' : 'Transport Operator / Driver'} · ${[p.barangay ? `Brgy. ${p.barangay}` : null, p.municipality].filter(Boolean).join(', ')}`}
      />

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Active assignments</span>
          <span className="kpi-value">{stats.activeCount}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Completed jobs</span>
          <span className="kpi-value">{stats.completedCount}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Total assigned</span>
          <span className="kpi-value">{stats.totalCount}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Availability</span>
          <span className="kpi-value">
            {p.isAvailable ? <Badge tone="good">Available</Badge> : <Badge tone="warn">Unavailable</Badge>}
          </span>
        </div>
      </div>

      <section className="card">
        <h2>Profile & Credentials</h2>
        <dl className="facts">
          <dt>Contact</dt>
          <dd>
            {p.phone ?? '—'} {p.email ? <span className="muted small">· {p.email}</span> : null}
          </dd>
          {isDoctor ? (
            <>
              <dt>Specialization</dt>
              <dd>{p.specialty ?? 'General Practice'}</dd>
              <dt>PRC License</dt>
              <dd>{p.licenseNumber ? `PRC #${p.licenseNumber}` : 'Pending verification'}</dd>
            </>
          ) : (
            <>
              <dt>Vehicle Type</dt>
              <dd>{p.vehicleType ?? 'Transport Vehicle'}</dd>
              <dt>Plate Number</dt>
              <dd>{p.plateNumber ?? 'Pending'}</dd>
            </>
          )}
          <dt>Accreditation</dt>
          <dd>{p.isAccredited ? 'Accredited' : 'Pending accreditation'}</dd>
          <dt>Account status</dt>
          <dd>{p.accountActive ? 'Active' : 'Disabled'}</dd>
          <dt>Joined</dt>
          <dd>{dateTime(p.createdAt)}</dd>
        </dl>
      </section>

      {flash ? <Notice tone="good">{flash}</Notice> : null}

      <ManageProvider
        key={`${p.isAccredited}${p.isAvailable}${p.accountActive}${p.specialty}${p.vehicleType}${p.plateNumber}`}
        provider={p}
        onSaved={(msg) => {
          setFlash(msg);
          void detail.reload();
        }}
      />

      <section className="card">
        <h2>Assigned Requests</h2>
        {requests.length ? (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const m = SERVICE_STATUS[r.status] ?? { label: r.status, tone: 'neutral' as const };
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link to={`/services/${r.id}`}>{r.ref}</Link>
                      </td>
                      <td>{SERVICE_KIND_LABEL[r.kind] ?? r.kind}</td>
                      <td>
                        <Link to={`/clients/${r.client.id}`}>{r.client.name}</Link>
                        <span className="cell-sub">
                          {r.barangay ? `Brgy. ${r.barangay}, ` : ''}
                          {r.municipality}
                        </span>
                      </td>
                      <td className="nowrap">{r.scheduledAt ? dateTime(r.scheduledAt) : r.preferredAt ? `Wants ${dateTime(r.preferredAt)}` : '—'}</td>
                      <td>
                        <Badge tone={m.tone}>{m.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No service requests assigned to this provider yet.</p>
        )}
      </section>
    </>
  );
}
