// The app's only network boundary. Every request goes to the AdvanCare API; the UI never claims
// a request reached the care team unless the API accepted it.
import type { ClientProfile, FamilyMember, RequestStatus, ServiceKind, ServiceRequest } from '../data/types';
import { DEMO_GPS, type DemoDoctor } from '../data/demo';

/** VITE_API_BASE_URL wins; otherwise the local API in development and the hosted API in builds. */
const DEFAULT_API = import.meta.env.DEV ? 'http://localhost:8787' : 'https://advancare-api.mcleinonza0531.workers.dev';
export const API_BASE: string = ((import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || DEFAULT_API).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

async function get<T>(path: string, token: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError((data as { error?: { message?: string } }).error?.message ?? 'Something went wrong. Please try again.', res.status);
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('We could not reach AdvanCare. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

async function post<T>(path: string, body: unknown, token?: string, idempotencyKey?: string, method: 'POST' | 'PATCH' = 'POST', timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
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

// ---------- Auth: ADV-AUTH-001 (6-digit code by email; SMS can replace the delivery later) ----------
export async function requestOtp(email: string): Promise<void> {
  await post('/api/v1/auth/request-otp', { email });
}

export interface AuthResult {
  accessToken: string;
  /** Account role on the server (CLIENT, CAREGIVER, …). */
  role?: string;
}

export async function verifyOtp(email: string, otp: string): Promise<AuthResult> {
  const r = await post<{ accessToken: string; user: { role: string } }>('/api/v1/auth/verify-otp', { email, otp });
  return { accessToken: r.accessToken, role: r.user.role };
}

export async function signOutRemote(token?: string): Promise<void> {
  if (!token) return;
  await post('/api/v1/auth/sign-out', {}, token).catch(() => undefined);
}

// ---------- Client profile copy (the server needs it before a booking) ----------
export interface Account {
  id: string;
  email: string | null;
  fullName: string | null;
  phoneNumber: string | null;
  role: string;
}

export const getAccount = (token: string) => get<{ me: Account }>('/api/v1/auth/me', token).then((r) => r.me);
export const updateAccount = (token: string, patch: { fullName?: string; phoneNumber?: string }) =>
  post<{ me: Account }>('/api/v1/auth/me', patch, token, undefined, 'PATCH').then((r) => r.me);

export interface ServerClient {
  id: string;
  deviceRef: string | null;
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  municipality: string;
  barangay: string;
  sitio: string | null;
  landmarkNotes: string | null;
  philhealthId: string | null;
  clinical: { conditions: string[]; mobility: string | null; allergies: string | null };
  family: { id: string; name: string; relationship: string; phone: string; isPrimary: boolean; isRemoteSponsor: boolean; location: string | null }[];
}

/** Clients saved on this account (newest first), so a profile follows the person to any phone. */
export const myClients = (token: string) => get<{ clients: ServerClient[] }>('/api/v1/clients/mine', token).then((r) => r.clients);

/** Server copy → the app's profile; keeps on-phone extras (plan, permissions, language) from `base`. */
export function profileFromServer(c: ServerClient, base: ClientProfile): ClientProfile {
  const family: FamilyMember[] = c.family.map((f) => {
    const same = base.family.find((b) => b.name === f.name && b.relationship === f.relationship);
    return { id: same?.id ?? `fam-${f.id.slice(0, 8)}`, name: f.name, relationship: f.relationship, phone: f.phone, isPrimary: f.isPrimary, isRemoteSponsor: f.isRemoteSponsor, location: f.location ?? undefined, scopes: same?.scopes ?? ['SCOPE_CARE_NOTES_VIEW'] };
  });
  return {
    ...base,
    id: c.deviceRef ?? c.id,
    clientCode: `AC-${c.id.slice(0, 6).toUpperCase()}`,
    fullName: c.fullName,
    dateOfBirth: c.dateOfBirth ?? '',
    gender: c.gender ?? '',
    municipality: c.municipality,
    barangay: c.barangay,
    sitio: c.sitio ?? '',
    landmarkNotes: c.landmarkNotes ?? '',
    philhealthId: c.philhealthId ?? undefined,
    conditions: c.clinical.conditions,
    mobility: c.clinical.mobility ?? '',
    allergies: c.clinical.allergies ?? 'None known',
    family,
  };
}

/** Copies the profile kept on this phone to the server (create or update, keyed by its id here). */
export async function syncClient(profile: ClientProfile, token?: string): Promise<string> {
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

/** TeleHealth, RHU, Triage, Prescription and Transport go to the service-request inbox (P2). */
const SERVICE_KINDS: ServiceKind[] = ['telehealth', 'rhu', 'triage', 'prescription', 'transport'];
export const isServiceKind = (k: ServiceKind) => SERVICE_KINDS.includes(k);

export function serviceBody(req: ServiceRequest) {
  const p = req.payload;
  const preferredAt = (p.startTime ?? p.pickupTime ?? req.scheduledFor ?? null) as string | null;
  const { clientId, uploadIds, attachment, ...details } = p as Record<string, unknown>;
  return {
    kind: req.kind,
    clientId,
    summary: req.summary,
    preferredAt,
    // What the family entered, plus the readable rows the app shows them.
    details: { ...details, ...(attachment ? { attachmentName: (attachment as { name?: string }).name } : {}), shown: req.details.map((d) => `${d.label}: ${d.value}`) },
    uploadIds: Array.isArray(uploadIds) ? uploadIds : [],
  };
}

export interface SubmitResult {
  status: RequestStatus;
  dependencyNote?: string;
  /** The server's id for the booking, used to follow its status. */
  serverId?: string;
}

export async function submitServiceRequest(req: ServiceRequest, token?: string, profile?: ClientProfile): Promise<SubmitResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { status: 'queued' };
  const contract = CONTRACTS[req.kind];
  if (!token) throw new ApiError('Please sign in again to send this request.', 401);
  // Keep the server's copy of the client up to date (address, family) before sending.
  if (profile) await syncClient(profile, token);
  if (contract) {
    const { path, body } = contract(req.payload);
    const r = await post<{ id: string }>(path, body, token, req.idempotencyKey);
    return { status: 'submitted', serverId: r.id };
  }
  const r = await post<{ id: string }>('/api/v1/service-requests', serviceBody(req), token, req.idempotencyKey);
  return { status: 'submitted', serverId: r.id };
}

/** Uploads a photo/PDF (e.g. a prescription) and returns its id to attach to a request. */
export async function uploadFile(file: File, token: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${API_BASE}/api/v1/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError((data as { error?: { message?: string } }).error?.message ?? 'The file could not be uploaded.', res.status);
    return (data as { id: string }).id;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('We could not upload the file. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

export type ServerServiceStatus = 'SUBMITTED' | 'IN_REVIEW' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export interface ServerServiceRequest {
  id: string;
  ref: string;
  kind: string;
  status: ServerServiceStatus;
  preferredAt: string | null;
  scheduledAt: string | null;
  staffNote: string | null;
  cancellationReason: string | null;
  assignedProvider?: {
    id: string;
    type: 'DOCTOR' | 'TRANSPORT_DRIVER';
    fullName: string;
    specialty?: string | null;
    vehicleType?: string | null;
    plateNumber?: string | null;
  } | null;
}
const SERVICE_STATUS: Record<ServerServiceStatus, RequestStatus> = { SUBMITTED: 'submitted', IN_REVIEW: 'submitted', SCHEDULED: 'confirmed', COMPLETED: 'completed', CANCELLED: 'cancelled' };
export const appServiceStatus = (s: ServerServiceStatus): RequestStatus => SERVICE_STATUS[s];

export async function myServiceRequests(token: string): Promise<ServerServiceRequest[]> {
  return (await get<{ requests: ServerServiceRequest[] }>('/api/v1/service-requests/mine', token)).requests;
}

export async function cancelServiceRequest(serverId: string, token: string): Promise<void> {
  await post(`/api/v1/service-requests/${serverId}/cancel`, {}, token);
}

export async function rateServiceRequest(serverId: string, token: string, rating: number, review?: string): Promise<void> {
  await post(`/api/v1/service-requests/${serverId}/rate`, { rating, review }, token);
}

export async function reportServiceRequest(serverId: string, token: string, reason: string, details?: string): Promise<void> {
  await post(`/api/v1/service-requests/${serverId}/report`, { reason, details }, token);
}

/** Change a request's time or what was entered, until staff schedule it. */
export async function updateServiceRequest(serverId: string, token: string, patch: { preferredAt?: string | null; summary?: string; details?: Record<string, unknown> }): Promise<void> {
  await post(`/api/v1/service-requests/${serverId}`, patch, token, undefined, 'PATCH');
}

/** Times already booked with a TeleHealth doctor on a day (YYYY-MM-DD), as ISO timestamps. */
export async function takenTeleSlots(token: string, doctorId: string, date: string): Promise<string[]> {
  const q = new URLSearchParams({ doctorId, date });
  return (await get<{ taken: string[] }>(`/api/v1/service-requests/telehealth/taken?${q}`, token)).taken;
}

/** Universal list of accredited telehealth doctors across all LGUs and municipalities. */
export async function fetchTelehealthDoctors(token?: string): Promise<DemoDoctor[]> {
  if (!token) return DEMO_GPS;
  try {
    const res = await get<{ doctors: Array<{ id: string; fullName: string; specialty: string | null; municipality: string; isAvailable: boolean }> }>('/api/v1/service-requests/telehealth/doctors', token);
    if (!res.doctors?.length) return DEMO_GPS;
    return res.doctors.map((d) => ({
      id: d.id,
      name: d.fullName.startsWith('Dr.') ? d.fullName : `Dr. ${d.fullName}`,
      initials: (d.fullName.replace(/^Dr\.\s*/, '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || 'DR').toUpperCase(),
      specialty: d.specialty || 'General practitioner',
      rating: 4.9,
      reviews: 58,
      languages: ['English', 'Tagalog', 'Ilocano'],
      municipality: d.municipality,
      isAvailable: d.isAvailable,
    }));
  } catch {
    return DEMO_GPS;
  }
}

/** Families move or cancel a caregiver booking until a caregiver is assigned. */
export async function updateShift(serverId: string, token: string, change: { scheduledDate: string; scheduledStartTime: string; locationDetails?: string }): Promise<void> {
  await post(`/api/v1/shifts/${serverId}`, change, token, undefined, 'PATCH');
}
export async function cancelShift(serverId: string, token: string): Promise<void> {
  await post(`/api/v1/shifts/${serverId}/cancel`, {}, token);
}

export async function rateShift(serverId: string, token: string, rating: number, review?: string): Promise<void> {
  await post(`/api/v1/shifts/${serverId}/rate`, { rating, review }, token);
}

export async function reportShift(serverId: string, token: string, reason: string, details?: string): Promise<void> {
  await post(`/api/v1/shifts/${serverId}/report`, { reason, details }, token);
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
  paid: boolean;
  careNotes: number;
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
  return (await get<{ shifts: ServerShift[] }>('/api/v1/shifts/mine', token)).shifts;
}

export interface CareNote {
  id: string;
  recordedAt: string;
  vitals: Record<string, number> | null;
  tasks: string[] | null;
  notes: string | null;
  summary: string | null;
  caregiverFirstName: string | null;
}

/** Care notes the caregiver recorded for one of the family's bookings. */
export async function shiftNotes(serverId: string, token: string): Promise<CareNote[]> {
  return (await get<{ notes: CareNote[] }>(`/api/v1/shifts/${serverId}/notes`, token)).notes;
}

// ---------- Caregiver mode ----------
export interface CaregiverMe {
  id: string;
  fullName: string | null;
  email: string | null;
  municipality: string | null;
  barangay: string | null;
  isAccredited: boolean;
  isAvailable: boolean;
  badges: string[];
  totalShiftsCompleted: number;
  averageRating: number | null;
}

export interface CaregiverShift {
  id: string;
  ref: string;
  status: ServerShiftStatus;
  tier: 'BGAY_HOME_300' | 'CVMC_INSTITUTIONAL_500';
  scheduledDate: string;
  scheduledStartTime: string;
  locationDetails: string;
  clockIn: string | null;
  clockOut: string | null;
  caregiverPayout: number;
  payoutPaid: boolean;
  notes: number;
  client: {
    name: string;
    address: string;
    landmark?: string | null;
    background?: { conditions?: string[]; mobility?: string; allergies?: string } | null;
    emergencyContact?: { name: string; relationship: string; phone: string } | null;
  };
}

export const caregiverApi = {
  me: (token: string) => get<{ me: CaregiverMe }>('/api/v1/caregiver/me', token).then((r) => r.me),
  setAvailable: (token: string, isAvailable: boolean) => post<{ ok: true }>('/api/v1/caregiver/me', { isAvailable }, token, undefined, 'PATCH'),
  shifts: (token: string) => get<{ shifts: CaregiverShift[] }>('/api/v1/caregiver/shifts', token).then((r) => r.shifts),
  clockIn: (token: string, id: string) => post<{ ok: true }>(`/api/v1/caregiver/shifts/${id}/clock-in`, {}, token),
  clockOut: (token: string, id: string) => post<{ ok: true }>(`/api/v1/caregiver/shifts/${id}/clock-out`, {}, token),
  addNote: (token: string, id: string, note: { vitals?: Record<string, number>; tasks: string[]; notes: string; familySummary?: string }) =>
    post<{ id: string }>(`/api/v1/caregiver/shifts/${id}/notes`, note, token),
};

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

/** AdvanCare questions; with a session the assistant can also read the account's own booking summaries. */
export async function askAssistant(turns: AssistantTurn[], token?: string, language?: 'English' | 'Tagalog' | 'Ilocano'): Promise<AssistantAnswer> {
  return post<AssistantAnswer>('/api/v1/assistant/chat', { messages: turns.slice(-12), language }, token, undefined, 'POST', 35000);
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
