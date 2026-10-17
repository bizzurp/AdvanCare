import { useEffect, useState, type FormEvent } from 'react';
import { api, type ProviderDetail } from '../api';
import { useMe } from '../auth';
import { Button, ErrorNotice, Field, fieldError, Modal, useAction, useLoad } from './ui';

/** Municipalities this staff member may add providers in. */
export function useScopeMunicipalities(): string[] {
  const me = useMe();
  const all = useLoad(() => (me.municipalities === 'ALL' ? api.municipalities().then((r) => r.municipalities) : Promise.resolve(me.municipalities)), [me.municipalities]);
  return all.data ?? [];
}

const DOCTOR_SPECIALTIES = [
  'General Practice',
  'Family Medicine',
  'Internal Medicine',
  'Pediatrics',
  'Geriatrics',
  'Obstetrics & Gynecology',
  'Cardiology',
];

const VEHICLE_TYPES = [
  'Non-emergency transport vehicle',
  'Stretcher Van',
  'Wheelchair Accessible Van',
  'Sedan',
  'Tricycle (Local Rural)',
];

export function AddDoctorModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const municipalities = useScopeMunicipalities();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    municipality: '',
    barangay: '',
    specialty: DOCTOR_SPECIALTIES[0]!,
    licenseNumber: '',
    isAccredited: true,
  });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const action = useAction();

  useEffect(() => {
    if (!form.municipality && municipalities.length === 1) set({ municipality: municipalities[0]! });
  }, [municipalities, form.municipality]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await action.run(() =>
      api.createProvider({
        ...form,
        type: 'DOCTOR',
        phone: form.phone.replace(/\s/g, ''),
      }),
    );
    if (res) onAdded(res.id);
  };

  return (
    <Modal
      title="Add a Teleconsultant / Doctor"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-doctor" busy={action.busy} disabled={!form.municipality}>
            Add doctor
          </Button>
        </>
      }
    >
      <form id="add-doctor" onSubmit={submit} className="stack16">
        <div className="grid2">
          <Field label="Doctor's full name" placeholder="Dr. Maria Santos" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} required error={fieldError(action.error, 'fullName')} />
          <Field label="Mobile number" inputMode="tel" placeholder="09171234567" value={form.phone} onChange={(e) => set({ phone: e.target.value })} required error={fieldError(action.error, 'phone')} />
        </div>
        <div className="grid2">
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            required
            hint="Used for teleconsultation notifications and sign-in."
            error={fieldError(action.error, 'email')}
          />
          <Field label="PRC License number" placeholder="0123456" value={form.licenseNumber} onChange={(e) => set({ licenseNumber: e.target.value })} error={fieldError(action.error, 'licenseNumber')} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="doc-spec">Specialty</label>
            <select id="doc-spec" className="input" value={form.specialty} onChange={(e) => set({ specialty: e.target.value })} required>
              {DOCTOR_SPECIALTIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="doc-muni">Primary Municipality</label>
            <select id="doc-muni" className="input" value={form.municipality} onChange={(e) => set({ municipality: e.target.value })} required>
              <option value="">Choose</option>
              {municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Field label="Barangay / Clinic address" value={form.barangay} onChange={(e) => set({ barangay: e.target.value })} error={fieldError(action.error, 'barangay')} />
        <label className="check">
          <input type="checkbox" checked={form.isAccredited} onChange={(e) => set({ isAccredited: e.target.checked })} />
          Accredited for AdvanCare TeleHealth consultations
        </label>
        <ErrorNotice error={action.error} />
      </form>
    </Modal>
  );
}

export function AddDriverModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const me = useMe();
  const isSuper = me.role === 'SUPER_ADMIN';
  const municipalities = useScopeMunicipalities();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    municipality: '',
    barangay: '',
    vehicleType: VEHICLE_TYPES[0]!,
    plateNumber: '',
    isAccredited: true,
  });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const action = useAction();

  useEffect(() => {
    if (!form.municipality && municipalities.length === 1) set({ municipality: municipalities[0]! });
  }, [municipalities, form.municipality]);

  if (isSuper) {
    return (
      <Modal title="Transport Drivers" onClose={onClose}>
        <p className="muted">Transport drivers are managed directly by local municipal admins for their specific municipality.</p>
      </Modal>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await action.run(() =>
      api.createProvider({
        ...form,
        type: 'TRANSPORT_DRIVER',
        phone: form.phone.replace(/\s/g, ''),
      }),
    );
    if (res) onAdded(res.id);
  };

  return (
    <Modal
      title="Add a Transport Operator / Driver"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-driver" busy={action.busy} disabled={!form.municipality}>
            Add driver
          </Button>
        </>
      }
    >
      <form id="add-driver" onSubmit={submit} className="stack16">
        <div className="grid2">
          <Field label="Driver full name" placeholder="Juan dela Cruz" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} required error={fieldError(action.error, 'fullName')} />
          <Field label="Mobile number" inputMode="tel" placeholder="09171234567" value={form.phone} onChange={(e) => set({ phone: e.target.value })} required error={fieldError(action.error, 'phone')} />
        </div>
        <div className="grid2">
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            required
            hint="Used for transport dispatch notifications."
            error={fieldError(action.error, 'email')}
          />
          <Field label="Plate number / Conduction sticker" placeholder="ABC 1234" value={form.plateNumber} onChange={(e) => set({ plateNumber: e.target.value })} required error={fieldError(action.error, 'plateNumber')} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="drv-veh">Vehicle Type</label>
            <select id="drv-veh" className="input" value={form.vehicleType} onChange={(e) => set({ vehicleType: e.target.value })} required>
              {VEHICLE_TYPES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="drv-muni">Primary Municipality</label>
            <select id="drv-muni" className="input" value={form.municipality} onChange={(e) => set({ municipality: e.target.value })} required>
              <option value="">Choose</option>
              {municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Field label="Barangay / Terminal base" value={form.barangay} onChange={(e) => set({ barangay: e.target.value })} error={fieldError(action.error, 'barangay')} />
        <label className="check">
          <input type="checkbox" checked={form.isAccredited} onChange={(e) => set({ isAccredited: e.target.checked })} />
          Accredited for non-emergency medical transport (NEMT)
        </label>
        <ErrorNotice error={action.error} />
      </form>
    </Modal>
  );
}

/** Manage accreditation, availability, account status and vehicle/license details for one provider. */
export function ManageProvider({ provider, onSaved }: { provider: ProviderDetail['provider']; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({
    isAccredited: provider.isAccredited,
    isAvailable: provider.isAvailable,
    active: provider.accountActive,
    specialty: provider.specialty ?? '',
    licenseNumber: provider.licenseNumber ?? '',
    vehicleType: provider.vehicleType ?? '',
    plateNumber: provider.plateNumber ?? '',
  });
  const action = useAction();
  const isDoctor = provider.type === 'DOCTOR';
  const changed =
    form.isAccredited !== provider.isAccredited ||
    form.isAvailable !== provider.isAvailable ||
    form.active !== provider.accountActive ||
    form.specialty !== (provider.specialty ?? '') ||
    form.licenseNumber !== (provider.licenseNumber ?? '') ||
    form.vehicleType !== (provider.vehicleType ?? '') ||
    form.plateNumber !== (provider.plateNumber ?? '');

  return (
    <section className="card">
      <h2>Manage {isDoctor ? 'Doctor' : 'Driver'}</h2>
      <div className="toggles">
        <label className="check">
          <input type="checkbox" checked={form.isAccredited} onChange={(e) => setForm((f) => ({ ...f, isAccredited: e.target.checked }))} />
          Accredited (verified credentials; eligible for assignment)
        </label>
        <label className="check">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
          Available for new bookings / dispatches
        </label>
        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          Account active (unticking disables provider access)
        </label>
      </div>

      <div className="grid2 mt16">
        {isDoctor ? (
          <>
            <Field label="Specialty" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} />
            <Field label="PRC License number" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
          </>
        ) : (
          <>
            <Field label="Vehicle type" value={form.vehicleType} onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))} />
            <Field label="Plate number" value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))} />
          </>
        )}
      </div>

      <ErrorNotice error={action.error} />
      <div className="mt16">
        <Button
          disabled={!changed}
          busy={action.busy}
          onClick={async () => {
            const change: Record<string, unknown> = {
              isAccredited: form.isAccredited,
              isAvailable: form.isAvailable,
              active: form.active,
              ...(isDoctor
                ? { specialty: form.specialty || undefined, licenseNumber: form.licenseNumber || undefined }
                : { vehicleType: form.vehicleType || undefined, plateNumber: form.plateNumber || undefined }),
            };
            if (await action.run(() => api.updateProvider(provider.id, change))) {
              onSaved('Provider updated.');
            }
          }}
        >
          Save changes
        </Button>
      </div>
    </section>
  );
}
