import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DetailItem, ServiceKind, ServiceRequest } from '../data/types';
import { ApiError, submitServiceRequest, uuid } from '../services/api';
import { useApp } from '../state/AppState';

const month = (d: Date, style: 'short' | 'long') => d.toLocaleDateString('en-PH', { month: style });

/** "16 Oct 2026 · 10:00 AM" — matches the design's date style. */
export function formatWhen(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${month(d, 'short')} ${d.getFullYear()} · ${formatTime(iso)}`;
}

/** "16 October 2026" */
export function formatDay(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  return `${d.getDate()} ${month(d, 'long')} ${d.getFullYear()}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "9:00 AM" + "2026-10-16" -> Date (local time). */
export function combine(date: string, time12: string) {
  const [, hh, mm, ap] = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time12.trim()) ?? [];
  let h = Number(hh ?? 9) % 12;
  if ((ap ?? 'AM').toUpperCase() === 'PM') h += 12;
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, h, Number(mm ?? 0));
}

/** Creates the request, attempts the real submission, stores the honest result. */
export function useSubmitRequest() {
  const navigate = useNavigate();
  const { addRequest, profile, session } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (input: { kind: ServiceKind; summary: string; details: DetailItem[]; scheduledFor?: string; payload: Record<string, unknown>; draftKey?: string; onDone?: () => void }) => {
    setSubmitting(true);
    setError('');
    const req: ServiceRequest = {
      id: uuid(),
      kind: input.kind,
      clientName: profile.fullName,
      createdAt: new Date().toISOString(),
      scheduledFor: input.scheduledFor,
      status: 'queued',
      summary: input.summary,
      details: input.details,
      payload: { clientId: profile.id, ...input.payload },
      idempotencyKey: uuid(),
    };
    try {
      const res = await submitServiceRequest(req, session?.accessToken, profile);
      addRequest({ ...req, status: res.status, dependencyNote: res.dependencyNote, serverId: res.serverId });
      input.onDone?.();
      navigate(`/request-received/${req.id}`, { replace: false });
    } catch (e) {
      // Form data is kept (drafts) so the person can retry without retyping.
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return { submit, submitting, error };
}
