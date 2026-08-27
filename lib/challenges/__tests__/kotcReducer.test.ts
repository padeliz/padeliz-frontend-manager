import { projectKotcViews } from '../deriveFlags';
import { reduceKotc } from '../kotcReducer';
import {
  normalizeChallengeName,
  validateSessionTitle,
  validateTeamName,
  WAITING_MAX,
} from '../nameRules';
import { payloadSummary } from '../payloadSummary';
import { emptyBoard } from '../types';
import { applyCommandResult, applyUndo } from '../undo';
import type { ChallengeLocalDocument, KotcParticipant } from '../types';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `id-${Math.random().toString(16).slice(2)}`),
}));

const VALID_TITLE = 'King of the Court Live Session';

function sessionDoc(title = VALID_TITLE) {
  const state = emptyBoard({
    id_challenge_session: 1,
    type: 'king_of_the_court',
    status: 'active',
    title,
    bottom_text: title,
    started_at: 1,
    completed_at: null,
    inserted_at: 1,
  });
  const doc: ChallengeLocalDocument = {
    state,
    state_sequence: 0,
    actions: [],
    dirty: false,
  };
  return doc;
}

function addTeam(doc: ChallengeLocalDocument, name: string) {
  const r = reduceKotc(
    doc.state,
    { type: 'add_team', name },
    doc.state_sequence + 1
  );
  if (!('state' in r)) throw new Error(r.message || 'failed');
  return applyCommandResult(doc, r);
}

describe('nameRules', () => {
  it('validates team length', () => {
    expect(validateTeamName('short')).not.toBeNull();
    expect(validateTeamName('Long Enough Team Name')).toBeNull();
  });

  it('validates session title 20–50', () => {
    expect(validateSessionTitle('Too Short Title')).not.toBeNull();
    expect(validateSessionTitle('a'.repeat(19))).not.toBeNull();
    expect(validateSessionTitle('a'.repeat(51))).not.toBeNull();
    expect(validateSessionTitle('a'.repeat(20))).toBeNull();
    expect(validateSessionTitle('a'.repeat(50))).toBeNull();
    expect(validateSessionTitle(VALID_TITLE)).toBeNull();
  });

  it('normalizes names', () => {
    expect(normalizeChallengeName('  Café!!! ')).toBe('cafe');
  });
});

describe('payloadSummary', () => {
  it('summarizes actions', () => {
    expect(payloadSummary('participant_added', { name: 'Alpha Team X' })).toBe(
      'Added: Alpha Team X'
    );
    expect(payloadSummary('undo', null)).toBe('Undo');
    expect(
      payloadSummary('waiting_reordered', { from_index: 0, to_index: 1 })
    ).toBe('Waiting list reordered');
  });
});

describe('kotcReducer', () => {
  it('adds waiting team, jumps in, resolves match with auto-fill', () => {
    let doc = sessionDoc();
    const names = [
      'Team Alpha One',
      'Team Bravo Two',
      'Team Charlie Three',
    ];
    for (const name of names) {
      doc = addTeam(doc, name);
    }

    expect(doc.state.waiting).toHaveLength(3);

    const waitingIds = doc.state.waiting.map(
      (w: { team_id: string }) => w.team_id
    );
    let r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: waitingIds[0], slot: 'court_a' },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: waitingIds[1], slot: 'court_b' },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    expect(doc.state.court_count).toBe(2);
    expect(doc.state.can_complete).toBe(false);

    const winnerId = (doc.state.court as { team_a: { team_id: string } }).team_a
      .team_id;
    r = reduceKotc(
      doc.state,
      { type: 'resolve_match', winnerTeamId: winnerId },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    expect(doc.state.court_count).toBe(2);
    expect(doc.state.waiting).toHaveLength(0);
  });

  it('sets leaderboard_eligible false on create; jump-in does not set flag', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    const p = (doc.state.participants as KotcParticipant[])[0];
    expect(p.leaderboard_eligible).toBe(false);
    expect(projectKotcViews(doc.state).leaderboard).toHaveLength(0);

    const teamId = p.team_id;
    const r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId, slot: 'court_a' },
      2
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    const after = (doc.state.participants as KotcParticipant[]).find(
      x => x.team_id === teamId
    )!;
    expect(after.leaderboard_eligible).toBe(false);
    expect(projectKotcViews(doc.state).leaderboard).toHaveLength(0);
  });

  it('marks winner and loser eligible on resolve; winner stays on LB while on court', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    doc = addTeam(doc, 'Team Bravo Two');
    const [a, b] = doc.state.waiting as { team_id: string }[];
    let r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: a.team_id, slot: 'court_a' },
      3
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: b.team_id, slot: 'court_b' },
      4
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceKotc(
      doc.state,
      { type: 'resolve_match', winnerTeamId: a.team_id },
      5
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const parts = doc.state.participants as KotcParticipant[];
    expect(parts.find(p => p.team_id === a.team_id)!.leaderboard_eligible).toBe(
      true
    );
    expect(parts.find(p => p.team_id === b.team_id)!.leaderboard_eligible).toBe(
      true
    );
    const lb = projectKotcViews(doc.state).leaderboard as {
      team_id: string;
      position: number;
    }[];
    expect(lb.map(x => x.team_id)).toEqual(
      expect.arrayContaining([a.team_id, b.team_id])
    );
    expect(lb.every(x => typeof x.position === 'number')).toBe(true);
  });

  it('remove from waiting only does not set eligibility', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    const teamId = (doc.state.waiting[0] as { team_id: string }).team_id;
    const r = reduceKotc(doc.state, { type: 'remove_team', teamId }, 2);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    const p = (doc.state.participants as KotcParticipant[]).find(
      x => x.team_id === teamId
    )!;
    expect(p.leaderboard_eligible).toBe(false);
    expect(projectKotcViews(doc.state).leaderboard).toHaveLength(0);
  });

  it('eligible revive to waiting stays on LB', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    doc = addTeam(doc, 'Team Bravo Two');
    const [a, b] = doc.state.waiting as { team_id: string }[];
    let r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: a.team_id, slot: 'court_a' },
      3
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: b.team_id, slot: 'court_b' },
      4
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceKotc(
      doc.state,
      { type: 'resolve_match', winnerTeamId: a.team_id },
      5
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const loser = (doc.state.participants as KotcParticipant[]).find(
      p => p.team_id === b.team_id
    )!;
    expect(loser.slot).toBe('removed');
    expect(loser.leaderboard_eligible).toBe(true);

    r = reduceKotc(doc.state, { type: 'add_team', name: 'Team Bravo Two' }, 6);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    const revived = (doc.state.participants as KotcParticipant[]).find(
      p => p.team_id === b.team_id
    )!;
    expect(revived.slot).toBe('waiting');
    expect(revived.leaderboard_eligible).toBe(true);
    expect(
      projectKotcViews(doc.state).leaderboard.some(
        (row: { team_id: string }) => row.team_id === b.team_id
      )
    ).toBe(true);
  });

  it('rejects add when waiting is full', () => {
    let doc = sessionDoc();
    for (let i = 0; i < WAITING_MAX; i++) {
      doc = addTeam(doc, `Team Number ${String(i).padStart(2, '0')}XX`);
    }
    const r = reduceKotc(
      doc.state,
      { type: 'add_team', name: 'Team Overflow One' },
      doc.state_sequence + 1
    );
    expect('state' in r).toBe(false);
    expect((r as { message: string }).message).toMatch(/full/i);
  });

  it('duplicate waiting/court returns duplicate_active', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    let r = reduceKotc(doc.state, { type: 'add_team', name: 'Team Alpha One' }, 2);
    expect(r).toMatchObject({
      code: 'duplicate_active',
      duplicate: { location: 'waiting' },
    });

    const teamId = (doc.state.waiting[0] as { team_id: string }).team_id;
    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId, slot: 'court_a' },
      2
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceKotc(doc.state, { type: 'add_team', name: 'Team Alpha One' }, 3);
    expect(r).toMatchObject({
      code: 'duplicate_active',
      duplicate: { location: 'court', id: teamId },
    });
  });

  it('revives removed never-courted with same team_id', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    const teamId = (doc.state.waiting[0] as { team_id: string }).team_id;
    let r = reduceKotc(doc.state, { type: 'remove_team', teamId }, 2);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceKotc(doc.state, { type: 'add_team', name: 'Team Alpha One' }, 3);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    const revived = (doc.state.participants as KotcParticipant[]).find(
      p => p.name_normalized === normalizeChallengeName('Team Alpha One')
    )!;
    expect(revived.team_id).toBe(teamId);
    expect(revived.slot).toBe('waiting');
  });

  it('rename outside 20–50 rejects; in range accepts', () => {
    let doc = sessionDoc();
    let r = reduceKotc(doc.state, { type: 'rename', title: 'Short' }, 1);
    expect('state' in r).toBe(false);

    r = reduceKotc(
      doc.state,
      { type: 'rename', title: 'Valid Renamed Challenge Title' },
      1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    expect(doc.state.session.title).toBe('Valid Renamed Challenge Title');
  });

  it('rename_bottom_text rejects invalid; accepts and undoes', () => {
    let doc = sessionDoc();
    let r = reduceKotc(
      doc.state,
      { type: 'rename_bottom_text', bottom_text: 'Short' },
      1
    );
    expect('state' in r).toBe(false);

    r = reduceKotc(
      doc.state,
      { type: 'rename_bottom_text', bottom_text: 'Valid Renamed Bottom Text X' },
      1
    );
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('session_bottom_text_renamed');
    expect(r.action.payload_summary).toBe(
      'Bottom text: Valid Renamed Bottom Text X'
    );
    doc = applyCommandResult(doc, r);
    expect(doc.state.session.bottom_text).toBe('Valid Renamed Bottom Text X');

    const undone = applyUndo(doc);
    expect(undone.ok).toBe(true);
    if (undone.ok) {
      expect(undone.doc.state.session.bottom_text).toBe(VALID_TITLE);
    }
  });

  it('reorder_waiting renumbers queue and is undoable', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    doc = addTeam(doc, 'Team Bravo Two');
    doc = addTeam(doc, 'Team Charlie Three');

    const before = (doc.state.waiting as { team_id: string }[]).map(w => w.team_id);
    const r = reduceKotc(
      doc.state,
      { type: 'reorder_waiting', fromIndex: 0, toIndex: 2 },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('waiting_reordered');
    expect(r.action.payload_summary).toBe('Waiting list reordered');
    doc = applyCommandResult(doc, r);

    const after = doc.state.waiting as {
      team_id: string;
      queue_position: number;
    }[];
    expect(after.map(w => w.team_id)).toEqual([before[1], before[2], before[0]]);
    expect(after.map(w => w.queue_position)).toEqual([1, 2, 3]);

    const undone = applyUndo(doc);
    expect(undone.ok).toBe(true);
  });

  it('rejects completed mutations', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    const teamId = (doc.state.waiting[0] as { team_id: string }).team_id;
    let r = reduceKotc(doc.state, { type: 'remove_team', teamId }, 2);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceKotc(doc.state, { type: 'complete' }, 3);
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    r = reduceKotc(doc.state, { type: 'add_team', name: 'Team Bravo Two' }, 4);
    expect('state' in r).toBe(false);
  });

  it('tip undo restores before_state, pops tip, bumps sequence, sets dirty', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    expect(doc.state_sequence).toBe(1);
    expect(doc.dirty).toBe(true);
    expect(doc.actions).toHaveLength(1);
    expect('after_state' in doc.actions[0]).toBe(false);
    expect(doc.actions[0].before_state).toBeTruthy();

    const undone = applyUndo(doc);
    expect(undone.ok).toBe(true);
    if (!undone.ok) return;
    expect(undone.kind).toBe('tip_undo');
    expect(undone.doc.state_sequence).toBe(2);
    expect(undone.doc.dirty).toBe(true);
    expect(undone.doc.actions).toHaveLength(0);
    expect(undone.doc.state.waiting).toHaveLength(0);
  });

  it('tip undo does not append an undo action', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    doc = addTeam(doc, 'Team Bravo Two');
    const undone = applyUndo(doc);
    expect(undone.ok).toBe(true);
    if (!undone.ok) return;
    expect(undone.doc.actions.every(a => a.action_type !== 'undo')).toBe(true);
    expect(undone.doc.actions).toHaveLength(1);
    expect(undone.doc.state_sequence).toBe(3);
  });

  it('return_to_waiting moves court team to end of waiting without auto-promote', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    doc = addTeam(doc, 'Team Bravo Two');
    doc = addTeam(doc, 'Team Charlie Three');
    const [a, b] = doc.state.waiting as { team_id: string }[];

    let r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: a.team_id, slot: 'court_a' },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: b.team_id, slot: 'court_b' },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const waitingBefore = doc.state.waiting.length;
    const before = (doc.state.participants as KotcParticipant[]).find(
      p => p.team_id === a.team_id
    )!;

    r = reduceKotc(
      doc.state,
      { type: 'return_to_waiting', teamId: a.team_id },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('participant_returned_to_waiting');
    expect(payloadSummary('participant_returned_to_waiting', r.action.payload)).toMatch(
      /Returned to waiting/
    );
    doc = applyCommandResult(doc, r);

    const returned = (doc.state.participants as KotcParticipant[]).find(
      p => p.team_id === a.team_id
    )!;
    expect(returned.slot).toBe('waiting');
    expect(returned.queue_position).toBe(waitingBefore + 1);
    expect(returned.current_streak).toBe(before.current_streak);
    expect(returned.leaderboard_eligible).toBe(before.leaderboard_eligible);
    expect((doc.state.court as { team_a: unknown }).team_a).toBeNull();
    expect((doc.state.court as { team_b: { team_id: string } }).team_b.team_id).toBe(
      b.team_id
    );
    expect(doc.state.waiting).toHaveLength(waitingBefore + 1);

    expect(applyUndo(doc).ok).toBe(true);

    r = reduceKotc(
      doc.state,
      { type: 'return_to_waiting', teamId: a.team_id },
      doc.state_sequence + 1
    );
    // a is still waiting at end in current doc (undo not applied to doc)
    expect('state' in r).toBe(false);
  });

  it('requeue from removed eligible team', () => {
    let doc = sessionDoc();
    doc = addTeam(doc, 'Team Alpha One');
    doc = addTeam(doc, 'Team Bravo Two');
    const [a, b] = doc.state.waiting as { team_id: string }[];
    let r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: a.team_id, slot: 'court_a' },
      3
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: b.team_id, slot: 'court_b' },
      4
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceKotc(
      doc.state,
      { type: 'resolve_match', winnerTeamId: a.team_id },
      5
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    const loser = (doc.state.participants as KotcParticipant[]).find(
      p => p.team_id === b.team_id
    )!;
    expect(loser.slot).toBe('removed');
    expect(loser.leaderboard_eligible).toBe(true);

    const endBefore = doc.state.waiting.length;
    r = reduceKotc(doc.state, { type: 'requeue', teamId: b.team_id }, 6);
    if (!('state' in r)) throw new Error(r.message);
    expect(r.action.action_type).toBe('participant_requeued');
    expect(payloadSummary('participant_requeued', r.action.payload)).toMatch(
      /Requeued/
    );
    doc = applyCommandResult(doc, r);

    const requeued = (doc.state.participants as KotcParticipant[]).find(
      p => p.team_id === b.team_id
    )!;
    expect(requeued.slot).toBe('waiting');
    expect(requeued.queue_position).toBe(endBefore + 1);
    expect(requeued.leaderboard_eligible).toBe(true);
    expect(
      projectKotcViews(doc.state).leaderboard.some(
        (row: { team_id: string }) => row.team_id === b.team_id
      )
    ).toBe(true);

    r = reduceKotc(doc.state, { type: 'requeue', teamId: b.team_id }, 7);
    expect('state' in r).toBe(false);

    r = reduceKotc(doc.state, { type: 'requeue', teamId: a.team_id }, 7);
    expect('state' in r).toBe(false);
  });

  it('return_to_waiting rejects when waiting is full', () => {
    let doc = sessionDoc();
    for (let i = 0; i < WAITING_MAX; i++) {
      doc = addTeam(doc, `Team Number ${String(i).padStart(2, '0')}XX`);
    }
    const ids = (doc.state.waiting as { team_id: string }[]).map(w => w.team_id);
    let r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: ids[0], slot: 'court_a' },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    doc = addTeam(doc, 'Team Extra Fill XX');
    expect(doc.state.waiting).toHaveLength(WAITING_MAX);

    r = reduceKotc(
      doc.state,
      { type: 'return_to_waiting', teamId: ids[0] },
      doc.state_sequence + 1
    );
    expect('state' in r).toBe(false);
  });

  it('winner only bumps current; display derives Best/Other from live + completed', () => {
    const ensureCourtFull = (d: ChallengeLocalDocument, kingId: string) => {
      let doc = d;
      const onCourt = (doc.state.participants as KotcParticipant[]).filter(
        p => p.slot === 'court_a' || p.slot === 'court_b'
      );
      if (onCourt.length === 2) return doc;
      let waiting = doc.state.waiting as Array<{ team_id: string }>;
      if (waiting.length === 0) {
        const removed = (doc.state.participants as KotcParticipant[]).find(
          p => p.slot === 'removed' && p.team_id !== kingId
        );
        if (!removed) throw new Error('no challenger');
        const rq = reduceKotc(
          doc.state,
          { type: 'requeue', teamId: removed.team_id },
          doc.state_sequence + 1
        );
        if (!('state' in rq)) throw new Error(rq.message);
        doc = applyCommandResult(doc, rq);
        waiting = doc.state.waiting as Array<{ team_id: string }>;
      }
      const empty = (doc.state.participants as KotcParticipant[]).some(
        p => p.slot === 'court_a'
      )
        ? 'court_b'
        : 'court_a';
      const ji = reduceKotc(
        doc.state,
        { type: 'jump_in', teamId: waiting[0].team_id, slot: empty },
        doc.state_sequence + 1
      );
      if (!('state' in ji)) throw new Error(ji.message);
      return applyCommandResult(doc, ji);
    };

    const alphaWins = (d: ChallengeLocalDocument, kingId: string) => {
      let doc = ensureCourtFull(d, kingId);
      const r = reduceKotc(
        doc.state,
        { type: 'resolve_match', winnerTeamId: kingId },
        doc.state_sequence + 1
      );
      if (!('state' in r)) throw new Error(r.message);
      return applyCommandResult(doc, r);
    };

    let doc = sessionDoc();
    for (const name of [
      'Alpha Squad One XX',
      'Bravo Squad Two XX',
      'Charlie Squad Three',
      'Delta Squad Four XX',
      'Echo Squad Five XXX',
      'Foxtrot Squad Six X',
    ]) {
      doc = addTeam(doc, name);
    }
    const alpha = (doc.state.waiting as Array<{ team_id: string }>)[0].team_id;
    const second = (doc.state.waiting as Array<{ team_id: string }>)[1].team_id;

    let r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: alpha, slot: 'court_a' },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: second, slot: 'court_b' },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    for (let i = 0; i < 4; i += 1) {
      doc = alphaWins(doc, alpha);
    }

    let p = (doc.state.participants as KotcParticipant[]).find(
      x => x.team_id === alpha
    )!;
    expect(p.current_streak).toBe(4);
    expect(p.biggest_streak).toBe(0);
    expect(p.second_biggest_streak).toBe(0);
    const kingCourt = (
      projectKotcViews(doc.state).court as {
        team_a: { team_id: string; biggest_streak: number; second_biggest_streak: number } | null;
        team_b: { team_id: string; biggest_streak: number; second_biggest_streak: number } | null;
      }
    );
    const kingRow =
      kingCourt.team_a?.team_id === alpha ? kingCourt.team_a : kingCourt.team_b;
    expect(kingRow?.biggest_streak).toBe(4);
    expect(kingRow?.second_biggest_streak).toBe(0);

    doc = ensureCourtFull(doc, alpha);
    const foe = (doc.state.participants as KotcParticipant[]).find(
      x =>
        (x.slot === 'court_a' || x.slot === 'court_b') && x.team_id !== alpha
    )!;
    r = reduceKotc(
      doc.state,
      { type: 'resolve_match', winnerTeamId: foe.team_id },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    p = (doc.state.participants as KotcParticipant[]).find(
      x => x.team_id === alpha
    )!;
    expect(p.biggest_streak).toBe(4);
    expect(p.second_biggest_streak).toBe(0);
    expect(p.current_streak).toBe(0);

    r = reduceKotc(
      doc.state,
      { type: 'requeue', teamId: alpha },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);
    const empty = (doc.state.participants as KotcParticipant[]).some(
      x => x.slot === 'court_a'
    )
      ? 'court_b'
      : 'court_a';
    r = reduceKotc(
      doc.state,
      { type: 'jump_in', teamId: alpha, slot: empty },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    for (let i = 0; i < 2; i += 1) {
      doc = alphaWins(doc, alpha);
    }
    p = (doc.state.participants as KotcParticipant[]).find(
      x => x.team_id === alpha
    )!;
    expect(p.biggest_streak).toBe(4);
    expect(p.current_streak).toBe(2);
    expect(
      (
        projectKotcViews(doc.state).leaderboard.find(
          (row: { team_id: string }) => row.team_id === alpha
        ) as { biggest_streak: number; second_biggest_streak: number }
      ).second_biggest_streak
    ).toBe(2);

    for (let i = 0; i < 4; i += 1) {
      doc = alphaWins(doc, alpha);
    }
    p = (doc.state.participants as KotcParticipant[]).find(
      x => x.team_id === alpha
    )!;
    expect(p.current_streak).toBe(6);
    expect(p.biggest_streak).toBe(4);
    const hot = projectKotcViews(doc.state).leaderboard.find(
      (row: { team_id: string }) => row.team_id === alpha
    ) as { biggest_streak: number; second_biggest_streak: number };
    expect(hot.biggest_streak).toBe(6);
    expect(hot.second_biggest_streak).toBe(4);

    doc = ensureCourtFull(doc, alpha);
    const foe2 = (doc.state.participants as KotcParticipant[]).find(
      x =>
        (x.slot === 'court_a' || x.slot === 'court_b') && x.team_id !== alpha
    )!;
    r = reduceKotc(
      doc.state,
      { type: 'resolve_match', winnerTeamId: foe2.team_id },
      doc.state_sequence + 1
    );
    if (!('state' in r)) throw new Error(r.message);
    doc = applyCommandResult(doc, r);

    p = (doc.state.participants as KotcParticipant[]).find(
      x => x.team_id === alpha
    )!;
    expect(p.biggest_streak).toBe(6);
    expect(p.second_biggest_streak).toBe(4);
    expect(p.current_streak).toBe(0);
  });
});
