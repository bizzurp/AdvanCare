import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useMe } from '../auth';
import { Icon } from '../components/Icon';
import { Pagination, ScopeNote, useUrlFilters } from '../components/ops';
import { AddDoctorModal } from '../components/ProviderForms';
import { Badge, Button, ErrorNotice, Loading, PageHeader, useLoad } from '../components/ui';

const KEYS = ['q', 'municipality', 'available'] as const;

export function TelehealthDoctors() {
  const me = useMe();
  const navigate = useNavigate();
  const f = useUrlFilters(KEYS);
  const list = useLoad(() => api.providers({ ...f.values, type: 'DOCTOR', page: String(f.page) }), [f.key]);
  const [params] = useSearchParams();
  const [addingDoctor, setAddingDoctor] = useState(params.get('add') === 'doctor');

  return (
    <>
      <PageHeader
        title="Telehealth Doctors"
        subtitle={
          <>
            Physicians, teleconsultants and medical specialists · Super Admin · <ScopeNote municipalities={me.municipalities} />
          </>
        }
        actions={
          <Button onClick={() => setAddingDoctor(true)}>
            Add doctor
          </Button>
        }
      />

      {addingDoctor ? <AddDoctorModal onClose={() => setAddingDoctor(false)} onAdded={(id) => navigate(`/providers/${id}?added=1`)} /> : null}

      <div className="filters">
        <input
          className="input"
          type="search"
          placeholder="Search by doctor name or specialty"
          value={f.values.q}
          onChange={(e) => f.set('q', e.target.value)}
          aria-label="Search doctors"
        />
        <select className="input" value={f.values.available} onChange={(e) => f.set('available', e.target.value)} aria-label="Availability">
          <option value="">Any availability</option>
          <option value="yes">Available</option>
          <option value="no">Not available</option>
        </select>
        {f.active ? (
          <Button variant="quiet" onClick={f.clear}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {list.error ? <ErrorNotice error={list.error} /> : null}
      {!list.data ? (
        list.loading ? <Loading /> : null
      ) : (
        <div className={list.loading ? 'refetching' : undefined}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Physician Name</th>
                  <th>Specialty / PRC License</th>
                  <th>Municipality</th>
                  <th>Accredited</th>
                  <th>Available</th>
                  <th className="num">Active jobs</th>
                  <th className="num">Total jobs</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {list.data.providers.map((p) => (
                  <tr key={p.id} className="row-link" onClick={() => navigate(`/providers/${p.id}`)}>
                    <td>
                      <Link to={`/providers/${p.id}`} className="strong-link" onClick={(e) => e.stopPropagation()}>
                        Dr. {p.fullName}
                      </Link>
                      <span className="cell-sub">{p.phone ?? ''}</span>
                    </td>
                    <td>
                      {p.specialty ?? 'General Practice'}
                      {p.licenseNumber ? <span className="cell-sub">PRC: {p.licenseNumber}</span> : null}
                    </td>
                    <td>
                      {p.barangay ? `Brgy. ${p.barangay}, ` : ''}
                      {p.municipality}
                    </td>
                    <td>{p.isAccredited ? <Badge tone="good">Yes</Badge> : <Badge tone="warn">Pending</Badge>}</td>
                    <td>{p.isAvailable ? <Badge tone="good">Available</Badge> : <span className="muted">No</span>}</td>
                    <td className="num">{p.activeRequests}</td>
                    <td className="num">{p.totalRequests}</td>
                    <td className="chev">
                      <Icon name="alt-arrow-right" size={16} />
                    </td>
                  </tr>
                ))}
                {!list.data.providers.length ? (
                  <tr>
                    <td colSpan={8} className="empty">
                      {f.active ? 'No doctors match these filters.' : 'No doctors registered in your municipalities yet.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} onPage={(page) => f.set('page', String(page))} />
        </div>
      )}
    </>
  );
}
