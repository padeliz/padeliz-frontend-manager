import {
  displayKotcStreaks,
  liveHoldSeconds,
  mergeStreak,
  projectKotcViews,
  projectSmashViews,
} from '../deriveFlags';
import type {
  ChallengeBoardState,
  KotcParticipant,
  SmashParticipant,
} from '../types';

function smashState(
  participants: SmashParticipant[]
): ChallengeBoardState {
  return {
    session: {
      id_challenge_session: 1,
      type: 'smash_contest',
      status: 'active',
      title: 'Smash Contest Live Session XX',
      bottom_text: 'Smash Contest Live Session XX',
      started_at: 1,
      completed_at: null,
    },
    participants,
    can_manual_jump_in: true,
    can_complete: true,
    complete_blocked_reasons: [],
    court_count: 0,
    waiting: [],
    court: null,
    leaderboard: [],
  };
}

function baseSmash(
  overrides: Partial<SmashParticipant> & Pick<SmashParticipant, 'player_id' | 'player_name'>
): SmashParticipant {
  return {
    participation_id: `part-${overrides.player_id}`,
    name_normalized: overrides.player_name.toLowerCase(),
    slot: 'removed',
    queue_position: null,
    session_tries: 0,
    record_hold_seconds: 0,
    is_record_holder: false,
    record_held_since: null,
    leaderboard_eligible: true,
    ...overrides,
  };
}

describe('projectSmashViews leaderboard tiers', () => {
  const now = 1_000_000;

  it('orders holder, then ex by tries ASC hold DESC name, then others by tries DESC name', () => {
    const participants = [
      baseSmash({
        player_id: 'other-hi',
        player_name: 'Zulu',
        session_tries: 5,
      }),
      baseSmash({
        player_id: 'ex-b',
        player_name: 'Bravo',
        session_tries: 2,
        record_hold_seconds: 30,
      }),
      baseSmash({
        player_id: 'holder',
        player_name: 'Ace',
        session_tries: 1,
        is_record_holder: true,
        record_held_since: now - 10,
      }),
      baseSmash({
        player_id: 'ex-a',
        player_name: 'Alpha',
        session_tries: 2,
        record_hold_seconds: 40,
      }),
      baseSmash({
        player_id: 'other-lo',
        player_name: 'Mike',
        session_tries: 5,
      }),
      baseSmash({
        player_id: 'zero-ex',
        player_name: 'Zero',
        session_tries: 3,
        record_hold_seconds: 0,
      }),
    ];

    const lb = projectSmashViews(smashState(participants), now)
      .leaderboard as Array<{
      player_id: string;
      position: number;
      slot: string;
    }>;

    expect(lb.map(r => r.player_id)).toEqual([
      'holder',
      'ex-a',
      'ex-b',
      'other-lo',
      'other-hi',
      'zero-ex',
    ]);
    expect(lb.map(r => r.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(lb.every(r => r.slot === 'removed')).toBe(true);
  });

  it('skips tier 1 when no holder', () => {
    const participants = [
      baseSmash({
        player_id: 'o1',
        player_name: 'Ann',
        session_tries: 1,
      }),
      baseSmash({
        player_id: 'ex1',
        player_name: 'Bob',
        session_tries: 4,
        record_hold_seconds: 10,
      }),
    ];
    const lb = projectSmashViews(smashState(participants), now)
      .leaderboard as Array<{ player_id: string }>;
    expect(lb.map(r => r.player_id)).toEqual(['ex1', 'o1']);
  });

  it('filters ineligible and includes slot on kotc rows', () => {
    const kotc: KotcParticipant[] = [
      {
        participation_id: '1',
        team_id: 't1',
        team_name: 'Alpha Team',
        name_normalized: 'alpha team',
        slot: 'waiting',
        queue_position: 1,
        current_streak: 0,
        biggest_streak: 2,
        second_biggest_streak: 0,
        leaderboard_eligible: true,
      },
      {
        participation_id: '2',
        team_id: 't2',
        team_name: 'Beta Team',
        name_normalized: 'beta team',
        slot: 'removed',
        queue_position: null,
        current_streak: 0,
        biggest_streak: 0,
        second_biggest_streak: 0,
        leaderboard_eligible: false,
      },
    ];
    const state: ChallengeBoardState = {
      session: {
        id_challenge_session: 1,
        type: 'king_of_the_court',
        status: 'active',
        title: 'King of the Court Live Session',
        bottom_text: 'King of the Court Live Session',
        started_at: 1,
        completed_at: null,
      },
      participants: kotc,
      can_manual_jump_in: true,
      can_complete: false,
      complete_blocked_reasons: [],
      court_count: 0,
      waiting: [],
      court: { team_a: null, team_b: null },
      leaderboard: [],
    };
    const lb = projectKotcViews(state).leaderboard as Array<{
      team_id: string;
      slot: string;
    }>;
    expect(lb).toHaveLength(1);
    expect(lb[0].team_id).toBe('t1');
    expect(lb[0].slot).toBe('waiting');
  });

  it('liveHoldSeconds grows with clock', () => {
    const p = baseSmash({
      player_id: 'h',
      player_name: 'Holder',
      is_record_holder: true,
      record_held_since: now,
      record_hold_seconds: 5,
    });
    expect(liveHoldSeconds(p, now + 10)).toBe(15);
  });
});

describe('displayKotcStreaks and mergeStreak', () => {
  it('displayKotcStreaks covers first reign, live Other, tie, and surpass', () => {
    expect(displayKotcStreaks(0, 0, 4)).toEqual({ best: 4, other: 0 });
    expect(displayKotcStreaks(4, 0, 2)).toEqual({ best: 4, other: 2 });
    expect(displayKotcStreaks(4, 0, 4)).toEqual({ best: 4, other: 4 });
    expect(displayKotcStreaks(4, 0, 6)).toEqual({ best: 6, other: 4 });
    expect(displayKotcStreaks(10, 3, 5)).toEqual({ best: 10, other: 5 });
  });

  it('mergeStreak banks completed reigns only', () => {
    expect(mergeStreak(0, 0, 4)).toEqual({
      biggest_streak: 4,
      second_biggest_streak: 0,
    });
    expect(mergeStreak(4, 0, 4)).toEqual({
      biggest_streak: 4,
      second_biggest_streak: 4,
    });
    expect(mergeStreak(5, 0, 3)).toEqual({
      biggest_streak: 5,
      second_biggest_streak: 3,
    });
    expect(mergeStreak(4, 0, 6)).toEqual({
      biggest_streak: 6,
      second_biggest_streak: 4,
    });
    expect(mergeStreak(5, 3, 2)).toEqual({
      biggest_streak: 5,
      second_biggest_streak: 3,
    });
  });

  it('projectKotcViews exposes displayed Best/Other including live', () => {
    const kotc: KotcParticipant[] = [
      {
        participation_id: '1',
        team_id: 't1',
        team_name: 'Alpha Team',
        name_normalized: 'alpha team',
        slot: 'court_a',
        queue_position: null,
        current_streak: 6,
        biggest_streak: 4,
        second_biggest_streak: 0,
        leaderboard_eligible: true,
      },
      {
        participation_id: '2',
        team_id: 't2',
        team_name: 'Beta Team',
        name_normalized: 'beta team',
        slot: 'waiting',
        queue_position: 1,
        current_streak: 0,
        biggest_streak: 5,
        second_biggest_streak: 2,
        leaderboard_eligible: true,
      },
    ];
    const state: ChallengeBoardState = {
      session: {
        id_challenge_session: 1,
        type: 'king_of_the_court',
        status: 'active',
        title: 'King of the Court Live Session',
        bottom_text: 'King of the Court Live Session',
        started_at: 1,
        completed_at: null,
      },
      participants: kotc,
      can_manual_jump_in: true,
      can_complete: false,
      complete_blocked_reasons: [],
      court_count: 1,
      waiting: [],
      court: { team_a: null, team_b: null },
      leaderboard: [],
    };
    const projected = projectKotcViews(state);
    const court = projected.court as {
      team_a: { biggest_streak: number; second_biggest_streak: number };
    };
    expect(court.team_a.biggest_streak).toBe(6);
    expect(court.team_a.second_biggest_streak).toBe(4);
    const lb = projected.leaderboard as Array<{
      team_id: string;
      biggest_streak: number;
      second_biggest_streak: number;
    }>;
    expect(lb[0].team_id).toBe('t1');
    expect(lb[0].biggest_streak).toBe(6);
    expect(lb[0].second_biggest_streak).toBe(4);
    expect(lb[1].biggest_streak).toBe(5);
    expect(lb[1].second_biggest_streak).toBe(2);
  });
});
