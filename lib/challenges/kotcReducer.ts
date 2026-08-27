import { projectKotcViews, mergeStreak } from './deriveFlags';
import { newClientId } from './ids';
import {
  WAITING_MAX,
  normalizeChallengeName,
  validateSessionBottomText,
  validateSessionTitle,
  validateTeamName,
} from './nameRules';
import { payloadSummary } from './payloadSummary';
import type {
  ChallengeActionRecord,
  ChallengeBoardState,
  ChallengeDomainError,
  KotcParticipant,
  KotcSlot,
} from './types';
import { assertActive, cloneBoard, nowSeconds } from './types';

export type KotcCommand =
  | { type: 'add_team'; name: string }
  | { type: 'remove_team'; teamId: string }
  | { type: 'jump_in'; teamId: string; slot: 'court_a' | 'court_b' }
  | { type: 'resolve_match'; winnerTeamId: string }
  | { type: 'reorder_waiting'; fromIndex: number; toIndex: number }
  | { type: 'return_to_waiting'; teamId: string }
  | { type: 'requeue'; teamId: string }
  | { type: 'rename'; title: string }
  | { type: 'rename_bottom_text'; bottom_text: string }
  | { type: 'complete' }
  | { type: 'reactivate' };

function renumberWaiting(participants: KotcParticipant[]): void {
  const waiting = participants
    .filter(p => p.slot === 'waiting')
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
  waiting.forEach((p, i) => {
    p.queue_position = i + 1;
  });
}

function nextWaiting(participants: KotcParticipant[]): KotcParticipant | null {
  return (
    participants
      .filter(p => p.slot === 'waiting')
      .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))[0] ??
    null
  );
}

function waitingCount(participants: KotcParticipant[]): number {
  return participants.filter(p => p.slot === 'waiting').length;
}

function isOnCourt(slot: KotcSlot): boolean {
  return slot === 'court_a' || slot === 'court_b';
}

function findActiveByName(
  participants: KotcParticipant[],
  normalized: string
): KotcParticipant | undefined {
  return participants.find(
    p =>
      p.name_normalized === normalized &&
      (p.slot === 'waiting' || isOnCourt(p.slot))
  );
}

function reorderWaitingQueue(
  participants: KotcParticipant[],
  fromIndex: number,
  toIndex: number
): boolean {
  const waiting = participants
    .filter(p => p.slot === 'waiting')
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= waiting.length ||
    toIndex >= waiting.length
  ) {
    return false;
  }
  const next = [...waiting];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  next.forEach((p, i) => {
    p.queue_position = i + 1;
  });
  return true;
}

function applyMutation(
  before: ChallengeBoardState,
  mutate: (draft: ChallengeBoardState) => void,
  actionType: ChallengeActionRecord['action_type'],
  payload: Record<string, unknown> | null,
  sequenceNumber: number
): { state: ChallengeBoardState; action: ChallengeActionRecord } | ChallengeDomainError {
  const draft = cloneBoard(before);
  mutate(draft);
  const after = projectKotcViews(draft);
  const action: ChallengeActionRecord = {
    client_action_id: newClientId(),
    sequence_number: sequenceNumber,
    action_type: actionType,
    before_state: projectKotcViews(before),
    payload,
    payload_summary: payloadSummary(actionType, payload),
    occurred_at: nowSeconds(),
  };
  return { state: after, action };
}

export function reduceKotc(
  state: ChallengeBoardState,
  command: KotcCommand,
  nextSequence: number
): { state: ChallengeBoardState; action: ChallengeActionRecord } | ChallengeDomainError {
  if (command.type !== 'reactivate') {
    const activeErr = assertActive(state);
    if (activeErr) return activeErr;
  }

  switch (command.type) {
    case 'add_team': {
      const nameErr = validateTeamName(command.name);
      if (nameErr) return { message: nameErr };
      const name = command.name.trim();
      const normalized = normalizeChallengeName(name);
      const participants = state.participants as KotcParticipant[];

      const active = findActiveByName(participants, normalized);
      if (active) {
        return {
          message: '',
          code: 'duplicate_active',
          duplicate: {
            id: active.team_id,
            location: active.slot === 'waiting' ? 'waiting' : 'court',
          },
        };
      }

      if (waitingCount(participants) >= WAITING_MAX) {
        return { message: `Waiting list is full (max ${WAITING_MAX}).` };
      }

      const existing = participants.find(
        p => p.name_normalized === normalized && p.slot === 'removed'
      );

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as KotcParticipant[];
          if (existing) {
            const t = list.find(p => p.team_id === existing.team_id)!;
            t.slot = 'waiting';
            t.queue_position = waitingCount(list) + 1;
          } else {
            list.push({
              participation_id: newClientId(),
              team_id: newClientId(),
              team_name: name,
              name_normalized: normalized,
              slot: 'waiting',
              queue_position: waitingCount(list) + 1,
              current_streak: 0,
              biggest_streak: 0,
              second_biggest_streak: 0,
              leaderboard_eligible: false,
            });
          }
          renumberWaiting(list);
        },
        'participant_added',
        { name },
        nextSequence
      );
    }
    case 'remove_team': {
      const participants = state.participants as KotcParticipant[];
      const team = participants.find(
        p => p.team_id === command.teamId && p.slot === 'waiting'
      );
      if (!team) return { message: 'Waiting team not found.' };

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as KotcParticipant[];
          const t = list.find(p => p.team_id === command.teamId);
          if (t) {
            t.slot = 'removed';
            t.queue_position = null;
          }
          renumberWaiting(list);
        },
        'participant_removed',
        { name: team.team_name, team_id: team.team_id },
        nextSequence
      );
    }
    case 'jump_in': {
      const participants = state.participants as KotcParticipant[];
      const team = participants.find(
        p => p.team_id === command.teamId && p.slot === 'waiting'
      );
      if (!team) return { message: 'Waiting team not found.' };
      const occupied = participants.some(p => p.slot === command.slot);
      if (occupied) return { message: 'Court slot is occupied.' };
      const courtCount = participants.filter(
        p => p.slot === 'court_a' || p.slot === 'court_b'
      ).length;
      if (courtCount >= 2) return { message: 'Court is full.' };

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as KotcParticipant[];
          const t = list.find(p => p.team_id === command.teamId);
          if (t) {
            t.slot = command.slot;
            t.queue_position = null;
            t.current_streak = 0;
          }
          renumberWaiting(list);
        },
        'participant_jumped_in',
        { name: team.team_name, team_id: team.team_id, slot: command.slot },
        nextSequence
      );
    }
    case 'resolve_match': {
      const participants = state.participants as KotcParticipant[];
      const teamA = participants.find(p => p.slot === 'court_a');
      const teamB = participants.find(p => p.slot === 'court_b');
      if (!teamA || !teamB) return { message: 'Court needs two teams.' };
      const winner =
        command.winnerTeamId === teamA.team_id
          ? teamA
          : command.winnerTeamId === teamB.team_id
            ? teamB
            : null;
      if (!winner) return { message: 'Winner must be on court.' };
      const loser = winner.team_id === teamA.team_id ? teamB : teamA;
      const loserSlot: KotcSlot = loser.slot;

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as KotcParticipant[];
          const w = list.find(p => p.team_id === winner.team_id)!;
          const l = list.find(p => p.team_id === loser.team_id)!;
          w.current_streak += 1;
          w.leaderboard_eligible = true;

          const merged = mergeStreak(
            l.biggest_streak,
            l.second_biggest_streak,
            l.current_streak
          );
          l.biggest_streak = merged.biggest_streak;
          l.second_biggest_streak = merged.second_biggest_streak;
          l.current_streak = 0;
          l.slot = 'removed';
          l.queue_position = null;
          l.leaderboard_eligible = true;

          const incoming = nextWaiting(list);
          if (incoming) {
            incoming.slot = loserSlot;
            incoming.queue_position = null;
            incoming.current_streak = 0;
          }
          renumberWaiting(list);
        },
        'kotc_match_resolved',
        {
          winner_team_id: winner.team_id,
          winner_name: winner.team_name,
          loser_team_id: loser.team_id,
          loser_slot: loserSlot,
        },
        nextSequence
      );
    }
    case 'reorder_waiting': {
      const participants = state.participants as KotcParticipant[];
      const waitingLen = waitingCount(participants);
      if (waitingLen < 2) {
        return { message: 'Need at least two waiting teams to reorder.' };
      }
      const ok = (() => {
        const draftCheck = cloneBoard(state);
        return reorderWaitingQueue(
          draftCheck.participants as KotcParticipant[],
          command.fromIndex,
          command.toIndex
        );
      })();
      if (!ok) return { message: 'Invalid waiting reorder.' };

      return applyMutation(
        state,
        draft => {
          reorderWaitingQueue(
            draft.participants as KotcParticipant[],
            command.fromIndex,
            command.toIndex
          );
        },
        'waiting_reordered',
        { from_index: command.fromIndex, to_index: command.toIndex },
        nextSequence
      );
    }
    case 'return_to_waiting': {
      const participants = state.participants as KotcParticipant[];
      const team = participants.find(
        p => p.team_id === command.teamId && isOnCourt(p.slot)
      );
      if (!team) return { message: 'Court team not found.' };
      if (waitingCount(participants) >= WAITING_MAX) {
        return { message: `Waiting list is full (max ${WAITING_MAX}).` };
      }

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as KotcParticipant[];
          const t = list.find(p => p.team_id === command.teamId);
          if (t) {
            const nextPos = waitingCount(list) + 1;
            t.slot = 'waiting';
            t.queue_position = nextPos;
          }
          renumberWaiting(list);
        },
        'participant_returned_to_waiting',
        { name: team.team_name, team_id: team.team_id },
        nextSequence
      );
    }
    case 'requeue': {
      const participants = state.participants as KotcParticipant[];
      const team = participants.find(p => p.team_id === command.teamId);
      if (!team) return { message: 'Team not found.' };
      if (!team.leaderboard_eligible) {
        return { message: 'Team is not on the leaderboard.' };
      }
      if (team.slot !== 'removed') {
        return { message: 'Team is already active.' };
      }
      if (waitingCount(participants) >= WAITING_MAX) {
        return { message: `Waiting list is full (max ${WAITING_MAX}).` };
      }

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as KotcParticipant[];
          const t = list.find(p => p.team_id === command.teamId);
          if (t) {
            const nextPos = waitingCount(list) + 1;
            t.slot = 'waiting';
            t.queue_position = nextPos;
          }
          renumberWaiting(list);
        },
        'participant_requeued',
        { name: team.team_name, team_id: team.team_id },
        nextSequence
      );
    }
    case 'rename': {
      const title = command.title.trim();
      if (!title) return { message: 'Title is required.' };
      const titleErr = validateSessionTitle(title);
      if (titleErr) return { message: titleErr };
      return applyMutation(
        state,
        draft => {
          draft.session.title = title;
        },
        'session_renamed',
        { title },
        nextSequence
      );
    }
    case 'rename_bottom_text': {
      const bottomText = command.bottom_text.trim();
      if (!bottomText) return { message: 'Bottom text is required.' };
      const bottomErr = validateSessionBottomText(bottomText);
      if (bottomErr) return { message: bottomErr };
      return applyMutation(
        state,
        draft => {
          draft.session.bottom_text = bottomText;
        },
        'session_bottom_text_renamed',
        { bottom_text: bottomText },
        nextSequence
      );
    }
    case 'complete': {
      const projected = projectKotcViews(state);
      if (!projected.can_complete) {
        return {
          message: projected.complete_blocked_reasons.join('; ') || 'Cannot complete.',
        };
      }
      return applyMutation(
        state,
        draft => {
          draft.session.status = 'completed';
          draft.session.completed_at = nowSeconds();
        },
        'session_completed',
        null,
        nextSequence
      );
    }
    case 'reactivate': {
      if (state.session.status !== 'completed') {
        return { message: 'Session is already active.' };
      }
      return applyMutation(
        state,
        draft => {
          draft.session.status = 'active';
          draft.session.completed_at = null;
        },
        'session_reactivated',
        null,
        nextSequence
      );
    }
    default:
      return { message: 'Unknown command.' };
  }
}
