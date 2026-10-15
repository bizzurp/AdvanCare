// Real integration boundary. Only contracts specified in the Pilot MVP prompt pack are called;
// everything else resolves to a local "saved-demo" result with the matching dependency note,
// so the UI never claims a request reached a provider when it did not.
import { DEPENDENCIES } from '../data/catalog';
import type { ClientProfile, RequestStatus, ServiceKind, ServiceRequest } from '../data/types';

export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');
export const isDemoMode = API_BASE === '';
export const DEMO_OTP = '999123';

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown, token?: string, idempotencyKey?: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Backend envelope (ADV-CORE-001): { error: { code, message, requestId } }
      const message = (data as { error?: { message?: string } }).error?.message;
      throw new ApiError(message ?? 'Something went wrong. Please try again.', res.status);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('We could not reach AdvanCare. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Auth: ADV-AUTH-001 (6-digit code by email; SMS can replace the delivery later) ----------
export async function requestOtp(email: string): Promise<void> {
  if (isDemoMode) {
    await wait(500);
    return;
  }
  await post('/api/v1/auth/request-otp', { email });
}

export interface AuthResult {
  accessToken: string;
  demo: boolean;
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResult> {
  if (isDemoMode) {
    await wait(500);
    if (otp !== DEMO_OTP) throw new ApiError('That code is incorrect. Check the email and try again.', 401);
    return { accessToken: 'demo', demo: true };
  }
  const r = await post<{ accessToken: string }>('/api/v1/auth/verify-otp', { email, otp });
  return { accessToken: r.accessToken, demo: false };
}

export async function signOutRemote(token?: string): Promise<void> {
  if (isDemoMode || !token) return;
  await post('/api/v1/auth/sign-out', {}, token).catch(() => undefined);
}

// ---------- Client profile copy (the server needs it before a booking) ----------
export const DEMO_PROFILE_ID = 'demo-client-1';

/** Copies the profile kept on this phone to the server (create or update, keyed by its id here). */
export async function syncClient(profile: ClientProfile, token?: string): Promise<string> {
  if (profile.id === DEMO_PROFILE_ID) throw new ApiError('Finish registering the client first (More → Create an account), then try again.', 409);
  const r = await post<{ clientId: string }>(
    '/api/v1/clients/sync',
    {
      deviceRef: profile.id,
      fullName: profile.fullName,
      dateOfBirth: profile.dateOfBirth || '',
      gender: profile.gender || undefined,
      municipality: profile.municipality,
      barangay: profile.barangay,
      sitio: profile.sitio || undefined,
      landmarkNotes: profile.landmarkNotes || undefined,
      philhealthId: profile.philhealthId || undefined,
      // Only what the family actually entered (no placeholder values).
      clinical: {
        conditions: profile.conditions,
        mobility: profile.mobility || undefined,
        allergies: profile.allergies && profile.allergies !== 'None known' ? profile.allergies : undefined,
      },
      family: profile.family.map((f) => ({ name: f.name, relationship: f.relationship, phone: f.phone, isPrimary: f.isPrimary, isRemoteSponsor: f.isRemoteSponsor, location: f.location || undefined })),
    },
    token,
  );
  return r.clientId;
}

// ---------- Service requests ----------
type Contract = (p: Record<string, unknown>) => { path: string; body: unknown };

/** Service kinds with a specified backend contract (ADV-BOOK-001). */
const CONTRACTS: Partial<Record<ServiceKind, Contract>> = {
  'home-caregiver': (p) => ({
    path: '/api/v1/shifts/request',
    body: {
      clientId: p.clientId,
      shiftTier: 'BGAY_HOME_300',
      scheduledDate: p.scheduledDate,
      scheduledStartTime: p.scheduledStartTime,
      locationDetails: p.locationDetails,
    },
  }),
  'cvmc-caregiver': (p) => ({
    path: '/api/v1/shifts/request',
    body: {
      clientId: p.clientId,
      shiftTier: 'CVMC_INSTITUTIONAL_500',
      scheduledDate: p.scheduledDate,
      scheduledStartTime: p.scheduledStartTime,
      locationDetails: p.locationDetails,
    },
  }),
};

const KIND_DEPENDENCY: Record<ServiceKind, string> = {
  telehealth: DEPENDENCIES.telehealth,
  rhu: DEPENDENCIES.rhu,
  triage: DEPENDENCIES.triage,
  prescription: DEPENDENCIES.prescription,
  transport: DEPENDENCIES.transport,
  'home-caregiver': DEPENDENCIES.caregiver,
  'cvmc-caregiver': DEPENDENCIES.caregiver,
};

export interface SubmitResult {
  status: RequestStatus;
  dependencyNote?: string;
  /** The server's id for the booking, used to follow its status. */
  serverId?: string;
}

export async function submitServiceRequest(req: ServiceRequest, token?: string, profile?: ClientProfile): Promise<SubmitResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'queued' };
  await wait(300);
  if (isDemoMode) return { status: 'saved-demo', dependencyNote: `${DEPENDENCIES.api} ${KIND_DEPENDENCY[req.kind]}` };
  const contract = CONTRACTS[req.kind];
  if (!contract) return { status: 'saved-demo', dependencyNote: KIND_DEPENDENCY[req.kind] };
  if (!token) throw new ApiError('Please sign in again to send this request.', 401);
  // Keep the server's copy of the client up to date (address, family) before booking.
  if (profile) await syncClient(profile, token);
  const { path, body } = contract(req.payload);
  const r = await post<{ id: string }>(path, body, token, req.idempotencyKey);
  return { status: 'submitted', serverId: r.id };
}

// ---------- Live status of bookings (GET /api/v1/shifts/mine) ----------
export type ServerShiftStatus = 'REQUESTED' | 'MATCHING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';

export interface ServerShift {
  id: string;
  ref: string;
  status: ServerShiftStatus;
  scheduledDate: string;
  scheduledStartTime: string;
  caregiverFirstName: string | null;
  updatedAt: string;
}

const SERVER_STATUS: Record<ServerShiftStatus, RequestStatus> = {
  REQUESTED: 'submitted',
  MATCHING: 'submitted',
  ESCALATED: 'submitted',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};
export const appStatus = (s: ServerShiftStatus): RequestStatus => SERVER_STATUS[s];

export async function myShifts(token: string): Promise<ServerShift[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/api/v1/shifts/mine`, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
    if (!res.ok) throw new ApiError('Could not refresh request status.', res.status);
    return ((await res.json()) as { shifts: ServerShift[] }).shifts;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Care Assistant (backend /api/v1/assistant/chat) ----------
export interface AssistantTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AssistantAnswer {
  reply: string;
  link: { to: string; label: string } | null;
  emergency: boolean;
  allowed: boolean;
}

/** General AdvanCare questions only. Personal data stays on the device and is answered locally. */
export async function askAssistant(turns: AssistantTurn[], token?: string): Promise<AssistantAnswer> {
  return post<AssistantAnswer>('/api/v1/assistant/chat', { messages: turns.slice(-12) }, token);
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
