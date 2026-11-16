import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Candidate, type PaymentMethod, type RequestDetail } from '../api';
import { METHOD_LABEL, money } from '../format';
import { Badge, Button, ErrorNotice, Field, Loading, Modal, Notice, useAction, useLoad } from './ui';

type Open = null | 'assign' | 'escalate' | 'cancel' | 'unassign' | 'payment' | 'payout';

/**
 * Staff actions on one request (P1). Buttons appear only when the server would allow them;
 * the server checks again (status, scope, eligibility) and records every action in the audit log.
 */
export function RequestActions({ detail, onChanged }: { detail: RequestDetail; onChanged: (message: string) => void }) {
  const [open, setOpen] = useState<Open>(null);
  const r = detail.request;
  const paid = detail.payments.some((p) => p.status === 'SUCCEEDED');
  const s = r.status;
  const can = {
    assign: ['REQUESTED', 'MATCHING', 'ESCALATED', 'CONFIRMED'].includes(s),
    escalate: ['REQUESTED', 'MATCHING', 'CONFIRMED'].includes(s),
    cancel: ['REQUESTED', 'MATCHING', 'CONFIRMED', 'ESCALATED'].includes(s),
    unassign: ['CONFIRMED', 'ESCALATED'].includes(s) && !!detail.caregiver,
    payment: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED'].includes(s) && !paid,
    payout: s === 'COMPLETED' && !r.payoutPaidAt,
  };
  const done = (msg: string) => {
    setOpen(null);
    onChanged(msg);
  };
  // One highlighted next step: assign → (caregiver clocks in/out in the app) → payment → payout.
  const next: Open = !detail.caregiver && can.assign ? 'assign' : can.payment ? 'payment' : can.payout ? 'payout' : null;

  if (!Object.values(can).some(Boolean)) return null;
  return (
    <section className="card">
      <h2>Next step</h2>
      <div className="row gap8 wrap">
        {next === 'assign' ? <Button onClick={() => setOpen('assign')}>Assign caregiver</Button> : null}
        {next === 'payment' ? <Button onClick={() => setOpen('payment')}>Record payment</Button> : null}
        {next === 'payout' ? <Button onClick={() => setOpen('payout')}>Mark payout sent</Button> : null}
        {can.assign && detail.caregiver ? (
          <Button variant="secondary" onClick={() => setOpen('assign')}>
            Change caregiver
          </Button>
        ) : null}
        {can.unassign ? (
          <Button variant="secondary" onClick={() => setOpen('unassign')}>
            Remove caregiver
          </Button>
        ) : null}
        {can.payout && next !== 'payout' ? (
          <Button variant="secondary" onClick={() => setOpen('payout')}>
            Mark payout sent
          </Button>
        ) : null}
        {can.escalate ? (
          <Button variant="secondary" onClick={() => setOpen('escalate')}>
            Flag for coordinator
          </Button>
        ) : null}
        {can.cancel ? (
          <Button variant="danger" onClick={() => setOpen('cancel')}>
            Cancel request
          </Button>
        ) : null}
      </div>

      {open === 'assign' ? <AssignModal requestId={r.id} onClose={() => setOpen(null)} onDone={done} /> : null}
      {open === 'escalate' ? (
        <ReasonModal
          title="Flag for a coordinator"
          body="Use this when no caregiver can be found in time or something needs a coordinator’s attention. The family isn’t told the reason."
          cta="Flag"
          danger
          onClose={() => setOpen(null)}
          run={(reason) => api.requestAction(r.id, { action: 'escalate', reason })}
          onDone={() => done('Flagged for a coordinator.')}
        />
      ) : null}
      {open === 'cancel' ? (
        <ReasonModal
          title="Cancel this request"
          body="The family gets an email with this reason, so write it for them."
          cta="Cancel request"
          danger
          onClose={() => setOpen(null)}
          run={(reason) => api.requestAction(r.id, { action: 'cancel', reason })}
          onDone={(res) => done(res && 'familyEmail' in res && res.familyEmail === 'sent' ? 'Cancelled. The family was emailed.' : 'Cancelled.')}
        />
      ) : null}
      {open === 'unassign' ? (
        <ReasonModal
          title="Remove the caregiver"
          body="The request goes back to matching so you can choose someone else."
          cta="Remove caregiver"
          optional
          onClose={() => setOpen(null)}
          run={(reason) => api.requestAction(r.id, { action: 'unassign', reason: reason || undefined })}
          onDone={() => done('Caregiver removed. Assign someone else.')}
        />
      ) : null}
      {open === 'payment' ? <PaymentModal requestId={r.id} amount={r.grossRate} onClose={() => setOpen(null)} onDone={() => done('Payment recorded.')} /> : null}
      {open === 'payout' ? <PayoutModal requestId={r.id} amount={r.caregiverPayout} caregiver={detail.caregiver?.name ?? 'the caregiver'} onClose={() => setOpen(null)} onDone={() => done('Payout marked as sent.')} /> : null}
    </section>
  );
}

function AssignModal({ requestId, onClose, onDone }: { requestId: string; onClose: () => void; onDone: (msg: string) => void }) {
  const list = useLoad(() => api.candidates(requestId).then((r) => r.candidates), [requestId]);
  const action = useAction();
  const [showAll, setShowAll] = useState(false);
  const shown = (list.data ?? []).filter((c) => showAll || c.eligible);
  const hidden = (list.data ?? []).length - (list.data ?? []).filter((c) => c.eligible).length;

  const pick = async (c: Candidate) => {
    const res = await action.run(() => api.assign(requestId, c.id));
    if (res) onDone(`${c.fullName ?? 'Caregiver'} assigned. The request is confirmed${res.familyEmail === 'sent' ? ' and the family was emailed' : ''}.`);
  };

  return (
    <Modal title="Assign a caregiver" onClose={onClose} wide>
      <p className="muted small">Best matches first: accredited, right badge, free at that time, in the same municipality.</p>
      <ErrorNotice error={action.error} />
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorNotice error={list.error} />
      ) : !shown.length ? (
        <Notice tone="warn" title="No one can take this shift">
          {hidden ? 'Every caregiver in your municipalities has a blocker. Show all to see why, or add a caregiver.' : 'No caregivers in your municipalities yet.'} <Link to="/caregivers?add=1">Add a caregiver</Link>
        </Notice>
      ) : (
        <ul className="list">
          {shown.map((c) => (
            <li key={c.id} className="list-row candidate">
              <span>
                <b>{c.fullName ?? 'Unnamed'}</b> {c.current ? <Badge tone="info">Current</Badge> : null}
                <span className="cell-sub">
                  {c.barangay ? `Brgy. ${c.barangay}, ` : ''}
                  {c.municipality} · {c.totalShiftsCompleted} shifts{c.averageRating ? ` · ★ ${c.averageRating.toFixed(1)}` : ''}
                  {c.phone ? ` · ${c.phone}` : ''}
                </span>
                {c.blockers.map((b) => (
                  <span key={b} className="cell-sub reason-bad">
                    ✕ {b}
                  </span>
                ))}
                {c.warnings.map((w) => (
                  <span key={w} className="cell-sub reason-warn">
                    ! {w}
                  </span>
                ))}
              </span>
              <Button variant={c.eligible ? 'primary' : 'secondary'} disabled={!c.eligible || c.current} busy={action.busy} onClick={() => void pick(c)}>
                {c.current ? 'Assigned' : 'Assign'}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 ? (
        <button type="button" className="link-btn small" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide caregivers who can’t take it' : `Show ${hidden} who can’t take it, and why`}
        </button>
      ) : null}
    </Modal>
  );
}

function ReasonModal<T>({ title, body, cta, danger, optional, onClose, run, onDone }: { title: string; body: string; cta: string; danger?: boolean; optional?: boolean; onClose: () => void; run: (reason: string) => Promise<T>; onDone: (res: T) => void }) {
  const [reason, setReason] = useState('');
  const action = useAction();
  const tooShort = !optional && reason.trim().length < 5;
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            busy={action.busy}
            disabled={tooShort}
            onClick={async () => {
              const res = await action.run(() => run(reason.trim()));
              if (res !== undefined) onDone(res);
            }}
          >
            {cta}
          </Button>
        </>
      }
    >
      <p>{body}</p>
      <div className="field">
        <label htmlFor="action-reason">Reason{optional ? ' (optional)' : ''}</label>
        <textarea id="action-reason" className="input" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <ErrorNotice error={action.error} />
    </Modal>
  );
}

function PaymentModal({ requestId, amount, onClose, onDone }: { requestId: string; amount: number; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const action = useAction();
  const needsRef = method !== 'CASH';
  return (
    <Modal
      title={`Record payment of ${money(amount)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button
            busy={action.busy}
            disabled={needsRef && !reference.trim()}
            onClick={async () => {
              if (await action.run(() => api.recordPayment(requestId, { method, providerReference: reference.trim() || undefined }))) onDone();
            }}
          >
            Record payment
          </Button>
        </>
      }
    >
      <p className="muted small">Record money you actually received. The amount is the fixed rate for this service.</p>
      <div className="field">
        <label htmlFor="pay-method">How did the family pay?</label>
        <select id="pay-method" className="input" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {Object.entries(METHOD_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <Field label={needsRef ? 'Reference number' : 'Receipt or note (optional)'} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} required={needsRef} />
      <ErrorNotice error={action.error} />
    </Modal>
  );
}

function PayoutModal({ requestId, amount, caregiver, onClose, onDone }: { requestId: string; amount: number; caregiver: string; onClose: () => void; onDone: () => void }) {
  const [reference, setReference] = useState('');
  const action = useAction();
  return (
    <Modal
      title={`Pay ${caregiver} ${money(amount)}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Back
          </Button>
          <Button
            busy={action.busy}
            onClick={async () => {
              if (await action.run(() => api.markPayout(requestId, reference.trim()))) onDone();
            }}
          >
            Mark as sent
          </Button>
        </>
      }
    >
      <p>Mark the caregiver’s 80% share as paid, after you’ve sent it.</p>
      <Field label="GCash/bank reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} />
      <ErrorNotice error={action.error} />
    </Modal>
  );
}
