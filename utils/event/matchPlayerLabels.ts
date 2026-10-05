import {
  GameMatch,
  GameMatchSidePlayer,
} from '@/types/api/event';

export type ParticipationLike = {
  id_participation?: number;
  player?: {
    id_player?: number;
    name?: string;
    first_name?: string;
    last_name?: string;
  } | null;
};

export function formatPlayerDisplayName(
  player:
    | {
        id_player?: number;
        name?: string;
        first_name?: string;
        last_name?: string;
      }
    | null
    | undefined
): string | null {
  if (!player) return null;
  return (
    player.name ||
    [player.first_name, player.last_name].filter(Boolean).join(' ') ||
    (player.id_player != null ? `Player #${player.id_player}` : null)
  );
}

export function buildParticipationsById(
  participations: ParticipationLike[] | null | undefined
): Map<number, ParticipationLike> {
  const map = new Map<number, ParticipationLike>();
  (participations || []).forEach(p => {
    if (p?.id_participation != null) {
      map.set(Number(p.id_participation), p);
    }
  });
  return map;
}

/**
 * Resolve a match-slot label:
 * 1. nested matchPlayer.player
 * 2. schedule.participations[participation_id].player
 * 3. #player_id | #participation_id | #?
 *
 * Replacement substitutes are not written onto match_players, so this always
 * shows the original scheduled roster player.
 */
export function resolveMatchPlayerLabel(
  matchPlayer: GameMatchSidePlayer | null | undefined,
  participationsById: Map<number, ParticipationLike>
): string {
  const nested = formatPlayerDisplayName(matchPlayer?.player);
  if (nested) return nested;

  const participationId = matchPlayer?.participation_id;
  if (participationId != null) {
    const fromParticipation = formatPlayerDisplayName(
      participationsById.get(Number(participationId))?.player
    );
    if (fromParticipation) return fromParticipation;
  }

  return `#${matchPlayer?.player_id ?? matchPlayer?.participation_id ?? '?'}`;
}

export function matchSidePlayerNames(
  match: GameMatch,
  side: 'LEFT' | 'RIGHT',
  participationsById: Map<number, ParticipationLike>
): string {
  const found = (match.sides || []).find(
    s => String(s.side).toUpperCase() === side
  );
  const names = (found?.players || []).map(p =>
    resolveMatchPlayerLabel(p, participationsById)
  );
  return names.join(' / ') || '—';
}
