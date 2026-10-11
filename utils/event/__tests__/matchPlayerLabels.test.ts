import {
  buildParticipationsById,
  matchSidePlayerNames,
  resolveMatchPlayerLabel,
} from '@/utils/event/matchPlayerLabels';

describe('matchPlayerLabels', () => {
  const participationsById = buildParticipationsById([
    {
      id_participation: 10,
      player: { name: 'Alice From Participation' },
    },
    {
      id_participation: 11,
      player: { first_name: 'Bob', last_name: 'Roster' },
    },
  ]);

  it('prefers nested matchPlayer.player', () => {
    expect(
      resolveMatchPlayerLabel(
        {
          player_user_id: 1,
          participation_id: 10,
          player: { name: 'Nested Name' },
        },
        participationsById
      )
    ).toBe('Nested Name');
  });

  it('falls back to schedule participations map when nest player is null', () => {
    expect(
      resolveMatchPlayerLabel(
        {
          player_user_id: null as any,
          participation_id: 10,
          player: null,
        },
        participationsById
      )
    ).toBe('Alice From Participation');
  });

  it('shows original roster player via participation map', () => {
    expect(
      resolveMatchPlayerLabel(
        {
          participation_id: 11,
          player: null,
        },
        participationsById
      )
    ).toBe('Bob Roster');
  });

  it('falls back to #? style ids', () => {
    expect(
      resolveMatchPlayerLabel(
        { participation_id: 99, player: null },
        participationsById
      )
    ).toBe('#99');
    expect(resolveMatchPlayerLabel({ player: null }, participationsById)).toBe(
      '#?'
    );
  });

  it('formats side names from participation map', () => {
    const match = {
      id_match: 1,
      sides: [
        {
          side: 'LEFT',
          players: [
            { participation_id: 10, player: null },
            { participation_id: 11, player: null },
          ],
        },
      ],
    };
    expect(matchSidePlayerNames(match as any, 'LEFT', participationsById)).toBe(
      'Alice From Participation / Bob Roster'
    );
  });
});
