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

  // Audit
  audit: (filters: Record<string, string | undefined>) => {
    const params = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => !!e[1]));
    return request<{ entries: AuditEntry[]; nextCursor: string | null; scope: 'all' | 'own' }>('GET', `/audit${params.size ? `?${params}` : ''}`);
  },
};
