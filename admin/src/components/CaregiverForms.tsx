import { useEffect, useState, type FormEvent } from 'react';
import { api, type Badge as BadgeName, type CaregiverDetail } from '../api';
import { useMe } from '../auth';
import { Button, ErrorNotice, Field, fieldError, Modal, useAction, useLoad } from './ui';

export const BADGE_OPTIONS: { value: BadgeName; label: string; hint: string }[] = [
  { value: 'BADGE_ADL', label: 'ADL', hint: 'Home care: bathing, meals, mobility (needed for ₱300 home shifts)' },
  { value: 'BADGE_CVMC_WATCHER', label: 'CVMC watcher', hint: 'Hospital bedside watcher (needed for ₱500 CVMC shifts)' },
];

/** Municipalities this staff member may add caregivers in. */
function useScopeMunicipalities(): string[] {
  const me = useMe();
  const all = useLoad(() => (me.municipalities === 'ALL' ? api.municipalities().then((r) => r.municipalities) : Promise.resolve(me.municipalities)), [me.municipalities]);
  return all.data ?? [];
}

export function AddCaregiverModal({ onClose, onAdded }: { onClose: () => void; onAdded: (id: string) => void }) {
  const municipalities = useScopeMunicipalities();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', municipality: '', barangay: '', badges: ['BADGE_ADL'] as BadgeName[], isAccredited: false });
  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const action = useAction();
  useEffect(() => {
    if (!form.municipality && municipalities.length === 1) set({ municipality: municipalities[0]! });
  }, [municipalities, form.municipality]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await action.run(() => api.createCaregiver({ ...form, phone: form.phone.replace(/\s/g, '') }));
    if (res) onAdded(res.id);
  };

  return (
    <Modal
      title="Add a caregiver"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-caregiver" busy={action.busy} disabled={!form.municipality}>
            Add caregiver
          </Button>
        </>
      }
    >
      <form id="add-caregiver" onSubmit={submit} className="stack16">
        <div className="grid2">
          <Field label="Full name" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} required error={fieldError(action.error, 'fullName')} />
          <Field label="Mobile number" inputMode="tel" placeholder="09171234567" value={form.phone} onChange={(e) => set({ phone: e.target.value })} required error={fieldError(action.error, 'phone')} />
        </div>
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set({ email: e.target.value })}
          required
          hint="They sign in to the AdvanCare app with this email to see their shifts."
          error={fieldError(action.error, 'email')}
        />
        <div className="grid2">
          <div className="field">
            <label htmlFor="cg-muni">Municipality</label>
            <select id="cg-muni" className="input" value={form.municipality} onChange={(e) => set({ municipality: e.target.value })} required>
              <option value="">Choose</option>
              {municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <Field label="Barangay" value={form.barangay} onChange={(e) => set({ barangay: e.target.value })} required error={fieldError(action.error, 'barangay')} />
        </div>
        <BadgePicker value={form.badges} onChange={(badges) => set({ badges })} />
        <label className="check">
          <input type="checkbox" checked={form.isAccredited} onChange={(e) => set({ isAccredited: e.target.checked })} />
          Accredited (finished the 40-hour training)
        </label>
        <p className="muted small">New caregivers start as not available. They (or you) switch that on when they can take shifts.</p>
        <ErrorNotice error={action.error} />
      </form>
    </Modal>
  );
}

function BadgePicker({ value, onChange }: { value: BadgeName[]; onChange: (v: BadgeName[]) => void }) {
  return (
    <fieldset className="field">
      <legend>Badges</legend>
      <div className="toggles">
        {BADGE_OPTIONS.map((b) => (
          <label key={b.value} className="check">
            <input type="checkbox" checked={value.includes(b.value)} onChange={() => onChange(value.includes(b.value) ? value.filter((x) => x !== b.value) : [...value, b.value])} />
            <span>
              <b>{b.label}</b> <span className="muted small">· {b.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Accreditation, availability, badges and account status for one caregiver. */
export function ManageCaregiver({ caregiver, onSaved }: { caregiver: CaregiverDetail['caregiver']; onSaved: (msg: string) => void }) {
  const [form, setForm] = useState({ isAccredited: caregiver.isAccredited, isAvailable: caregiver.isAvailable, active: caregiver.accountActive, badges: caregiver.badges as BadgeName[] });
  const action = useAction();
  const changed =
    form.isAccredited !== caregiver.isAccredited ||
    form.isAvailable !== caregiver.isAvailable ||
    form.active !== caregiver.accountActive ||
    [...form.badges].sort().join() !== [...caregiver.badges].sort().join();
  return (
    <section className="card">
      <h2>Manage</h2>
      <div className="toggles">
        <label className="check">
          <input type="checkbox" checked={form.isAccredited} onChange={(e) => setForm((f) => ({ ...f, isAccredited: e.target.checked }))} />
          Accredited (finished training; can be assigned)
        </label>
        <label className="check">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))} />
          Available for new shifts
        </label>
        <label className="check">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
          App account active (unticking signs them out of caregiver mode)
        </label>
      </div>
      <BadgePicker value={form.badges} onChange={(badges) => setForm((f) => ({ ...f, badges }))} />
      <ErrorNotice error={action.error} />
      <div>
        <Button
          disabled={!changed}
          busy={action.busy}
          onClick={async () => {
            const change = {
              ...(form.isAccredited !== caregiver.isAccredited ? { isAccredited: form.isAccredited } : {}),
              ...(form.isAvailable !== caregiver.isAvailable ? { isAvailable: form.isAvailable } : {}),
              ...(form.active !== caregiver.accountActive ? { active: form.active } : {}),
              badges: form.badges,
            };
            if (await action.run(() => api.updateCaregiver(caregiver.id, change))) onSaved('Caregiver updated.');
          }}
        >
          Save changes
        </Button>
      </div>
    </section>
  );
}
