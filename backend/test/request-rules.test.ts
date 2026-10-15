import { describe, expect, it } from 'vitest';
import { actionProblem, assignmentCheck } from '../src/staff/requestRules';

const ok = { isAccredited: true, isAvailable: true, accountActive: true, badges: ['BADGE_ADL'], municipality: 'Solana', sameDayStarts: [] as string[] };
const home = { tier: 'BGAY_HOME_300' as const, municipality: 'Solana', startTime: '08:00' };

describe('request actions', () => {
  it('allows each action only from the right statuses', () => {
    expect(actionProblem('assign', 'REQUESTED')).toBeNull();
    expect(actionProblem('assign', 'CONFIRMED')).toBeNull(); // reassign
    expect(actionProblem('assign', 'COMPLETED')).toMatch(/completed/);
    expect(actionProblem('cancel', 'IN_PROGRESS')).toMatch(/in progress/);
    expect(actionProblem('cancel', 'ESCALATED')).toBeNull();
    expect(actionProblem('matching', 'MATCHING')).toMatch(/being matched/);
    expect(actionProblem('unassign', 'CONFIRMED')).toBeNull();
  });
});

describe('who can be assigned', () => {
  it('accepts an accredited caregiver with the right badge', () => {
    expect(assignmentCheck(ok, home)).toEqual({ eligible: true, blockers: [], warnings: [] });
  });

  it('blocks missing accreditation, wrong badge, disabled accounts and overlapping shifts', () => {
    expect(assignmentCheck({ ...ok, isAccredited: false }, home).blockers).toContain('Not accredited yet.');
    expect(assignmentCheck(ok, { ...home, tier: 'CVMC_INSTITUTIONAL_500' }).blockers).toContain('Needs the CVMC watcher badge.');
    expect(assignmentCheck({ ...ok, accountActive: false }, home).eligible).toBe(false);
    expect(assignmentCheck({ ...ok, sameDayStarts: ['14:00'] }, home).blockers).toContain('Already has a shift at that time.');
    expect(assignmentCheck({ ...ok, sameDayStarts: ['16:00'] }, home).eligible).toBe(true); // 8 h apart: no overlap
  });

  it('only warns for unavailable or other-municipality caregivers', () => {
    const r = assignmentCheck({ ...ok, isAvailable: false, municipality: 'Tuguegarao City' }, home);
    expect(r.eligible).toBe(true);
    expect(r.warnings).toHaveLength(2);
  });
});
