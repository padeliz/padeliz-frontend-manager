import type {
  ChallengeBoardState,
  KotcParticipant,
  SmashParticipant,
} from './types';
import { isKotc } from './types';

export function mergeStreak(
  biggest: number,
  second: number,
  current: number
): { biggest_streak: number; second_biggest_streak: number } {
  if (current > biggest) {
    return { biggest_streak: current, second_biggest_streak: biggest };
  }
  if (current === biggest) {
    return {
      biggest_streak: biggest,
      second_biggest_streak: Math.max(second, current),
    };
  }
  if (current > second) {
    return { biggest_streak: biggest, second_biggest_streak: current };
  }
  return { biggest_streak: biggest, second_biggest_streak: second };
}

/** Displayed Best/Other from completed top-2 + live (multiset; zeros dropped). */
export function displayKotcStreaks(
  biggestCompleted: number,
  secondCompleted: number,
  current: number
): { best: number; other: number } {
  const candidates = [biggestCompleted, secondCompleted, current].filter(
    n => n > 0
  );
  candidates.sort((a, b) => b - a);
  return {
    best: candidates[0] ?? 0,
    other: candidates[1] ?? 0,
  };
}

export function deriveKotcFlags(participants: KotcParticipant[]): {
  can_manual_jump_in: boolean;
  can_complete: boolean;
  complete_blocked_reasons: string[];
  court_count: number;
} {
  const waiting = participants.filter(p => p.slot === 'waiting').length;
  const courtCount = participants.filter(
    p => p.slot === 'court_a' || p.slot === 'court_b'
  ).length;
  const reasons: string[] = [];
  if (waiting > 0) reasons.push('Waiting list not empty');
  if (courtCount >= 2) reasons.push('Two teams still on court');
  return {
    can_manual_jump_in: courtCount < 2,
    can_complete: reasons.length === 0,
    complete_blocked_reasons: reasons,
    court_count: courtCount,
  };
}

export function deriveSmashFlags(participants: SmashParticipant[]): {
  can_manual_jump_in: boolean;
  can_complete: boolean;
  complete_blocked_reasons: string[];
  court_count: number;
} {
  const waiting = participants.filter(p => p.slot === 'waiting').length;
  const courtCount = participants.filter(p => p.slot === 'on_court').length;
  const reasons: string[] = [];
  if (waiting > 0) reasons.push('Waiting list not empty');
  if (courtCount > 0) reasons.push('Player still on court');
  return {
    can_manual_jump_in: courtCount === 0,
    can_complete: reasons.length === 0,
    complete_blocked_reasons: reasons,
    court_count: courtCount,
  };
}

export function projectKotcViews(state: ChallengeBoardState): ChallengeBoardState {
  const participants = state.participants as KotcParticipant[];
  const flags = deriveKotcFlags(participants);
  const waiting = participants
    .filter(p => p.slot === 'waiting')
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))
    .map(p => {
      const { best, other } = displayKotcStreaks(
        p.biggest_streak,
        p.second_biggest_streak,
        p.current_streak
      );
      return {
        participation_id: p.participation_id,
        team_id: p.team_id,
        team_name: p.team_name,
        biggest_streak: best,
        second_biggest_streak: other,
        current_streak: p.current_streak,
        queue_position: p.queue_position ?? 0,
      };
    });

  const teamA = participants.find(p => p.slot === 'court_a') ?? null;
  const teamB = participants.find(p => p.slot === 'court_b') ?? null;
  const toCourt = (p: KotcParticipant | null) => {
    if (!p) return null;
    const { best, other } = displayKotcStreaks(
      p.biggest_streak,
      p.second_biggest_streak,
      p.current_streak
    );
    return {
      participation_id: p.participation_id,
      team_id: p.team_id,
      team_name: p.team_name,
      current_streak: p.current_streak,
      biggest_streak: best,
      second_biggest_streak: other,
    };
  };

  const leaderboard = [...participants]
    .filter(p => p.leaderboard_eligible === true)
    .map(p => {
      const { best, other } = displayKotcStreaks(
        p.biggest_streak,
        p.second_biggest_streak,
        p.current_streak
      );
      return { p, best, other };
    })
    .sort((a, b) => {
      if (b.best !== a.best) return b.best - a.best;
      if (b.other !== a.other) return b.other - a.other;
      return a.p.team_name.localeCompare(b.p.team_name);
    })
    .map(({ p, best, other }, i) => ({
      position: i + 1,
      team_id: p.team_id,
      team_name: p.team_name,
      biggest_streak: best,
      second_biggest_streak: other,
      current_streak: p.current_streak,
      slot: p.slot,
    }));

  return {
    ...state,
    ...flags,
    can_manual_jump_in: state.session.status === 'active' && flags.can_manual_jump_in,
    waiting,
    court: { team_a: toCourt(teamA), team_b: toCourt(teamB) },
    leaderboard,
  };
}

export function liveHoldSeconds(
  p: SmashParticipant,
  now: number
): number {
  const live =
    p.record_held_since != null ? Math.max(0, now - p.record_held_since) : 0;
  return p.record_hold_seconds + live;
}

function smashLeaderboardTier(
  a: SmashParticipant,
  b: SmashParticipant,
  now: number
): number {
  const tier = (p: SmashParticipant) => {
    if (p.is_record_holder) return 1;
    if (liveHoldSeconds(p, now) > 0) return 2;
    return 3;
  };
  const ta = tier(a);
  const tb = tier(b);
  if (ta !== tb) return ta - tb;

  if (ta === 2) {
    if (a.session_tries !== b.session_tries) {
      return a.session_tries - b.session_tries;
    }
    const ah = liveHoldSeconds(a, now);
    const bh = liveHoldSeconds(b, now);
    if (bh !== ah) return bh - ah;
    return a.player_name.localeCompare(b.player_name);
  }

  if (ta === 3) {
    if (b.session_tries !== a.session_tries) {
      return b.session_tries - a.session_tries;
    }
    return a.player_name.localeCompare(b.player_name);
  }

  return 0;
}

export function projectSmashViews(
  state: ChallengeBoardState,
  now: number = Math.floor(Date.now() / 1000)
): ChallengeBoardState {
  const participants = state.participants as SmashParticipant[];
  const flags = deriveSmashFlags(participants);
  const waiting = participants
    .filter(p => p.slot === 'waiting')
    .sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))
    .map(p => ({
      participation_id: p.participation_id,
      player_user_id: p.player_user_id,
      player_name: p.player_name,
      session_tries: p.session_tries,
      record_hold_seconds: liveHoldSeconds(p, now),
      queue_position: p.queue_position ?? 0,
    }));

  const onCourt = participants.find(p => p.slot === 'on_court') ?? null;
  const court = onCourt
    ? {
        participation_id: onCourt.participation_id,
        player_user_id: onCourt.player_user_id,
        player_name: onCourt.player_name,
        session_tries: onCourt.session_tries,
        record_hold_seconds: liveHoldSeconds(onCourt, now),
        is_record_holder: onCourt.is_record_holder,
      }
    : null;

  const leaderboard = [...participants]
    .filter(p => p.leaderboard_eligible === true)
    .sort((a, b) => smashLeaderboardTier(a, b, now))
    .map((p, i) => ({
      position: i + 1,
      player_user_id: p.player_user_id,
      player_name: p.player_name,
      session_tries: p.session_tries,
      record_hold_seconds: liveHoldSeconds(p, now),
      is_record_holder: p.is_record_holder,
      slot: p.slot,
    }));

  return {
    ...state,
    ...flags,
    can_manual_jump_in:
      state.session.status === 'active' && flags.can_manual_jump_in,
    waiting,
    court,
    leaderboard,
  };
}

export function projectViews(
  state: ChallengeBoardState,
  now?: number
): ChallengeBoardState {
  return isKotc(state) ? projectKotcViews(state) : projectSmashViews(state, now);
}
