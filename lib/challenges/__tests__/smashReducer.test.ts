import { liveHoldSeconds, projectSmashViews } from '../deriveFlags';
import { reduceSmash } from '../smashReducer';
import {
  normalizeChallengeName,
  validateSessionTitle,
  WAITING_MAX,
} from '../nameRules';
import { payloadSummary } from '../payloadSummary';
import type {
  ChallengeLocalDocument,
  SmashParticipant,
} from '../types';
import { emptyBoard } from '../types';
import { applyCommandResult, applyUndo } from '../undo';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `id-${Math.random().toString(16).slice(2)}`),
}));

const VALID_TITLE = 'Smash Contest Live Session XX';

function smashDoc(title = VALID_TITLE): ChallengeLocalDocument {
  return {
    state: emptyBoard({
      id_challenge_session: 2,
      type: 'smash_contest',
      status: 'active',
      title,
      bottom_text: title,
      started_at: 1,
      completed_at: null,
      inserted_at: 1,
    }),
    state_sequence: 0,
    actions: [],
    dirty: false,
  };
}

function addPlayer(
  doc: ChallengeLocalDocument,
  name: string,
  now = 1_000_000
) {
  const r = reduceSmash(
    doc.state,
    { type: 'add_player', name },
    doc.state_sequence + 1,
    now
  );
  if (!('state' in r)) throw new Error(r.message || 'failed');
  return applyCommandResult(doc, r);
}

describe('smashReducer', () => {
  it('records attempt and sets record holder with auto-fill', () => {
    let doc = smashDoc();
    const now = 1_000_000;

    for (const name of ['Player Alpha', 'Player Bravo']) {
      doc = addPlayer(doc, name, now);
    }

    const firstId = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;
    let r = reduceSmash(
      doc.state,
      { type: 'jump_in', playerId: firstId },
      doc.state_sequence + 1,
      now
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      doc.state_sequence + 1,
      now + 10
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const holder = (doc.state.participants as SmashParticipant[]).find(
      p => p.is_record_holder
    );
    expect(holder).toBeTruthy();
    expect(holder!.record_held_since).toBe(now + 10);
    expect(doc.state.court).not.toBeNull();
  });

  it('new player off LB; jump-in does not set eligibility', () => {
    let doc = smashDoc();
    doc = addPlayer(doc, 'Player Alpha');
    const p = (doc.state.participants as SmashParticipant[])[0];
    expect(p.leaderboard_eligible).toBe(false);
    expect(projectSmashViews(doc.state, 1_000_000).leaderboard).toHaveLength(0);

    const r = reduceSmash(
      doc.state,
      { type: 'jump_in', playerId: p.player_user_id },
      2,
      1_000_000
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    expect(
      (doc.state.participants as SmashParticipant[])[0].leaderboard_eligible
    ).toBe(false);
  });

  it('record_attempt sets eligible and position on LB', () => {
    let doc = smashDoc();
    const now = 1_000_000;
    doc = addPlayer(doc, 'Player Alpha', now);
    const playerId = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;
    let r = reduceSmash(doc.state, { type: 'jump_in', playerId }, 2, now);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: false },
      3,
      now + 5
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const p = (doc.state.participants as SmashParticipant[]).find(
      x => x.player_user_id === playerId
    )!;
    expect(p.leaderboard_eligible).toBe(true);
    const lb = projectSmashViews(doc.state, now + 5).leaderboard as {
      position: number;
      session_tries: number;
      is_record_holder: boolean;
      record_hold_seconds: number;
    }[];
    expect(lb).toHaveLength(1);
    expect(lb[0].position).toBe(1);
    expect(lb[0].session_tries).toBeGreaterThanOrEqual(1);
  });

  it('record with new record also sets eligibility', () => {
    let doc = smashDoc();
    const now = 1_000_000;
    doc = addPlayer(doc, 'Player Alpha', now);
    const playerId = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;
    let r = reduceSmash(doc.state, { type: 'jump_in', playerId }, 2, now);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      3,
      now + 5
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    expect(
      (doc.state.participants as SmashParticipant[]).find(
        p => p.player_user_id === playerId
      )!.leaderboard_eligible
    ).toBe(true);
  });

  it('remove from waiting only stays off LB', () => {
    let doc = smashDoc();
    doc = addPlayer(doc, 'Player Alpha');
    const playerId = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;
    const r = reduceSmash(doc.state, { type: 'remove_player', playerId }, 2);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    expect(
      (doc.state.participants as SmashParticipant[])[0].leaderboard_eligible
    ).toBe(false);
    expect(projectSmashViews(doc.state).leaderboard).toHaveLength(0);
  });

  it('revive / duplicate_active / max 6 / rename / reorder_waiting', () => {
    let doc = smashDoc();
    doc = addPlayer(doc, 'Player Alpha');
    let r = reduceSmash(
      doc.state,
      { type: 'add_player', name: 'Player Alpha' },
      2
    );
    expect(r).toMatchObject({
      code: 'duplicate_active',
      duplicate: { location: 'waiting' },
    });

    const playerId = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;
    r = reduceSmash(doc.state, { type: 'remove_player', playerId }, 2);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(doc.state, { type: 'add_player', name: 'Player Alpha' }, 3);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    expect(
      (doc.state.participants as SmashParticipant[]).find(
        p => p.name_normalized === normalizeChallengeName('Player Alpha')
      )!.player_user_id
    ).toBe(playerId);

    doc = smashDoc();
    for (let i = 0; i < WAITING_MAX; i++) {
      doc = addPlayer(doc, `Player ${String(i).padStart(2, '0')}XX`);
    }
    r = reduceSmash(
      doc.state,
      { type: 'add_player', name: 'Player Overflow' },
      doc.state_sequence + 1
    );
    expect('state' in r).toBe(false);

    doc = smashDoc();
    r = reduceSmash(doc.state, { type: 'rename', title: 'Short' }, 1);
    expect('state' in r).toBe(false);
    expect(validateSessionTitle('Short')).not.toBeNull();
    r = reduceSmash(
      doc.state,
      { type: 'rename', title: 'Valid Smash Contest Title XX' },
      1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    expect(doc.state.session.title).toBe('Valid Smash Contest Title XX');

    doc = smashDoc();
    r = reduceSmash(
      doc.state,
      { type: 'rename_bottom_text', bottom_text: 'Short' },
      1
    );
    expect('state' in r).toBe(false);
    r = reduceSmash(
      doc.state,
      { type: 'rename_bottom_text', bottom_text: 'Valid Smash Bottom Text XX' },
      1
    );
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('session_bottom_text_renamed');
    expect(payloadSummary('session_bottom_text_renamed', {
      bottom_text: 'Valid Smash Bottom Text XX',
    })).toBe('Bottom text: Valid Smash Bottom Text XX');
    doc = applyCommandResult(doc, r);
    expect(doc.state.session.bottom_text).toBe('Valid Smash Bottom Text XX');
    const undoneBottom = applyUndo(doc);
    expect(undoneBottom.ok).toBe(true);
    if (undoneBottom.ok) {
      expect(undoneBottom.doc.state.session.bottom_text).toBe(VALID_TITLE);
    }

    doc = smashDoc();
    doc = addPlayer(doc, 'Player Alpha');
    doc = addPlayer(doc, 'Player Bravo');
    const before = (doc.state.waiting as { player_user_id: string }[]).map(
      w => w.player_user_id
    );
    r = reduceSmash(
      doc.state,
      { type: 'reorder_waiting', fromIndex: 0, toIndex: 1 },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('waiting_reordered');
    expect(payloadSummary('waiting_reordered', r.action.payload)).toBe(
      'Waiting list reordered'
    );
    doc = applyCommandResult(doc, r);
    expect(
      (doc.state.waiting as { player_user_id: string }[]).map(w => w.player_user_id)
    ).toEqual([before[1], before[0]]);
    expect(applyUndo(doc).ok).toBe(true);
  });

  it('banks hold on complete and resumes held_since only on court entry after reactivate', () => {
    let doc = smashDoc();
    const t0 = 2_000_000;

    let r = reduceSmash(
      doc.state,
      { type: 'add_player', name: 'Player Alpha' },
      1,
      t0
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const playerId = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;
    r = reduceSmash(doc.state, { type: 'jump_in', playerId }, 2, t0);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      3,
      t0 + 5
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    expect(doc.state.court).toBeNull();
    expect(doc.state.can_complete).toBe(true);

    r = reduceSmash(doc.state, { type: 'complete' }, 4, t0 + 65);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    let holder = (doc.state.participants as SmashParticipant[]).find(
      p => p.is_record_holder
    )!;
    expect(holder.record_held_since).toBeNull();
    expect(holder.record_hold_seconds).toBe(60);

    r = reduceSmash(doc.state, { type: 'reactivate' }, 5, t0 + 100);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    holder = (doc.state.participants as SmashParticipant[]).find(
      p => p.is_record_holder
    )!;
    expect(holder.record_held_since).toBeNull();

    r = reduceSmash(
      doc.state,
      { type: 'add_player', name: 'Player Bravo' },
      6,
      t0 + 110
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    const bravo = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;

    r = reduceSmash(doc.state, { type: 'jump_in', playerId: bravo }, 7, t0 + 120);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    holder = (doc.state.participants as SmashParticipant[]).find(
      p => p.is_record_holder
    )!;
    expect(holder.record_held_since).toBe(t0 + 120);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: false },
      8,
      t0 + 130
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'add_player', name: 'Player Charlie' },
      9,
      t0 + 140
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    const charlie = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;
    const heldBefore = (doc.state.participants as SmashParticipant[]).find(
      p => p.is_record_holder
    )!.record_held_since;

    r = reduceSmash(doc.state, { type: 'jump_in', playerId: charlie }, 10, t0 + 150);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const heldAfter = (doc.state.participants as SmashParticipant[]).find(
      p => p.is_record_holder
    )!.record_held_since;
    expect(heldAfter).toBe(heldBefore);
  });

  it('return_to_waiting and requeue preserve holder clock fields', () => {
    let doc = smashDoc();
    const t0 = 3_000_000;
    doc = addPlayer(doc, 'Player Alpha', t0);
    doc = addPlayer(doc, 'Player Bravo', t0);
    const [a, b] = doc.state.waiting as { player_user_id: string }[];

    let r = reduceSmash(
      doc.state,
      { type: 'jump_in', playerId: a.player_user_id },
      doc.state_sequence + 1,
      t0
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      doc.state_sequence + 1,
      t0 + 10
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const onCourtId = (doc.state.court as { player_user_id: string }).player_user_id;
    expect(onCourtId).toBe(b.player_user_id);

    r = reduceSmash(
      doc.state,
      { type: 'return_to_waiting', playerId: onCourtId },
      doc.state_sequence + 1,
      t0 + 20
    );
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('participant_returned_to_waiting');
    doc = applyCommandResult(doc, r);

    expect(doc.state.court).toBeNull();
    const returned = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === onCourtId
    )!;
    expect(returned.slot).toBe('waiting');
    expect(returned.session_tries).toBe(0);
    expect(returned.leaderboard_eligible).toBe(false);

    const holder = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === a.player_user_id
    )!;
    expect(holder.is_record_holder).toBe(true);
    expect(holder.record_held_since).toBe(t0 + 10);
    const holdAt20 = liveHoldSeconds(holder, t0 + 20);
    const holdAt40 = liveHoldSeconds(holder, t0 + 40);
    expect(holdAt40).toBeGreaterThan(holdAt20);

    r = reduceSmash(
      doc.state,
      { type: 'jump_in', playerId: onCourtId },
      doc.state_sequence + 1,
      t0 + 50
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: false },
      doc.state_sequence + 1,
      t0 + 55
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const removed = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === onCourtId
    )!;
    expect(removed.slot).toBe('removed');
    expect(removed.leaderboard_eligible).toBe(true);

    const waitingLen = doc.state.waiting.length;
    r = reduceSmash(
      doc.state,
      { type: 'requeue', playerId: onCourtId },
      doc.state_sequence + 1,
      t0 + 60
    );
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('participant_requeued');
    doc = applyCommandResult(doc, r);
    const requeued = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === onCourtId
    )!;
    expect(requeued.slot).toBe('waiting');
    expect(requeued.queue_position).toBe(waitingLen + 1);
    expect(requeued.leaderboard_eligible).toBe(true);
  });

  it('resets record_hold_seconds when player newly becomes holder', () => {
    let doc = smashDoc();
    const t0 = 4_000_000;
    doc = addPlayer(doc, 'Player Alpha', t0);
    const alpha = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;

    let r = reduceSmash(doc.state, { type: 'jump_in', playerId: alpha }, 2, t0);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      3,
      t0 + 10
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const holder = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === alpha
    )!;
    expect(holder.is_record_holder).toBe(true);
    expect(holder.record_hold_seconds).toBe(0);
  });

  it('preserves record_hold_seconds when holder breaks record again', () => {
    let doc = smashDoc();
    const t0 = 4_000_000;
    doc = addPlayer(doc, 'Player Alpha', t0);
    doc = addPlayer(doc, 'Player Bravo', t0);
    const alpha = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;

    let r = reduceSmash(doc.state, { type: 'jump_in', playerId: alpha }, 2, t0);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      3,
      t0 + 10
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'return_to_waiting', playerId: (doc.state.court as { player_user_id: string }).player_user_id },
      4,
      t0 + 15
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(doc.state, { type: 'requeue', playerId: alpha }, 5, t0 + 16);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(doc.state, { type: 'jump_in', playerId: alpha }, 6, t0 + 20);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const holder = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === alpha
    )!;
    expect(holder.is_record_holder).toBe(true);
    holder.record_hold_seconds = 120;

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      7,
      t0 + 30
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const stillHolder = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === alpha
    )!;
    expect(stillHolder.is_record_holder).toBe(true);
    expect(stillHolder.record_hold_seconds).toBe(120);
  });

  it('resets record_hold_seconds when former holder reclaims record', () => {
    let doc = smashDoc();
    const t0 = 5_000_000;
    doc = addPlayer(doc, 'Player Alpha', t0);
    doc = addPlayer(doc, 'Player Bravo', t0);
    const alpha = (doc.state.waiting[0] as { player_user_id: string }).player_user_id;

    let r = reduceSmash(doc.state, { type: 'jump_in', playerId: alpha }, 2, t0);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      3,
      t0 + 10
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      4,
      t0 + 20
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const formerHolder = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === alpha
    )!;
    expect(formerHolder.is_record_holder).toBe(false);

    r = reduceSmash(doc.state, { type: 'requeue', playerId: alpha }, 5, t0 + 25);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceSmash(doc.state, { type: 'jump_in', playerId: alpha }, 6, t0 + 30);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceSmash(
      doc.state,
      { type: 'record_attempt', gotNewRecord: true },
      7,
      t0 + 40
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const reclaimed = (doc.state.participants as SmashParticipant[]).find(
      p => p.player_user_id === alpha
    )!;
    expect(reclaimed.is_record_holder).toBe(true);
    expect(reclaimed.record_hold_seconds).toBe(0);
  });
});
