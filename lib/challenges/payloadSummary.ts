import type { ChallengeActionType } from './types';

export function payloadSummary(
  actionType: ChallengeActionType,
  payload: Record<string, unknown> | null
): string {
  const p = payload ?? {};
  switch (actionType) {
    case 'participant_added':
      return typeof p.name === 'string' ? `Added: ${p.name}` : 'Participant added';
    case 'participant_removed':
      return typeof p.name === 'string'
        ? `Removed: ${p.name}`
        : 'Participant removed';
    case 'participant_jumped_in':
      return typeof p.name === 'string'
        ? `Jumped in: ${p.name}`
        : 'Participant jumped in';
    case 'session_renamed':
      return typeof p.title === 'string' ? `Renamed: ${p.title}` : 'Session renamed';
    case 'session_bottom_text_renamed':
      return typeof p.bottom_text === 'string'
        ? `Bottom text: ${p.bottom_text}`
        : 'Bottom text renamed';
    case 'session_completed':
      return 'Session completed';
    case 'session_reactivated':
      return 'Session reactivated';
    case 'kotc_match_resolved':
      return typeof p.winner_name === 'string'
        ? `Match resolved: ${p.winner_name} won`
        : 'Match resolved';
    case 'smash_attempt_recorded':
      return p.got_new_record
        ? 'Attempt recorded (new record)'
        : 'Attempt recorded';
    case 'waiting_reordered':
      return 'Waiting list reordered';
    case 'participant_returned_to_waiting':
      return typeof p.name === 'string'
        ? `Returned to waiting: ${p.name}`
        : 'Returned to waiting';
    case 'participant_requeued':
      return typeof p.name === 'string'
        ? `Requeued: ${p.name}`
        : 'Requeued';
    case 'undo':
      return 'Undo';
    default:
      return actionType;
  }
}
