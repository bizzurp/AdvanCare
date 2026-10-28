import { useState } from 'react';
import { AttachmentPicker, attachmentFiles, type AttachmentMeta } from '../components/Scheduling';
import { ActionBar, Banner, Button, ChoiceGroup, ChoiceRow, DependencyNote, PageHeader, Screen, Segmented, TextArea } from '../components/ui';
import { DEPENDENCIES, MEMBER_DISCOUNT, memberPrice, peso, SUPPLIES, SUPPLY_CATEGORIES, type SupplyCategory } from '../data/catalog';
import { ApiError, uploadFile } from '../services/api';
import { useApp, useDraft } from '../state/AppState';
import { useSubmitRequest } from './requestUtils';

// ---------------- Discounted pharmacy & supplies ----------------
interface SuppliesDraft {
  /** Item id → quantity. */
  cart: Record<string, number>;
  fulfillment: 'pickup' | 'delivery';
  notes: string;
  attachment?: AttachmentMeta;
}

const SUPPLIES_KEY = 'supplies';
const suppliesInit = (): SuppliesDraft => ({ cart: {}, fulfillment: 'pickup', notes: '' });
const MAX_QTY = 20;

export function Supplies() {
  const [d, set, clear] = useDraft<SuppliesDraft>(SUPPLIES_KEY, suppliesInit);
  const [category, setCategory] = useState<SupplyCategory>('vitamins');
  const { submit, submitting, error } = useSubmitRequest();
  const { session } = useApp();
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const lines = SUPPLIES.filter((s) => (d.cart[s.id] ?? 0) > 0).map((s) => ({ ...s, qty: d.cart[s.id]!, member: memberPrice(s.price) }));
  const regular = lines.reduce((n, l) => n + l.price * l.qty, 0);
  const total = lines.reduce((n, l) => n + l.member * l.qty, 0);
  const needsRx = lines.some((l) => l.rx);
  const setQty = (id: string, qty: number) => {
    set({ cart: { ...d.cart, [id]: Math.max(0, Math.min(MAX_QTY, qty)) } });
    setErr('');
  };

  return (
    <Screen>
      <PageHeader title="Pharmacy & supplies" back="/services" />
      <div className="screen-body stack gap-24">
        <div>
          <h2 className="t-h2">
            Medicines and supplies,
            <br />
            at member prices.
          </h2>
          <p className="t-body t-muted mt-8">
            Save {Math.round(MEMBER_DISCOUNT * 100)}% on vitamins, maintenance medicines and care supplies, including items outside PhilHealth YAKAP.
          </p>
        </div>
        <Segmented label="Category" value={category} onChange={setCategory} options={SUPPLY_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
        <ul className="stack gap-12" style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label={SUPPLY_CATEGORIES.find((c) => c.id === category)?.label}>
          {SUPPLIES.filter((s) => s.category === category).map((s) => {
            const qty = d.cart[s.id] ?? 0;
            return (
              <li key={s.id} className="card row between gap-12" style={{ padding: 14, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="t-medium">
                    {s.name}
                    {s.rx && (
                      <span className="t-caption t-teal t-semibold" style={{ marginLeft: 6 }}>
                        Rx
                      </span>
                    )}
                  </div>
                  <div className="t-caption t-muted">{s.pack}</div>
                  <div className="t-small mt-4">
                    <span className="t-semibold t-teal">{peso(memberPrice(s.price))}</span>{' '}
                    <s className="t-caption t-muted" aria-label={`Regular price ${peso(s.price)}`}>
                      {peso(s.price)}
                    </s>
                  </div>
                </div>
                <div className="row gap-8" style={{ alignItems: 'center', flexShrink: 0 }}>
                  <button type="button" className="chip" onClick={() => setQty(s.id, qty - 1)} disabled={qty === 0} aria-label={`Remove one ${s.name}`}>
                    −
                  </button>
                  <span className="t-semibold" style={{ minWidth: 20, textAlign: 'center' }} aria-live="polite" aria-label={`${qty} in order`}>
                    {qty}
                  </span>
                  <button type="button" className="chip" onClick={() => setQty(s.id, qty + 1)} disabled={qty >= MAX_QTY} aria-label={`Add one ${s.name}`}>
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {needsRx && (
          <section className="stack gap-12">
            <h3 className="t-section">Prescription</h3>
            <p className="t-small t-muted" style={{ marginTop: -8 }}>
              Medicines marked Rx need a valid prescription. Add a photo now, or the care team will ask for it.
            </p>
            <AttachmentPicker draftKey={SUPPLIES_KEY} value={d.attachment} onChange={(attachment) => set({ attachment })} label="Choose how to add your prescription." />
          </section>
        )}
        <section className="stack gap-12">
          <h3 className="t-section">How will you get it?</h3>
          <ChoiceGroup label="Fulfillment">
            <ChoiceRow icon="medical-kit" title="Pick up at the barangay health center" desc="Your BHW lets you know when it arrives" selected={d.fulfillment === 'pickup'} onSelect={() => set({ fulfillment: 'pickup' })} />
            <ChoiceRow icon="bus" title="Home delivery" desc="Delivery fee confirmed by the care team" selected={d.fulfillment === 'delivery'} onSelect={() => set({ fulfillment: 'delivery' })} />
          </ChoiceGroup>
        </section>
        <TextArea label="Notes for the pharmacy (optional)" placeholder="Brand preference, size, or other items you need" value={d.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={500} />
        <div className="card card-mint stack gap-8">
          <div className="row between">
            <span className="t-medium">Your order</span>
            <span className="t-small t-muted">
              {lines.reduce((n, l) => n + l.qty, 0)} item{lines.reduce((n, l) => n + l.qty, 0) === 1 ? '' : 's'}
            </span>
          </div>
          {lines.map((l) => (
            <div key={l.id} className="row between t-small">
              <span>
                {l.qty} × {l.name}
              </span>
              <span>{peso(l.member * l.qty)}</span>
            </div>
          ))}
          {lines.length > 0 && (
            <div className="row between t-small t-teal">
              <span>Member savings</span>
              <span>−{peso(regular - total)}</span>
            </div>
          )}
          <div className="row between">
            <span className="t-medium">Estimated total</span>
            <span className="price" style={{ fontSize: 24, color: 'var(--teal)' }}>
              {peso(total)}
            </span>
          </div>
          <p className="t-caption t-muted">Estimate only. The care team confirms the final price and stock before you pay by cash or GCash.</p>
        </div>
        <DependencyNote title="How this works">{DEPENDENCIES.supplies}</DependencyNote>
        {err && <Banner tone="error">{err}</Banner>}
        {error && <Banner tone="error">{error}</Banner>}
      </div>
      <ActionBar>
        <Button
          loading={submitting || uploading}
          onClick={async () => {
            if (!lines.length) {
              setErr('Add at least one item to your order.');
              return;
            }
            // Connected: upload the prescription photo first, then attach it to the order by id.
            let uploadIds: string[] = [];
            const file = needsRx ? attachmentFiles.get(SUPPLIES_KEY) : undefined;
            if (file && session) {
              setUploading(true);
              setErr('');
              try {
                uploadIds = [await uploadFile(file, session.accessToken)];
              } catch (e) {
                setErr(e instanceof ApiError ? e.message : 'The photo could not be uploaded.');
                return;
              } finally {
                setUploading(false);
              }
            }
            const count = lines.reduce((n, l) => n + l.qty, 0);
            const fulfillment = d.fulfillment === 'pickup' ? 'Pickup at barangay health center' : 'Home delivery';
            void submit({
              kind: 'supplies',
              summary: `${count} item${count === 1 ? '' : 's'} · est. ${peso(total)}`,
              details: [
                ...lines.map((l) => ({ label: `${l.qty} × ${l.name}`, value: `${peso(l.member * l.qty)} (${l.pack})`, icon: 'document-medicine' as const })),
                { label: 'Estimated total', value: `${peso(total)} (you save ${peso(regular - total)})`, icon: 'shield-check' },
                { label: 'Fulfillment', value: fulfillment, icon: d.fulfillment === 'pickup' ? 'medical-kit' : 'bus' },
                ...(needsRx ? [{ label: 'Prescription', value: d.attachment?.name ?? 'To follow', icon: 'document-text' as const }] : []),
                ...(d.notes.trim() ? [{ label: 'Notes', value: d.notes.trim(), icon: 'document-text' as const }] : []),
              ],
              payload: {
                items: lines.map((l) => ({ id: l.id, name: l.name, pack: l.pack, qty: l.qty, unitPrice: l.price, memberPrice: l.member, rx: !!l.rx })),
                regularTotal: regular,
                estimatedTotal: total,
                discount: MEMBER_DISCOUNT,
                fulfillment: d.fulfillment,
                notes: d.notes.trim(),
                ...(needsRx ? { attachment: d.attachment } : {}),
                uploadIds,
              },
              onDone: () => {
                attachmentFiles.delete(SUPPLIES_KEY);
                clear();
              },
            });
          }}
        >
          {lines.length ? `Place order · ${peso(total)}` : 'Place order'}
        </Button>
      </ActionBar>
    </Screen>
  );
}
