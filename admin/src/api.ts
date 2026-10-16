/** The only network boundary of the admin app. Every call carries the session cookie and the CSRF header. */

const BASE = `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/api/v1/admin`;

export type StaffRole = 'ADMIN' | 'SUPER_ADMIN';
export type StaffStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';
export type Scope = string[] | 'ALL';

export interface Me {
  id: string;
  fullName: string | null;
  email: string;
  role: StaffRole;
  municipalities: Scope;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  recoveryCodesRemaining: number;
}

export interface PersonRef {
  id: string;
  fullName: string | null;
}

export interface Account {
  id: string;
  fullName: string | null;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  mfaEnabled: boolean;
  hasPassword: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  createdBy: PersonRef | null;
  municipalities: Scope;
  activeSessions: number;
  pendingInvite: { id: string; expiresAt: string; expired: boolean; awaitingApproval: boolean; invitedByUserId: string | null } | null;
}

export interface ScopeHistoryEntry {
  municipality: string;
  assignedAt: string;
  revokedAt: string | null;
  assignedBy: PersonRef | null;
  revokedBy: PersonRef | null;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  municipality: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  requestId: string | null;
  actor: (PersonRef & { email: string | null }) | null;
}

export interface Session {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
}

export type ShiftStatus = 'REQUESTED' | 'MATCHING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
export type ShiftTier = 'BGAY_HOME_300' | 'CVMC_INSTITUTIONAL_500';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'GCASH' | 'MAYA' | 'CASH' | 'BANK_TRANSFER';
export interface Ref {
  id: string;
  name: string;
}
export interface Paged {
  total: number;
  page: number;
  pageSize: number;
}

export interface RequestRow {
  id: string;
  ref: string;
  createdAt: string;
  status: ShiftStatus;
  tier: ShiftTier;
  scheduledDate: string;
  scheduledStartTime: string;
  grossRate: number;
  client: Ref;
  barangay: string;
  municipality: string;
  caregiver: Ref | null;
}

export interface AlertRow {
  id: string;
  ref: string;
  createdAt: string;
  updatedAt: string;
  status: ShiftStatus;
  tier: ShiftTier;
  scheduledDate: string;
  scheduledStartTime: string;
  client: Ref;
  barangay: string;
  municipality: string;
}

export interface MunicipalityOverview {
  municipality: string;
  district: string;
  requests: number;
  waiting: number;
  inProgress: number;
  completed: number;
  availableCaregivers: number;
  revenue: number;
}

export interface Overview {
  range: number;
  from: string;
  kpis: {
    requests: number;
    requestsToday: number;
    waiting: number;
    inProgress: number;
    escalated: number;
    confirmedUpcoming: number;
    completed: number;
    cancelled: number;
    revenue: number;
    payouts: number;
    margin: number;
    clientsServed: number;
    clientsRegistered: number;
    servicesOpen: number;
    servicesNew: number;
    caregivers: { total: number; accredited: number; available: number };
  };
  daily: { day: string; requests: number }[];
  byService: { tier: ShiftTier; requests: number }[];
  byStatus: { status: ShiftStatus; requests: number }[];
  byMunicipality: MunicipalityOverview[];
  alerts: { waiting: AlertRow[]; escalated: AlertRow[] };
}

export interface RequestDetail {
  request: {
    id: string;
    ref: string;
    status: ShiftStatus;
    tier: ShiftTier;
    createdAt: string;
    updatedAt: string;
    scheduledDate: string;
    scheduledStartTime: string;
    durationHours: number;
    locationDetails: string;
    grossRate: number;
    caregiverPayout: number;
    platformMargin: number;
    clockIn: string | null;
    clockOut: string | null;
    cancelledAt: string | null;
    cancellationReason: string | null;
    escalationReason: string | null;
    payoutPaidAt: string | null;
    payoutReference: string | null;
    careNotes: number;
  };
  client: { id: string; name: string; sitio: string | null; barangay: string; municipality: string; landmarkNotes: string | null };
  requestedBy: { name: string | null; role: string; phone: string | null };
  caregiver: { id: string; name: string; badges: string[]; isAccredited: boolean } | null;
  payments: PaymentLite[];
  history: AuditEntry[];
}

export interface PaymentLite {
  id: string;
  ref: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  providerReference: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface ShiftCard {
  id: string;
  ref: string;
  status: ShiftStatus;
  tier: ShiftTier;
  scheduledStartTime: string;
  clockIn: string | null;
  clockOut: string | null;
  client: Ref;
  barangay: string;
  municipality: string;
  caregiver: Ref | null;
}

export interface ClientRow {
  id: string;
  fullName: string;
  sitio: string | null;
  barangay: string;
  municipality: string;
  createdAt: string;
  phone: string | null;
  openRequests: number;
  totalRequests: number;
  lastRequestAt: string | null;
}

export interface ClientDetail {
  client: {
    id: string;
    fullName: string;
    age: number | null;
    gender: string | null;
    sitio: string | null;
    barangay: string;
    municipality: string;
    landmarkNotes: string | null;
    createdAt: string;
    idsOnFile: { philhealth: boolean; yakap: boolean; pwd: boolean; senior: boolean };
    hasClinicalBaseline: boolean;
  };
  account: { fullName: string | null; role: string; phone: string | null } | null;
  family: { id: string; name: string; relationship: string; phone: string | null; isEmergencyContact: boolean; isRemoteSponsor: boolean; location: string | null; notificationChannel: string; hasAccount: boolean }[];
  requests: { id: string; ref: string; createdAt: string; status: ShiftStatus; tier: ShiftTier; scheduledDate: string; grossRate: number; caregiver: Ref | null }[];
  summary: { totalRequests: number; openRequests: number; completed: number; spent: number };
}

export interface ClinicalRecord {
  clinicalBaseline: unknown;
  careNotes: { id: string; shiftId: string; ref: string; recordedAt: string; vitalsRecorded: unknown; tasksCompleted: unknown; rawCaregiverNotes: string | null; familySummary: string | null; caregiverName: string | null }[];
}

export interface CaregiverRow {
  id: string;
  fullName: string | null;
  phone: string | null;
  barangay: string | null;
  municipality: string | null;
  isAccredited: boolean;
  isAvailable: boolean;
  badges: string[];
  averageRating: number | null;
  totalShiftsCompleted: number;
  activeShifts: number;
}

export interface CaregiverDetail {
  caregiver: CaregiverRow & { sitio: string | null; accountActive: boolean; createdAt: string };
  shifts: { id: string; ref: string; status: ShiftStatus; tier: ShiftTier; scheduledDate: string; clockIn: string | null; clockOut: string | null; caregiverPayout: number; barangay: string; client: Ref }[];
  earnings: { completedShifts: number; payouts: number; upcoming: number };
}

export interface PaymentRow extends PaymentLite {
  request: { id: string; ref: string; tier: ShiftTier; status: ShiftStatus };
  split: { gross: number; caregiver: number; platform: number };
  client: Ref;
  municipality: string;
  caregiver: Ref | null;
}

export type ExportTable = 'requests' | 'payouts' | 'payments';

export type ServiceKind = 'telehealth' | 'rhu' | 'triage' | 'prescription' | 'transport';
export type ServiceStatus = 'SUBMITTED' | 'IN_REVIEW' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type ProviderType = 'DOCTOR' | 'TRANSPORT_DRIVER';

export interface ProviderRow {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  type: ProviderType;
  municipality: string;
  barangay: string | null;
  specialty: string | null;
  licenseNumber: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  isAvailable: boolean;
  isAccredited: boolean;
  isActive: boolean;
  activeRequests: number;
  totalRequests: number;
}

export interface ProviderCandidate {
  id: string;
  fullName: string | null;
  phone: string | null;
  type: ProviderType;
  municipality: string | null;
  barangay: string | null;
  specialty: string | null;
  licenseNumber: string | null;
  vehicleType: string | null;
  plateNumber: string | null;
  eligible: boolean;
  current: boolean;
  warnings: string[];
  blockers: string[];
}

export interface ProviderDetail {
  provider: {
    id: string;
    userId: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    type: ProviderType;
    municipality: string;
    barangay: string | null;
    specialty: string | null;
    licenseNumber: string | null;
    vehicleType: string | null;
    plateNumber: string | null;
    isAvailable: boolean;
    isAccredited: boolean;
    accountActive: boolean;
    createdAt: string;
  };
  requests: {
    id: string;
    ref: string;
    kind: ServiceKind;
    status: ServiceStatus;
    createdAt: string;
    scheduledAt: string | null;
    preferredAt: string | null;
    client: Ref;
    municipality: string;
    barangay: string | null;
  }[];
  stats: {
    completedCount: number;
    activeCount: number;
    totalCount: number;
  };
}

export interface ServiceRow {
  id: string;
  ref: string;
  kind: ServiceKind;
  status: ServiceStatus;
  createdAt: string;
  preferredAt: string | null;
  scheduledAt: string | null;
  summary: string | null;
  barangay: string;
  municipality: string;
  files: number;
  client: Ref;
  assignedProvider?: { id: string; fullName: string; type: ProviderType } | null;
}

export interface ServiceDetail {
  request: {
    id: string;
    ref: string;
    kind: ServiceKind;
    kindLabel: string;
    status: ServiceStatus;
    createdAt: string;
    updatedAt: string;
    preferredAt: string | null;
    scheduledAt: string | null;
    details: Record<string, unknown>;
    staffNote: string | null;
    cancellationReason: string | null;
    handledBy: string | null;
    assignedProviderId?: string | null;
  };
  assignedProvider?: {
    id: string;
    fullName: string;
    type: ProviderType;
    specialty: string | null;
    licenseNumber: string | null;
    vehicleType: string | null;
    plateNumber: string | null;
    phone: string | null;
    municipality: string;
  } | null;
  client: { id: string; name: string; address: string; landmark: string | null };
  requestedBy: { name: string | null; role: string; phone: string | null; email: string | null };
  files: { id: string; fileName: string | null; contentType: string; sizeBytes: number; createdAt: string }[];
  history: AuditEntry[];
}

export type Badge = 'BADGE_ADL' | 'BADGE_CVMC_WATCHER';

export interface Candidate {
  id: string;
  fullName: string | null;
  phone: string | null;
  municipality: string | null;
  barangay: string | null;
  isAccredited: boolean;
  isAvailable: boolean;
  badges: string[];
  averageRating: number | null;
  totalShiftsCompleted: number;
  current: boolean;
  eligible: boolean;
  blockers: string[];
  warnings: string[];
}

export type RequestAction = { action: 'matching' } | { action: 'unassign'; reason?: string } | { action: 'escalate'; reason: string } | { action: 'cancel'; reason: string };

export type SignInStep = { next: 'mfa' | 'enroll'; challenge: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
    readonly requestId?: string,
  ) {
    super(message);
  }
}

/** Called on any 401 from a signed-in page, so the app can return to the sign-in screen. */
let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(handler: (() => void) | null) {
  onUnauthenticated = handler;
}

async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, { quiet401 = false } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: { 'X-AdvanCare-Staff': '1', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach the AdvanCare server. Check your connection and try again.');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    if (res.status === 401 && !quiet401 && err.code === 'UNAUTHENTICATED') onUnauthenticated?.();
    throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? 'Something went wrong. Please try again.', err.details?.nested ?? {}, err.requestId);
  }
  return data as T;
}

function query(filters: Record<string, string | undefined>): string {
  const params = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => !!e[1]));
  return params.size ? `?${params}` : '';
}

export const api = {
  // Sign-in
  login: (email: string, password: string) => request<SignInStep>('POST', '/auth/login', { email, password }),
  verifyMfa: (challenge: string, code: string) => request<{ me: Me }>('POST', '/auth/mfa', { challenge, code }),
  setupMfa: (challenge: string) => request<{ secret: string; otpauthUri: string }>('POST', '/auth/mfa/setup', { challenge }),
  enrollMfa: (challenge: string, code: string) => request<{ me: Me; recoveryCodes: string[] }>('POST', '/auth/mfa/enroll', { challenge, code }),
  invitation: (token: string) =>
    request<{ email: string; fullName: string | null; role: StaffRole; municipalities: string[]; invitedBy: string | null; expiresAt: string; awaitingApproval: boolean }>('POST', '/auth/invitation', { token }),
  acceptInvite: (token: string, fullName: string, password: string) => request<SignInStep>('POST', '/auth/accept-invite', { token, fullName, password }),
  logout: () => request<void>('POST', '/auth/logout'),

  // My account
  me: () => request<{ me: Me }>('GET', '/me', undefined, { quiet401: true }),
  changePassword: (currentPassword: string, newPassword: string) => request<{ otherSessionsEnded: number }>('POST', '/me/password', { currentPassword, newPassword }),
  mySessions: () => request<{ sessions: Session[] }>('GET', '/me/sessions'),
  revokeMySession: (id: string) => request<void>('POST', `/me/sessions/${id}/revoke`),
  revokeOtherSessions: () => request<{ ended: number }>('POST', '/me/sessions/revoke-others'),
  regenerateRecoveryCodes: (code: string) => request<{ recoveryCodes: string[] }>('POST', '/me/recovery-codes', { code }),
  resetMyMfa: (code: string) => request<void>('POST', '/me/mfa/reset', { code }),

  // Reference
  municipalities: () => request<{ municipalities: string[] }>('GET', '/municipalities'),

  // Admin accounts (Super Admin)
  accounts: () => request<{ accounts: Account[] }>('GET', '/accounts'),
  account: (id: string) => request<{ account: Account; scopeHistory: ScopeHistoryEntry[]; invitedAccounts: (PersonRef & { role: StaffRole })[] }>('GET', `/accounts/${id}`),
  invite: (input: { email: string; fullName: string; role: StaffRole; municipalities: string[] }) =>
    request<{ account: Account; inviteUrl: string; expiresAt: string; awaitingApproval: boolean }>('POST', '/accounts/invite', input),
  renewInvite: (id: string) => request<{ account: Account; inviteUrl: string; expiresAt: string }>('POST', `/accounts/${id}/invitation/renew`),
  approveInvite: (id: string) => request<{ account: Account }>('POST', `/accounts/${id}/invitation/approve`),
  revokeInvite: (id: string) => request<{ account: Account }>('POST', `/accounts/${id}/invitation/revoke`),
  updateAccount: (id: string, change: { status?: 'ACTIVE' | 'SUSPENDED'; municipalities?: string[]; reason?: string }) => request<{ account: Account }>('PATCH', `/accounts/${id}`, change),
  resetMfa: (id: string) => request<{ account: Account }>('POST', `/accounts/${id}/reset-mfa`),
  unlock: (id: string) => request<{ account: Account }>('POST', `/accounts/${id}/unlock`),
  revokeSessions: (id: string) => request<{ ended: number; account: Account }>('POST', `/accounts/${id}/sessions/revoke`),

  // Operations (phase B) — always limited to the signed-in person's municipalities.
  overview: (range: string, municipalities?: string[]) => {
    const q = new URLSearchParams({ range });
    if (municipalities !== undefined) {
      q.set('municipalities', municipalities.join(','));
    }
    return request<Overview>('GET', `/overview?${q.toString()}`);
  },
  requests: (filters: Record<string, string | undefined>) => request<Paged & { requests: RequestRow[] }>('GET', `/requests${query(filters)}`),
  request: (id: string) => request<RequestDetail>('GET', `/requests/${id}`),
  shifts: (date: string) => request<{ date: string; shifts: ShiftCard[] }>('GET', `/shifts?date=${date}`),
  clients: (filters: Record<string, string | undefined>) => request<Paged & { clients: ClientRow[] }>('GET', `/clients${query(filters)}`),
  client: (id: string) => request<ClientDetail>('GET', `/clients/${id}`),
  clinicalAccess: (id: string, reason: string) => request<ClinicalRecord>('POST', `/clients/${id}/clinical-access`, { reason }),
  caregivers: (filters: Record<string, string | undefined>) => request<Paged & { caregivers: CaregiverRow[] }>('GET', `/caregivers${query(filters)}`),
  caregiver: (id: string) => request<CaregiverDetail>('GET', `/caregivers/${id}`),
  payments: (filters: Record<string, string | undefined>) =>
    request<Paged & { payments: PaymentRow[]; totals: { succeeded: number; pending: number; pendingCount: number; failedCount: number } }>('GET', `/payments${query(filters)}`),
  /** Downloads a CSV (the server audits every export) and returns the file name. */
  exportCsv: async (table: ExportTable, filters: Record<string, string | undefined>) => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/exports/${table}${query(filters)}`, { credentials: 'include', headers: { 'X-AdvanCare-Staff': '1' } });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Can’t reach the AdvanCare server. Check your connection and try again.');
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => null))?.error ?? {};
      if (res.status === 401) onUnauthenticated?.();
      throw new ApiError(res.status, err.code ?? 'HTTP_ERROR', err.message ?? 'The export failed.', {}, err.requestId);
    }
    const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? `advancare-${table}.csv`;
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  },

  // Staff actions (P1)
  createCaregiver: (input: { fullName: string; email: string; phone: string; municipality: string; barangay: string; sitio?: string; badges: Badge[]; isAccredited: boolean }) =>
    request<{ id: string }>('POST', '/caregivers', input),
  updateCaregiver: (id: string, change: { isAccredited?: boolean; isAvailable?: boolean; active?: boolean; badges?: Badge[]; municipality?: string; barangay?: string; phone?: string; email?: string; reason?: string }) =>
    request<{ ok: true }>('PATCH', `/caregivers/${id}`, change),
  candidates: (requestId: string) => request<{ candidates: Candidate[] }>('GET', `/requests/${requestId}/candidates`),
  assign: (requestId: string, caregiverId: string) => request<{ ok: true; familyEmail: string; warnings: string[] }>('POST', `/requests/${requestId}/assign`, { caregiverId }),
  requestAction: (requestId: string, action: RequestAction) => request<{ ok: true; familyEmail?: string }>('POST', `/requests/${requestId}/status`, action),
  recordPayment: (requestId: string, input: { method: PaymentMethod; providerReference?: string }) => request<{ id: string }>('POST', `/requests/${requestId}/payments`, input),
  markPayout: (requestId: string, reference?: string) => request<{ ok: true }>('POST', `/requests/${requestId}/payout`, { reference: reference || undefined }),

  // Other services (P2)
  services: (filters: Record<string, string | undefined>) => request<Paged & { requests: ServiceRow[] }>('GET', `/service-requests${query(filters)}`),
  service: (id: string) => request<ServiceDetail>('GET', `/service-requests/${id}`),
  serviceStatus: (id: string, change: { status: Exclude<ServiceStatus, 'SUBMITTED'>; scheduledAt?: string; note?: string; reason?: string }) =>
    request<{ ok: true; familyEmail?: string }>('POST', `/service-requests/${id}/status`, change),
  serviceCandidates: (serviceRequestId: string) => request<{ candidates: ProviderCandidate[] }>('GET', `/service-requests/${serviceRequestId}/candidates`),
  assignService: (serviceRequestId: string, input: { providerId: string; scheduledAt?: string; note?: string }) =>
    request<{ ok: true; familyEmail?: string }>('POST', `/service-requests/${serviceRequestId}/assign`, input),
  /** Staff open attached files through the audited route (cookie auth), as a blob URL. */
  serviceFileUrl: async (id: string, fileId: string) => {
    const res = await fetch(`${BASE}/service-requests/${id}/files/${fileId}`, { credentials: 'include', headers: { 'X-AdvanCare-Staff': '1' } });
    if (!res.ok) throw new ApiError(res.status, 'FILE_ERROR', res.status === 404 ? 'File not found.' : 'Could not open the file.');
    return URL.createObjectURL(await res.blob());
  },

  // Providers (Doctors & Transport Drivers)
  providers: (filters: Record<string, string | undefined>) => request<Paged & { providers: ProviderRow[] }>('GET', `/providers${query(filters)}`),
  provider: (id: string) => request<ProviderDetail>('GET', `/providers/${id}`),
  createProvider: (input: { fullName: string; email: string; phone: string; type: ProviderType; municipality: string; barangay?: string; specialty?: string; licenseNumber?: string; vehicleType?: string; plateNumber?: string; isAvailable?: boolean; isAccredited?: boolean }) =>
    request<{ id: string }>('POST', '/providers', input),
  updateProvider: (id: string, change: { isAvailable?: boolean; isAccredited?: boolean; active?: boolean; specialty?: string; licenseNumber?: string; vehicleType?: string; plateNumber?: string; municipality?: string; barangay?: string }) =>
    request<{ ok: true }>('PATCH', `/providers/${id}`, change),

  // Audit
  audit: (filters: Record<string, string | undefined>) => request<{ entries: AuditEntry[]; nextCursor: string | null; scope: 'all' | 'own' }>('GET', `/audit${query(filters)}`),
};
