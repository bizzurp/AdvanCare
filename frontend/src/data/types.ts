import type { IconName } from '../components/Icon';

export type ServiceKind =
  | 'telehealth'
  | 'rhu'
  | 'triage'
  | 'prescription'
  | 'transport'
  | 'home-caregiver'
  | 'cvmc-caregiver';

/**
 * Request lifecycle shown to people. `saved-demo` and `queued` are deliberately
 * distinct from `submitted`: nothing is shown as sent unless the API accepted it.
 */
export type RequestStatus =
  | 'saved-demo' // kept on this device; no backend contract/endpoint available
  | 'queued' // offline; will send when connection returns
  | 'submitted' // accepted by the API, awaiting provider/coordinator
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export interface DetailItem {
  label: string;
  value: string;
  icon?: IconName;
}

export interface ServiceRequest {
  id: string;
  kind: ServiceKind;
  clientName: string;
  createdAt: string; // ISO
  scheduledFor?: string; // ISO
  status: RequestStatus;
  summary: string;
  details: DetailItem[];
  /** Payload kept for retry / later sync. */
  payload: Record<string, unknown>;
  idempotencyKey: string;
  /** Present when the request was only stored locally. */
  dependencyNote?: string;
  /** The server's id once the API accepted it (used to follow its status). */
  serverId?: string;
  /** Booking reference shown by staff (REQ-…), once known. */
  serverRef?: string;
  /** First name of the assigned caregiver, from the server. */
  caregiverFirstName?: string;
  /** Payment recorded by staff (from the server). */
  paid?: boolean;
  /** Number of care notes the caregiver recorded (from the server). */
  careNotes?: number;
  isDemoRecord?: boolean;
}

export type Role = 'household' | 'coordinator' | 'caregiver';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  isRemoteSponsor: boolean;
  location?: string;
  scopes: DelegationScope[];
}

export type DelegationScope =
  | 'SCOPE_CARE_NOTES_VIEW'
  | 'SCOPE_VITALS_VIEW'
  | 'SCOPE_FINANCIAL_SPONSOR'
  | 'SCOPE_FULL_HEALTH_PROXY';

export interface ClientProfile {
  id: string;
  clientCode: string;
  fullName: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: string;
  phone: string; // +639XXXXXXXXX
  municipality: string;
  barangay: string;
  sitio: string;
  landmarkNotes: string;
  conditions: string[];
  mobility: string;
  allergies: string;
  primaryLanguage: string;
  philhealthId?: string;
  planId?: PlanId;
  planStatus?: 'none' | 'pending-payment' | 'pending-subsidy' | 'active';
  family: FamilyMember[];
}

export type PlanId = 'silver' | 'gold' | 'platinum';
