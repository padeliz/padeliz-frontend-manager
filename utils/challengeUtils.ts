export const CHALLENGE_TEAM_MIN = 10;
export const CHALLENGE_TEAM_MAX = 35;
export const CHALLENGE_PLAYER_MIN = 5;
export const CHALLENGE_PLAYER_MAX = 20;

export function validateChallengeTeamName(name: string): string | null {
  const trimmed = name.trim();
  const len = [...trimmed].length;
  if (len < CHALLENGE_TEAM_MIN || len > CHALLENGE_TEAM_MAX) {
    return `Team name must be ${CHALLENGE_TEAM_MIN}–${CHALLENGE_TEAM_MAX} characters.`;
  }
  return null;
}

export function validateChallengePlayerName(name: string): string | null {
  const trimmed = name.trim();
  const len = [...trimmed].length;
  if (len < CHALLENGE_PLAYER_MIN || len > CHALLENGE_PLAYER_MAX) {
    return `Player name must be ${CHALLENGE_PLAYER_MIN}–${CHALLENGE_PLAYER_MAX} characters.`;
  }
  return null;
}

export function formatChallengeTimestamp(ts: number | null | undefined): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString();
}

export function formatRecordHold(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatRecordHoldCell(
  seconds: number | null | undefined
): string {
  if ((seconds ?? 0) <= 0) {
    return '';
  }
  return formatRecordHold(seconds!);
}

export function challengeTypeLabel(type: string): string {
  return type === 'king_of_the_court' ? 'King of the Court' : 'Smash Contest';
}

export function challengeLivePath(
  type: string,
  sessionId: number
): string {
  return type === 'king_of_the_court'
    ? `/challenges/kotc/${sessionId}`
    : `/challenges/smash/${sessionId}`;
}

export function formatKotcTeamStats(opts: {
  leaderboardPosition?: number;
  biggestStreak?: number;
}): string {
  const parts: string[] = [];
  if (typeof opts.leaderboardPosition === 'number') {
    parts.push(`#${opts.leaderboardPosition}`);
  }
  if (typeof opts.biggestStreak === 'number' && opts.biggestStreak > 0) {
    parts.push(`Best: ${opts.biggestStreak} streak wins`);
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function formatSmashPlayerStats(opts: {
  leaderboardPosition?: number;
  sessionTries?: number;
  isRecordHolder?: boolean;
}): string {
  const parts: string[] = [];
  if (typeof opts.leaderboardPosition === 'number') {
    parts.push(`#${opts.leaderboardPosition}`);
  }
  if (typeof opts.sessionTries === 'number' && opts.sessionTries > 0) {
    parts.push(`Tries: ${opts.sessionTries}`);
  }
  if (opts.isRecordHolder) {
    parts.push('Record Holder');
  }
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function kotcCourtSlotLabel(slot: 'team_a' | 'team_b'): string {
  return slot === 'team_a' ? 'TEAM A' : 'TEAM B';
}
