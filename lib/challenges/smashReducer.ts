import { liveHoldSeconds, projectSmashViews } from './deriveFlags';
import { newClientId } from './ids';
import {
  WAITING_MAX,
  normalizeChallengeName,
  validatePlayerName,
  validateSessionBottomText,
  validateSessionTitle,
} from './nameRules';
import { payloadSummary } from './payloadSummary';
import type {
  ChallengeActionRecord,
  ChallengeBoardState,
  ChallengeDomainError,
  ChallengeSmashDetail,
  SmashParticipant,
} from './types';
import { assertActive, cloneBoard, nowSeconds } from './types';

export type SmashCommand =
  | { type: 'add_player'; name: string }
  | { type: 'remove_player'; playerId: string }
  | { type: 'jump_in'; playerId: string }
  | {
      type: 'record_attempt';
      gotNewRecord: boolean;
      detail?: ChallengeSmashDetail;
    }
  | { type: 'reorder_waiting'; fromIndex: number; toIndex: number }
  | { type: 'return_to_waiting'; playerId: string }
  | { type: 'requeue'; playerId: string }
  | { type: 'rename'; title: string }
  | { type: 'rename_bottom_text'; bottom_text: string }
  | { type: 'complete' }
  | { type: 'reactivate' };

function renumberWaiting(participants: SmashParticipant[]): void {
  const waiting = participants
    .filter(p => p.slot === 'waiting')
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0));
  waiting.forEach((p, i) => {
    p.queue_position = i + 1;
  });
}

function nextWaiting(participants: SmashParticipant[]): SmashParticipant | null {
  return (
    participants
      .filter(p => p.slot === 'waiting')
      .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))[0] ??
    null
  );
}

function waitingCount(participants: SmashParticipant[]): number {
  return participants.filter(p => p.slot === 'waiting').length;
}

function findActiveByName(
  participants: SmashParticipant[],
  normalized: string
): SmashParticipant | undefined {
  return participants.find(
    p =>
      p.name_normalized === normalized &&
      (p.slot === 'waiting' || p.slot === 'on_court')
  );
}

function reorderWaitingQueue(
  participants: SmashParticipant[],
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

function bankHolderHold(p: SmashParticipant, now: number): void {
  if (p.record_held_since != null) {
    p.record_hold_seconds = liveHoldSeconds(p, now);
    p.record_held_since = null;
  }
}

function resumeHolderClockIfNeeded(
  participants: SmashParticipant[],
  now: number
): void {
  const holder = participants.find(p => p.is_record_holder);
  if (!holder) return;
  if (holder.record_held_since != null) return;
  holder.record_held_since = now;
}

function applyMutation(
  before: ChallengeBoardState,
  mutate: (draft: ChallengeBoardState) => void,
  actionType: ChallengeActionRecord['action_type'],
  payload: Record<string, unknown> | null,
  sequenceNumber: number,
  now: number
): { state: ChallengeBoardState; action: ChallengeActionRecord } | ChallengeDomainError {
  const draft = cloneBoard(before);
  mutate(draft);
  const after = projectSmashViews(draft, now);
  const action: ChallengeActionRecord = {
    client_action_id: newClientId(),
    sequence_number: sequenceNumber,
    action_type: actionType,
    before_state: projectSmashViews(before, now),
    payload,
    payload_summary: payloadSummary(actionType, payload),
    occurred_at: now,
  };
  return { state: after, action };
}

export function reduceSmash(
  state: ChallengeBoardState,
  command: SmashCommand,
  nextSequence: number,
  now: number = nowSeconds()
): { state: ChallengeBoardState; action: ChallengeActionRecord } | ChallengeDomainError {
  if (command.type !== 'reactivate') {
    const activeErr = assertActive(state);
    if (activeErr) return activeErr;
  }

  switch (command.type) {
    case 'add_player': {
      const nameErr = validatePlayerName(command.name);
      if (nameErr) return { message: nameErr };
      const name = command.name.trim();
      const normalized = normalizeChallengeName(name);
      const participants = state.participants as SmashParticipant[];

      const active = findActiveByName(participants, normalized);
      if (active) {
        return {
          message: '',
          code: 'duplicate_active',
          duplicate: {
            id: active.player_user_id,
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
          const list = draft.participants as SmashParticipant[];
          if (existing) {
            const p = list.find(x => x.player_user_id === existing.player_user_id)!;
            p.slot = 'waiting';
            p.queue_position = waitingCount(list) + 1;
          } else {
            list.push({
              participation_id: newClientId(),
              player_user_id: newClientId(),
              player_name: name,
              name_normalized: normalized,
              slot: 'waiting',
              queue_position: waitingCount(list) + 1,
              session_tries: 0,
              record_hold_seconds: 0,
              is_record_holder: false,
              record_held_since: null,
              leaderboard_eligible: false,
            });
          }
          renumberWaiting(list);
        },
        'participant_added',
        { name },
        nextSequence,
        now
      );
    }
    case 'remove_player': {
      const participants = state.participants as SmashParticipant[];
      const player = participants.find(
        p => p.player_user_id === command.playerId && p.slot === 'waiting'
      );
      if (!player) return { message: 'Waiting player not found.' };

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as SmashParticipant[];
          const p = list.find(x => x.player_user_id === command.playerId);
          if (p) {
            p.slot = 'removed';
            p.queue_position = null;
          }
          renumberWaiting(list);
        },
        'participant_removed',
        { name: player.player_name, player_user_id: player.player_user_id },
        nextSequence,
        now
      );
    }
    case 'jump_in': {
      const participants = state.participants as SmashParticipant[];
      const player = participants.find(
        p => p.player_user_id === command.playerId && p.slot === 'waiting'
      );
      if (!player) return { message: 'Waiting player not found.' };
      if (participants.some(p => p.slot === 'on_court')) {
        return { message: 'Court is occupied.' };
      }

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as SmashParticipant[];
          const courtWasEmpty = !list.some(p => p.slot === 'on_court');
          const p = list.find(x => x.player_user_id === command.playerId);
          if (p) {
            p.slot = 'on_court';
            p.queue_position = null;
          }
          renumberWaiting(list);
          if (courtWasEmpty) {
            resumeHolderClockIfNeeded(list, now);
          }
        },
        'participant_jumped_in',
        { name: player.player_name, player_user_id: player.player_user_id },
        nextSequence,
        now
      );
    }
    case 'record_attempt': {
      const participants = state.participants as SmashParticipant[];
      const onCourt = participants.find(p => p.slot === 'on_court');
      if (!onCourt) return { message: 'No player on court.' };

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as SmashParticipant[];
          const current = list.find(
            p => p.participation_id === onCourt.participation_id
          )!;
          current.session_tries += 1;

          if (command.gotNewRecord) {
            for (const p of list) {
              if (
                p.is_record_holder &&
                p.participation_id !== current.participation_id
              ) {
                bankHolderHold(p, now);
                p.is_record_holder = false;
              }
            }
            if (!current.is_record_holder) {
              current.record_hold_seconds = 0;
            }
            current.is_record_holder = true;
            current.record_held_since = now;
          }

          current.slot = 'removed';
          current.queue_position = null;
          current.leaderboard_eligible = true;

          const incoming = nextWaiting(list);
          if (incoming) {
            incoming.slot = 'on_court';
            incoming.queue_position = null;
            resumeHolderClockIfNeeded(list, now);
          }
          renumberWaiting(list);
        },
        'smash_attempt_recorded',
        {
          player_user_id: onCourt.player_user_id,
          got_new_record: command.gotNewRecord,
          detail: command.detail || null,
        },
        nextSequence,
        now
      );
    }
    case 'reorder_waiting': {
      const participants = state.participants as SmashParticipant[];
      if (waitingCount(participants) < 2) {
        return { message: 'Need at least two waiting players to reorder.' };
      }
      const ok = (() => {
        const draftCheck = cloneBoard(state);
        return reorderWaitingQueue(
          draftCheck.participants as SmashParticipant[],
          command.fromIndex,
          command.toIndex
        );
      })();
      if (!ok) return { message: 'Invalid waiting reorder.' };

      return applyMutation(
        state,
        draft => {
          reorderWaitingQueue(
            draft.participants as SmashParticipant[],
            command.fromIndex,
            command.toIndex
          );
        },
        'waiting_reordered',
        { from_index: command.fromIndex, to_index: command.toIndex },
        nextSequence,
        now
      );
    }
    case 'return_to_waiting': {
      const participants = state.participants as SmashParticipant[];
      const player = participants.find(
        p => p.player_user_id === command.playerId && p.slot === 'on_court'
      );
      if (!player) return { message: 'Court player not found.' };
      if (waitingCount(participants) >= WAITING_MAX) {
        return { message: `Waiting list is full (max ${WAITING_MAX}).` };
      }

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as SmashParticipant[];
          const p = list.find(x => x.player_user_id === command.playerId);
          if (p) {
            const nextPos = waitingCount(list) + 1;
            p.slot = 'waiting';
            p.queue_position = nextPos;
          }
          renumberWaiting(list);
        },
        'participant_returned_to_waiting',
        { name: player.player_name, player_user_id: player.player_user_id },
        nextSequence,
        now
      );
    }
    case 'requeue': {
      const participants = state.participants as SmashParticipant[];
      const player = participants.find(p => p.player_user_id === command.playerId);
      if (!player) return { message: 'Player not found.' };
      if (!player.leaderboard_eligible) {
        return { message: 'Player is not on the leaderboard.' };
      }
      if (player.slot !== 'removed') {
        return { message: 'Player is already active.' };
      }
      if (waitingCount(participants) >= WAITING_MAX) {
        return { message: `Waiting list is full (max ${WAITING_MAX}).` };
      }

      return applyMutation(
        state,
        draft => {
          const list = draft.participants as SmashParticipant[];
          const p = list.find(x => x.player_user_id === command.playerId);
          if (p) {
            const nextPos = waitingCount(list) + 1;
            p.slot = 'waiting';
            p.queue_position = nextPos;
          }
          renumberWaiting(list);
        },
        'participant_requeued',
        { name: player.player_name, player_user_id: player.player_user_id },
        nextSequence,
        now
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
        nextSequence,
        now
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
        nextSequence,
        now
      );
    }
    case 'complete': {
      const projected = projectSmashViews(state, now);
      if (!projected.can_complete) {
        return {
          message:
            projected.complete_blocked_reasons.join('; ') || 'Cannot complete.',
        };
      }
      return applyMutation(
        state,
        draft => {
          const list = draft.participants as SmashParticipant[];
          for (const p of list) {
            if (p.is_record_holder) {
              bankHolderHold(p, now);
            }
          }
          draft.session.status = 'completed';
          draft.session.completed_at = now;
        },
        'session_completed',
        null,
        nextSequence,
        now
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
        nextSequence,
        now
      );
    }
    default:
      return { message: 'Unknown command.' };
  }
}
