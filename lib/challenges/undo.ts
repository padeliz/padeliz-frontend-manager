import type {
  ChallengeActionRecord,
  ChallengeBoardState,
  ChallengeDomainError,
  ChallengeLocalDocument,
} from './types';
import { trimActionsForStatus } from './localStore';

const NON_UNDOABLE = new Set([
  'session_completed',
  'session_reactivated',
  'undo',
]);

export function findUndoTarget(
  actions: ChallengeActionRecord[]
): ChallengeActionRecord | null {
  for (let i = actions.length - 1; i >= 0; i -= 1) {
    const a = actions[i];
    if (NON_UNDOABLE.has(a.action_type)) continue;
    return a;
  }
  return null;
}

export type UndoResult =
  | {
      ok: true;
      doc: ChallengeLocalDocument;
      kind: 'tip_undo';
    }
  | { ok: false; error: ChallengeDomainError };

/**
 * Tip undo: restore before_state, pop tip, bump state_sequence (never rewind).
 */
export function applyUndo(doc: ChallengeLocalDocument): UndoResult {
  if (doc.state.session.status === 'completed') {
    return { ok: false, error: { message: 'Session is completed.' } };
  }

  const target = findUndoTarget(doc.actions);
  if (!target) {
    return { ok: false, error: { message: 'Nothing to undo.' } };
  }

  return {
    ok: true,
    kind: 'tip_undo',
    doc: {
      state: target.before_state,
      state_sequence: doc.state_sequence + 1,
      actions: doc.actions.filter(
        a => a.client_action_id !== target.client_action_id
      ),
      dirty: true,
    },
  };
}

export function applyCommandResult(
  doc: ChallengeLocalDocument,
  result: { state: ChallengeBoardState; action: ChallengeActionRecord }
): ChallengeLocalDocument {
  const actions = [...doc.actions, result.action];
  const next: ChallengeLocalDocument = {
    state: result.state,
    state_sequence: result.action.sequence_number,
    actions: trimActionsForStatus(actions, result.state.session.status),
    dirty: true,
  };
  return next;
}
