import {
  KotcLeaderboardTable,
  SmashLeaderboardTable,
} from '@/components/challenges/ChallengeLeaderboardTable';
import {
  LEADERBOARD_BODY_FONT_SIZE,
  LEADERBOARD_HEADER_FONT_SIZE,
  LEADERBOARD_HEADER_HEIGHT,
  LEADERBOARD_PAGE_SIZE,
  LEADERBOARD_ROW_HEIGHT,
} from '@/constants/challengeLeaderboard';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

function kotcRow(
  overrides: Partial<{
    position: number;
    team_id: string;
    team_name: string;
    biggest_streak: number;
    second_biggest_streak: number;
    slot: string;
  }> = {}
) {
  return {
    position: 1,
    team_id: '1',
    team_name: 'Alpha',
    biggest_streak: 2,
    second_biggest_streak: 0,
    ...overrides,
  };
}

function smashRow(
  overrides: Partial<{
    position: number;
    player_user_id: string;
    player_name: string;
    session_tries: number;
    record_hold_seconds: number;
    is_record_holder: boolean;
    slot: string;
  }> = {}
) {
  return {
    position: 1,
    player_user_id: 'p1',
    player_name: 'Ace Player',
    session_tries: 3,
    record_hold_seconds: 65,
    is_record_holder: true,
    ...overrides,
  };
}

describe('ChallengeLeaderboardTable', () => {
  it('hides Other Streak when all second_biggest_streak are 0', () => {
    const { queryByText, getByTestId, getByText } = render(
      <KotcLeaderboardTable rows={[kotcRow()]} />
    );
    expect(getByTestId('kotc-leaderboard-table')).toBeTruthy();
    expect(getByTestId('kotc-leaderboard-table-header').props.className).toMatch(
      /bg-gray-100/
    );
    expect(queryByText('Other Streak')).toBeNull();
    expect(StyleSheet.flatten(getByText('Best Streak').props.style)).toEqual(
      expect.objectContaining({ fontSize: LEADERBOARD_HEADER_FONT_SIZE })
    );
    expect(StyleSheet.flatten(getByText('Alpha').props.style)).toEqual(
      expect.objectContaining({ fontSize: LEADERBOARD_BODY_FONT_SIZE })
    );
  });

  it('stripes odd body rows with bg-gray-50', () => {
    const { getByTestId } = render(
      <KotcLeaderboardTable
        rows={[
          kotcRow({ team_id: '1', team_name: 'Alpha' }),
          kotcRow({ team_id: '2', team_name: 'Beta', position: 2 }),
        ]}
      />
    );
    expect(getByTestId('kotc-leaderboard-table-row-1').props.className).toMatch(
      /bg-gray-50/
    );
    expect(
      getByTestId('kotc-leaderboard-table-row-2').props.className
    ).not.toMatch(/bg-gray-50/);
  });

  it('shows Other Streak when any second_biggest_streak > 0', () => {
    const { getByText } = render(
      <KotcLeaderboardTable
        rows={[
          kotcRow({ second_biggest_streak: 1 }),
          kotcRow({
            team_id: '2',
            team_name: 'Beta',
            second_biggest_streak: 0,
          }),
        ]}
      />
    );
    expect(getByText('Other Streak')).toBeTruthy();
  });

  it('renders empty Other Streak cell when column visible but row value is 0', () => {
    const { getByTestId, queryByText } = render(
      <KotcLeaderboardTable
        rows={[
          kotcRow({ team_id: '1', second_biggest_streak: 2 }),
          kotcRow({
            team_id: '2',
            team_name: 'Beta',
            second_biggest_streak: 0,
          }),
        ]}
      />
    );
    const row = getByTestId('kotc-leaderboard-table-row-2');
    expect(row).toBeTruthy();
    expect(queryByText('0', { exact: true })).toBeNull();
  });

  it('hides pagination when single page; shows navigation when multi-page', () => {
    const { queryByTestId, getByTestId } = render(
      <KotcLeaderboardTable rows={[kotcRow()]} />
    );
    expect(queryByTestId('pagination-previous')).toBeNull();

    const manyRows = Array.from({ length: LEADERBOARD_PAGE_SIZE + 1 }, (_, i) =>
      kotcRow({
        position: i + 1,
        team_id: String(i + 1),
        team_name: `Team ${i + 1}`,
      })
    );
    const multi = render(<KotcLeaderboardTable rows={manyRows} />);
    expect(multi.getByTestId('pagination-previous')).toBeTruthy();
    expect(multi.getByTestId('pagination-page')).toBeTruthy();
    expect(multi.getByTestId('pagination-next')).toBeTruthy();
    expect(multi.queryByText(/Showing/)).toBeNull();
    expect(multi.getByTestId('kotc-leaderboard-table-row-1')).toBeTruthy();
    expect(multi.getByTestId('kotc-leaderboard-table-row-10')).toBeTruthy();
    expect(() => multi.getByTestId('kotc-leaderboard-table-row-11')).toThrow();
    expect(
      StyleSheet.flatten(multi.getByTestId('kotc-leaderboard-table-header').props.style)
    ).toEqual(expect.objectContaining({ height: LEADERBOARD_HEADER_HEIGHT }));
    expect(
      StyleSheet.flatten(
        multi.getByTestId('kotc-leaderboard-table-row-1').props.style
      )
    ).toEqual(expect.objectContaining({ height: LEADERBOARD_ROW_HEIGHT }));

    fireEvent.press(multi.getByTestId('pagination-next'));
    expect(() => multi.getByTestId('kotc-leaderboard-table-row-1')).toThrow();
    expect(multi.getByTestId('kotc-leaderboard-table-row-11')).toBeTruthy();
    expect(multi.getByTestId('kotc-leaderboard-table-row-11').props.className).toMatch(
      /bg-gray-50/
    );
    expect(multi.getByText(/Page 2 of/)).toBeTruthy();
  });

  it('renders Smash Record Holding column when holder or hold time exists', () => {
    const { getByText, getByTestId, queryByText } = render(
      <SmashLeaderboardTable rows={[smashRow()]} />
    );
    expect(getByTestId('smash-leaderboard-table')).toBeTruthy();
    expect(getByText('Record Holding')).toBeTruthy();
    expect(getByTestId('smash-leaderboard-star-p1')).toBeTruthy();
    expect(getByText('Ace Player')).toBeTruthy();
    expect(queryByText(/★/)).toBeNull();
    expect(getByText('1:05')).toBeTruthy();
  });

  it('shows KOTC star at position 1 only', () => {
    const { getByTestId, queryByTestId } = render(
      <KotcLeaderboardTable
        rows={[
          kotcRow({ position: 1, team_id: '1' }),
          kotcRow({ position: 2, team_id: '2', team_name: 'Beta' }),
        ]}
      />
    );
    expect(getByTestId('kotc-leaderboard-star-1')).toBeTruthy();
    expect(getByTestId('kotc-leaderboard-star-1').props.children.props.size).toBe(
      LEADERBOARD_BODY_FONT_SIZE
    );
    expect(queryByTestId('kotc-leaderboard-star-2')).toBeNull();
  });

  it('shows Smash star for record holder only', () => {
    const { getByTestId, queryByTestId } = render(
      <SmashLeaderboardTable
        rows={[
          smashRow({ is_record_holder: true, player_user_id: 'p1' }),
          smashRow({
            is_record_holder: false,
            player_user_id: 'p2',
            player_name: 'Other',
            position: 2,
          }),
        ]}
      />
    );
    expect(getByTestId('smash-leaderboard-star-p1')).toBeTruthy();
    expect(
      getByTestId('smash-leaderboard-star-p1').props.children.props.size
    ).toBe(LEADERBOARD_BODY_FONT_SIZE);
    expect(queryByTestId('smash-leaderboard-star-p2')).toBeNull();
  });

  it('hides Record Holding column when no holder and no hold time', () => {
    const { queryByText } = render(
      <SmashLeaderboardTable
        rows={[
          smashRow({
            is_record_holder: false,
            record_hold_seconds: 0,
          }),
        ]}
      />
    );
    expect(queryByText('Record Holding')).toBeNull();
    expect(queryByText('Hold')).toBeNull();
  });

  it('shows Record Holding column for holder with zero projected seconds but empty cell', () => {
    const { getByText, queryByText } = render(
      <SmashLeaderboardTable
        rows={[
          smashRow({
            is_record_holder: true,
            record_hold_seconds: 0,
          }),
        ]}
      />
    );
    expect(getByText('Record Holding')).toBeTruthy();
    expect(queryByText('0:00')).toBeNull();
  });

  it('shows requeue action for removed rows with hover wrapper classes', () => {
    const onRequeue = jest.fn();
    const { getByTestId, queryByText } = render(
      <KotcLeaderboardTable
        rows={[
          kotcRow({
            team_id: '10',
            slot: 'removed',
          }),
          kotcRow({
            team_id: '11',
            team_name: 'Beta',
            slot: 'waiting',
          }),
        ]}
        onRequeue={onRequeue}
      />
    );
    expect(getByTestId('kotc-leaderboard-table-row-10').props.className).toMatch(
      /group/
    );
    const requeueWrap = getByTestId('kotc-requeue-10-wrap');
    expect(requeueWrap.props.className).toMatch(/web:opacity-0/);
    expect(requeueWrap.props.className).toMatch(/web:group-hover:opacity-100/);
    expect(queryByText('➕')).toBeNull();
    expect(getByTestId('kotc-requeue-10')).toBeTruthy();
    expect(() => getByTestId('kotc-requeue-11')).toThrow();
  });

  it('wraps Smash data rows with group class and requeue testID', () => {
    const { getByTestId, getByText } = render(
      <SmashLeaderboardTable
        rows={[
          smashRow({
            is_record_holder: false,
            record_hold_seconds: 30,
            slot: 'removed',
          }),
        ]}
        onRequeue={jest.fn()}
      />
    );
    expect(getByTestId('smash-leaderboard-table-row-p1').props.className).toMatch(
      /group/
    );
    expect(getByTestId('smash-requeue-p1')).toBeTruthy();
    expect(getByText('0:30')).toBeTruthy();
  });
});
