/**
 * Request (shift) actions staff may take, and who can be assigned (P1). Pure functions so the
 * rules are unit-tested; the routes only load data and call these.
 */
export type ShiftStatus = 'REQUESTED' | 'MATCHING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED';
export type ShiftTier = 'BGAY_HOME_300' | 'CVMC_INSTITUTIONAL_500';
export type StaffAction = 'assign' | 'matching' | 'escalate' | 'cancel' | 'unassign';

const ALLOWED: Record<StaffAction, ShiftStatus[]> = {
  assign: ['REQUESTED', 'MATCHING', 'ESCALATED', 'CONFIRMED'],
  matching: ['REQUESTED'],
  escalate: ['REQUESTED', 'MATCHING', 'CONFIRMED'],
  cancel: ['REQUESTED', 'MATCHING', 'CONFIRMED', 'ESCALATED'],
  unassign: ['CONFIRMED', 'ESCALATED'],
};

const STATUS_WORDS: Record<ShiftStatus, string> = {
  REQUESTED: 'new',
  MATCHING: 'being matched',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ESCALATED: 'escalated',
};

const ACTION_WORDS: Record<StaffAction, string> = { assign: 'assigned', matching: 'moved to matching', escalate: 'escalated', cancel: 'cancelled', unassign: 'unassigned' };

export function actionProblem(action: StaffAction, status: ShiftStatus): string | null {
  return ALLOWED[action].includes(status) ? null : `This request is ${STATUS_WORDS[status]}, so it can’t be ${ACTION_WORDS[action]}.`;
}

/** Badge a caregiver needs for each service tier. */
export const REQUIRED_BADGE: Record<ShiftTier, string> = { BGAY_HOME_300: 'BADGE_ADL', CVMC_INSTITUTIONAL_500: 'BADGE_CVMC_WATCHER' };
export const BADGES = ['BADGE_ADL', 'BADGE_CVMC_WATCHER'] as const;

export interface CandidateFacts {
  isAccredited: boolean;
  isAvailable: boolean;
  accountActive: boolean;
  badges: string[];
  municipality: string | null;
  /** Start times ("HH:MM") of the caregiver's confirmed / in-progress shifts on the same date. */
  sameDayStarts: string[];
}

const minutes = (hhmm: string) => {
  const [h = '0', m = '0'] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
};

/** Blocking reasons (empty = can be assigned) and soft warnings for one caregiver and one request. */
export function assignmentCheck(c: CandidateFacts, req: { tier: ShiftTier; municipality: string; startTime: string }) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!c.accountActive) blockers.push('Account is turned off.');
  if (!c.isAccredited) blockers.push('Not accredited yet.');
  if (!c.badges.includes(REQUIRED_BADGE[req.tier])) blockers.push(req.tier === 'CVMC_INSTITUTIONAL_500' ? 'Needs the CVMC watcher badge.' : 'Needs the ADL badge.');
  const start = minutes(req.startTime);
  // 8-hour shifts (ADR-002): two shifts the same day overlap when their starts are < 8 h apart.
  if (c.sameDayStarts.some((s) => Math.abs(minutes(s) - start) < 8 * 60)) blockers.push('Already has a shift at that time.');
  if (!c.isAvailable) warnings.push('Marked as not available.');
  if (c.municipality !== req.municipality) warnings.push(`Based in ${c.municipality ?? 'an unknown municipality'}, not ${req.municipality}.`);
  return { eligible: blockers.length === 0, blockers, warnings };
}
