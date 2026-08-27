import {
  formatKotcTeamStats,
  formatRecordHold,
  formatRecordHoldCell,
  formatSmashPlayerStats,
  kotcCourtSlotLabel,
} from '@/utils/challengeUtils';
import { validateSessionBottomText, validateSessionTitle } from '@/lib/challenges/nameRules';

describe('challengeUtils + session title', () => {
  it('validateSessionTitle rejects outside 20–50', () => {
    expect(validateSessionTitle('a'.repeat(19))).not.toBeNull();
    expect(validateSessionTitle('a'.repeat(51))).not.toBeNull();
    expect(validateSessionTitle('a'.repeat(20))).toBeNull();
    expect(validateSessionTitle('a'.repeat(50))).toBeNull();
  });

  it('validateSessionBottomText rejects outside 20–45', () => {
    expect(validateSessionBottomText('a'.repeat(19))).not.toBeNull();
    expect(validateSessionBottomText('a'.repeat(46))).not.toBeNull();
    expect(validateSessionBottomText('a'.repeat(20))).toBeNull();
    expect(validateSessionBottomText('a'.repeat(45))).toBeNull();
  });

  it('formatKotcTeamStats covers LB rank, best, and em dash fallback', () => {
    expect(formatKotcTeamStats({ leaderboardPosition: 3 })).toBe('#3');
    expect(formatKotcTeamStats({ biggestStreak: 2 })).toBe(
      'Best: 2 streak wins'
    );
    expect(
      formatKotcTeamStats({ leaderboardPosition: 1, biggestStreak: 4 })
    ).toBe('#1 · Best: 4 streak wins');
    expect(formatKotcTeamStats({})).toBe('—');
    expect(formatKotcTeamStats({ biggestStreak: 0 })).toBe('—');
  });

  it('formatSmashPlayerStats covers LB rank, tries, holder, and em dash fallback', () => {
    expect(formatSmashPlayerStats({ leaderboardPosition: 2 })).toBe('#2');
    expect(formatSmashPlayerStats({ sessionTries: 3 })).toBe('Tries: 3');
    expect(formatSmashPlayerStats({ isRecordHolder: true })).toBe(
      'Record Holder'
    );
    expect(
      formatSmashPlayerStats({
        leaderboardPosition: 1,
        sessionTries: 5,
        isRecordHolder: true,
      })
    ).toBe('#1 · Tries: 5 · Record Holder');
    expect(formatSmashPlayerStats({})).toBe('—');
    expect(formatSmashPlayerStats({ sessionTries: 0 })).toBe('—');
    expect(formatSmashPlayerStats({ sessionTries: 2 })).not.toMatch(/\d+:\d+/);
  });

  it('kotcCourtSlotLabel', () => {
    expect(kotcCourtSlotLabel('team_a')).toBe('TEAM A');
    expect(kotcCourtSlotLabel('team_b')).toBe('TEAM B');
  });

  it('formatRecordHold', () => {
    expect(formatRecordHold(65)).toBe('1:05');
    expect(formatRecordHold(0)).toBe('0:00');
  });

  it('formatRecordHoldCell returns empty for zero/null and formatted otherwise', () => {
    expect(formatRecordHoldCell(0)).toBe('');
    expect(formatRecordHoldCell(null)).toBe('');
    expect(formatRecordHoldCell(undefined)).toBe('');
    expect(formatRecordHoldCell(65)).toBe('1:05');
  });
});
