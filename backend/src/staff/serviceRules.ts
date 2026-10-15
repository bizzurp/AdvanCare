/** Staff status changes for TeleHealth/RHU/Triage/Prescription/Transport requests (P2). */
export type ServiceStatus = 'SUBMITTED' | 'IN_REVIEW' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

const NEXT: Record<ServiceStatus, ServiceStatus[]> = {
  SUBMITTED: ['IN_REVIEW', 'SCHEDULED', 'CANCELLED'],
  IN_REVIEW: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
  SCHEDULED: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], // SCHEDULED → SCHEDULED = reschedule
  COMPLETED: [],
  CANCELLED: [],
};

const WORDS: Record<ServiceStatus, string> = { SUBMITTED: 'new', IN_REVIEW: 'in review', SCHEDULED: 'scheduled', COMPLETED: 'completed', CANCELLED: 'cancelled' };

export function serviceTransitionProblem(from: ServiceStatus, to: ServiceStatus): string | null {
  return NEXT[from].includes(to) ? null : `This request is ${WORDS[from]}, so it can’t be marked ${WORDS[to]}.`;
}

/** Health-related services: opening them is audited like clinical notes. */
export const SENSITIVE_KINDS = new Set(['triage', 'prescription', 'telehealth']);
