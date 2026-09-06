import EditionScheduleMatchesBoard, {
  ScheduleBoardMetricsCards,
  completeRoundCount,
  isSparseMatch,
} from '@/components/editions/EditionScheduleMatchesBoard';
import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGetSchedule = jest.fn();
const mockReorderMatches = jest.fn();
const mockConfirmDiscardDirty = jest.fn();
const mockGeneratePdfAvatar = jest.fn();

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
    reorderMatches: (...args: unknown[]) => mockReorderMatches(...args),
  },
}));

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    generatePdfAvatar: (...args: unknown[]) => mockGeneratePdfAvatar(...args),
  })),
}));

jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: (...args: unknown[]) => mockConfirmDiscardDirty(...args),
}));

let lastSavePromise: Promise<void> | undefined;

function ChromeProbe() {
  const { actions } = usePageChrome();
  return (
    <>
      <TextProbe
        testID="chrome-dirty"
        value={actions?.isDirty ? '1' : '0'}
      />
      <TextProbe
        testID="chrome-cansave"
        value={actions?.canSave ? '1' : '0'}
      />
      {actions?.save ? (
        <Btn
          testID="chrome-save"
          onPress={() => {
            lastSavePromise = actions.save?.();
            void lastSavePromise?.catch(() => {});
          }}
        />
      ) : null}
      {actions?.cancel ? (
        <Btn testID="chrome-cancel" onPress={() => actions.cancel?.()} />
      ) : null}
      {actions?.refresh ? (
        <Btn testID="chrome-refresh" onPress={() => void actions.refresh?.()} />
      ) : null}
    </>
  );
}

function TextProbe({ testID, value }: { testID: string; value: string }) {
  const { Text } = require('react-native');
  return <Text testID={testID}>{value}</Text>;
}

function Btn({ testID, onPress }: { testID: string; onPress: () => void }) {
  const { Pressable, Text } = require('react-native');
  return (
    <Pressable testID={testID} onPress={onPress}>
      <Text>x</Text>
    </Pressable>
  );
}

function renderBoard(ui: React.ReactElement, onRefresh = jest.fn()) {
  const client = createTestQueryClient();
  return {
    onRefresh,
    ...render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <ChromeProbe />
          {React.cloneElement(ui as any, { onRefresh })}
        </PageChromeProvider>
      </QueryClientProvider>
    ),
  };
}

function sidePlayer(
  participationId: number,
  playerId: number,
  name: string
) {
  return {
    participation_id: participationId,
    player_id: playerId,
    player: { id_player: playerId, name: `MP#${playerId}` },
    participation: {
      id_participation: participationId,
      player: { id_player: playerId, name },
    },
  };
}

function boardState(overrides: Record<string, unknown> = {}) {
  return {
    has_regular_matches: true,
    has_scores: false,
    has_standings: false,
    is_finalized: false,
    courts: [{ id_court: 10, name: 'Court A' }],
    participations: [
      {
        id_participation: 1,
        player_id: 101,
        sort_order: 0,
        player: { id_player: 101, name: 'Alice Wonder' },
      },
      {
        id_participation: 2,
        player_id: 102,
        sort_order: 1,
        player: { id_player: 102, name: 'Bob Builder' },
      },
    ],
    players_board: [
      {
        participation_id: 1,
        player_id: 101,
        short_name: 'A. Wonder',
        pdf_avatar_url: 'https://example.com/a.png',
        is_collecting_points: true,
      },
      {
        participation_id: 2,
        player_id: 102,
        short_name: 'B. Builder',
        pdf_avatar_url: null,
        is_collecting_points: true,
      },
    ],
    board_metrics: {
      players_count: 2,
      matches_count: 3,
      points_per_match: 16,
      partners_count: { 101: 1, 102: 1 },
      partners_count_variation: 1,
      players_met: { 101: { 102: 1 }, 102: { 101: 1 } },
      min_opponents_met: 1,
      max_opponents_met: 1,
      playing_distribution: {
        avg: 0.85,
        percentage: 85,
        css_class: 'good',
        per_player: {
          101: { score: 0.9, percentage: 90, css_class: 'excellent' },
          102: { score: 0.8, percentage: 80, css_class: 'good' },
        },
      },
      template_identity: {
        players: 2,
        partners: 1,
        repeat: 1,
        courts: 1,
        version: 4,
      },
    },
    matches: [
      {
        id_match: 10,
        match_kind: 'REGULAR',
        sequence_no: 1,
        scheduled_start: '14:00:00',
        scheduled_end: '14:45:00',
        edition_division_court_id: 50,
        edition_division_court: {
          id_edition_division_court: 50,
          court: { name: 'Court A' },
        },
        sides: [
          {
            side: 'LEFT',
            players: [sidePlayer(1, 101, 'Alice Wonder')],
          },
          {
            side: 'RIGHT',
            players: [sidePlayer(2, 102, 'Bob Builder')],
          },
        ],
      },
      {
        id_match: 11,
        match_kind: 'REGULAR',
        sequence_no: 2,
        scheduled_start: '14:45:00',
        scheduled_end: '15:30:00',
        edition_division_court_id: 50,
        edition_division_court: {
          id_edition_division_court: 50,
          court: { name: 'Court A' },
        },
        sides: [
          {
            side: 'LEFT',
            players: [sidePlayer(1, 101, 'Alice Wonder')],
          },
          {
            side: 'RIGHT',
            players: [sidePlayer(2, 102, 'Bob Builder')],
          },
        ],
      },
      {
        id_match: 12,
        match_kind: 'REGULAR',
        sequence_no: 3,
        scheduled_start: '15:30:00',
        scheduled_end: '16:15:00',
        edition_division_court_id: 50,
        edition_division_court: {
          id_edition_division_court: 50,
          court: { name: 'Court A' },
        },
        sides: [
          {
            side: 'LEFT',
            players: [sidePlayer(2, 102, 'Bob Builder')],
          },
          {
            side: 'RIGHT',
            players: [sidePlayer(1, 101, 'Alice Wonder')],
          },
        ],
      },
    ],
    edition_division: {},
    ...overrides,
  };
}

describe('EditionScheduleMatchesBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirmDiscardDirty.mockResolvedValue(true);
    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/b.png' },
    });
    mockReorderMatches.mockResolvedValue({
      data: {
        matches: boardState().matches,
        board_metrics: boardState().board_metrics,
      },
    });
  });

  it('highlights without reducing match count; All clears highlight; no aggregate panel', async () => {
    const { getByTestId, getByText, queryByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    expect(getByTestId('matches-count').props.children.join('')).toContain('3');
    fireEvent.press(getByTestId('filter-participation-1'));
    expect(getByTestId('matches-count').props.children.join('')).toContain('3');
    expect(getByTestId('match-row-10').props.style).toMatchObject({
      backgroundColor: '#fffbeb',
      borderLeftColor: '#f59e0b',
    });
    fireEvent.press(getByTestId('filter-all'));
    expect(getByText('All')).toBeTruthy();
    expect(queryByTestId('stat-meeting')).toBeNull();
    expect(queryByTestId('stat-distribution')).toBeNull();
  });

  it('shows inline playing/partners on chips and omits meeting', () => {
    const { getByTestId, queryByTestId, rerender } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    expect(queryByTestId('filter-meeting-1')).toBeNull();
    expect(getByTestId('filter-playing-1').props.children.join('')).toContain(
      '90%'
    );
    expect(getByTestId('filter-playing-class-1-excellent')).toBeTruthy();
    expect(getByTestId('filter-partners-1')).toBeTruthy();

    const zeroVar = boardState({
      board_metrics: {
        ...(boardState().board_metrics as object),
        partners_count_variation: 0,
      },
    });
    rerender(
      <QueryClientProvider
        client={
          createTestQueryClient()
        }
      >
        <PageChromeProvider>
          <EditionScheduleMatchesBoard
            editionDivisionId={9}
            state={zeroVar as any}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    expect(queryByTestId('filter-partners-1')).toBeNull();
  });

  it('shows start time centered and omits match-time range', () => {
    const { getByTestId, queryByTestId, queryByText } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    expect(getByTestId('match-start-10').props.children).toMatch(/14:00/);
    expect(queryByTestId('match-time-10')).toBeNull();
    expect(queryByText(/^vs$/)).toBeNull();
    expect(queryByText(/seq 1/)).toBeNull();
  });

  it('uses participation.player name over board short_name and match_player.player', () => {
    const { getAllByText, queryByText } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    expect(getAllByText('Alice Wonder').length).toBeGreaterThan(0);
    expect(queryByText('MP#101')).toBeNull();
    expect(queryByText(/^P#1$/)).toBeNull();
  });

  it('shows em dash when participation.player missing', () => {
    const state = boardState({
      matches: [
        {
          id_match: 10,
          match_kind: 'REGULAR',
          sequence_no: 1,
          scheduled_start: '14:00:00',
          scheduled_end: '14:45:00',
          edition_division_court_id: 50,
          edition_division_court: {
            id_edition_division_court: 50,
            court: { name: 'Court A' },
          },
          sides: [
            {
              side: 'LEFT',
              players: [
                {
                  participation_id: 1,
                  player_id: 101,
                  participation: { id_participation: 1, player: null },
                },
              ],
            },
            {
              side: 'RIGHT',
              players: [sidePlayer(2, 102, 'Bob Builder')],
            },
          ],
        },
      ],
    });
    const { getAllByText } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={state as any} />
    );
    expect(getAllByText('—').length).toBeGreaterThan(0);
  });

  it('marks moved/affected with explicit styles after arrow reorder', () => {
    const { getByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    fireEvent.press(getByTestId('match-move-down-10'));
    expect(getByTestId('match-moved-10')).toBeTruthy();
    expect(getByTestId('match-row-10').props.style).toMatchObject({
      backgroundColor: '#dbeafe',
      borderLeftColor: '#3b82f6',
    });
  });

  it('renders avatar present and a reload control when missing', () => {
    const { getAllByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    expect(getAllByTestId('avatar-1-present').length).toBeGreaterThan(0);
    expect(getAllByTestId('avatar-2-reload').length).toBeGreaterThan(0);
  });

  it('shows a reload control when participation is absent from players_board', () => {
    const state = boardState({
      players_board: [
        {
          participation_id: 1,
          player_id: 101,
          short_name: 'A. Wonder',
          pdf_avatar_url: 'https://example.com/a.png',
          is_collecting_points: true,
        },
      ],
    });
    const { getAllByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={state as any} />
    );
    expect(getAllByTestId('avatar-2-reload').length).toBeGreaterThan(0);
  });

  it('reloads a missing avatar with the board player id and collecting flag', async () => {
    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/b.png' },
    });
    const { getAllByTestId, queryAllByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    fireEvent.press(getAllByTestId('avatar-2-reload')[0]);
    await waitFor(() => {
      expect(mockGeneratePdfAvatar).toHaveBeenCalledWith(102, true);
    });
    await waitFor(() => {
      expect(getAllByTestId('avatar-2-present').length).toBeGreaterThan(0);
    });
    expect(queryAllByTestId('avatar-2-reload')).toHaveLength(0);
  });

  it('surfaces avatar reload failures next to the control', async () => {
    mockGeneratePdfAvatar.mockRejectedValue(new Error('avatar boom'));
    const { getAllByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    fireEvent.press(getAllByTestId('avatar-2-reload')[0]);
    await waitFor(() => {
      expect(getAllByTestId('avatar-2-error')[0]).toHaveTextContent(
        'avatar boom'
      );
    });
    expect(
      getAllByTestId('avatar-2-reload')[0].props.accessibilityState?.disabled
    ).toBe(false);
  });

  it('does not call API until Save; posts last-touch court', async () => {
    const { getByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    fireEvent.press(getByTestId('match-move-down-10'));
    expect(mockReorderMatches).not.toHaveBeenCalled();
    expect(getByTestId('chrome-dirty').props.children).toBe('1');
    expect(getByTestId('match-start-10').props.children).toMatch(/14:00/);
    expect(getByTestId('match-moved-10')).toBeTruthy();
    expect(getByTestId('match-affected-11')).toBeTruthy();

    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockReorderMatches).toHaveBeenCalledWith(9, {
        court: 50,
        match_ids: [11, 10, 12],
      });
    });
  });

  it('keeps draft on Save failure; cancel resets', async () => {
    mockReorderMatches.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />
    );
    fireEvent.press(getByTestId('match-move-down-10'));
    fireEvent.press(getByTestId('chrome-save'));
    await act(async () => {
      await expect(lastSavePromise).rejects.toThrow('boom');
    });
    await waitFor(() => {
      expect(getByTestId('matches-reorder-error')).toBeTruthy();
    });
    expect(getByTestId('chrome-dirty').props.children).toBe('1');
    expect(getByTestId('match-moved-10')).toBeTruthy();

    fireEvent.press(getByTestId('chrome-cancel'));
    await waitFor(() => {
      expect(getByTestId('chrome-dirty').props.children).toBe('0');
    });
  });

  it('refresh while dirty confirms then cancels and refetches', async () => {
    const onRefresh = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={boardState() as any} />,
      onRefresh
    );
    fireEvent.press(getByTestId('match-move-down-10'));
    fireEvent.press(getByTestId('chrome-refresh'));
    await waitFor(() => {
      expect(mockConfirmDiscardDirty).toHaveBeenCalled();
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('skips move controls when generate-blocked', () => {
    const { queryByTestId, getByTestId } = renderBoard(
      <EditionScheduleMatchesBoard
        editionDivisionId={9}
        state={boardState({ has_scores: true }) as any}
      />
    );
    expect(queryByTestId('match-move-down-10')).toBeNull();
    expect(getByTestId('chrome-cansave').props.children).toBe('0');
  });

  it('marks sparse rows as fixed and not movable', () => {
    const state = boardState({
      matches: [
        ...(boardState().matches as any[]),
        {
          id_match: 99,
          match_kind: 'REGULAR',
          sequence_no: 4,
          scheduled_start: '16:15:00',
          scheduled_end: '17:00:00',
          edition_division_court_id: 50,
          edition_division_court: {
            id_edition_division_court: 50,
            court: { name: 'Court A' },
          },
          sides: [],
        },
        {
          id_match: 20,
          match_kind: 'REGULAR',
          sequence_no: 1,
          scheduled_start: '14:00:00',
          scheduled_end: '14:45:00',
          edition_division_court_id: 51,
          edition_division_court: {
            id_edition_division_court: 51,
            court: { name: 'Court B' },
          },
          sides: [],
        },
        {
          id_match: 21,
          match_kind: 'REGULAR',
          sequence_no: 2,
          scheduled_start: '14:45:00',
          scheduled_end: '15:30:00',
          edition_division_court_id: 51,
          edition_division_court: {
            id_edition_division_court: 51,
            court: { name: 'Court B' },
          },
          sides: [],
        },
        {
          id_match: 22,
          match_kind: 'REGULAR',
          sequence_no: 3,
          scheduled_start: '15:30:00',
          scheduled_end: '16:15:00',
          edition_division_court_id: 51,
          edition_division_court: {
            id_edition_division_court: 51,
            court: { name: 'Court B' },
          },
          sides: [],
        },
      ],
    });
    expect(completeRoundCount(state.matches as any)).toBe(3);
    expect(isSparseMatch({ sequence_no: 4 } as any, 3)).toBe(true);

    const { getByTestId, queryByTestId } = renderBoard(
      <EditionScheduleMatchesBoard editionDivisionId={9} state={state as any} />
    );
    expect(getByTestId('match-sparse-99')).toBeTruthy();
    expect(queryByTestId('match-move-up-99')).toBeNull();
  });
});

describe('ScheduleBoardMetricsCards', () => {
  it('renders metric cards and omits version when null', () => {
    const { getByTestId, queryByText, rerender } = render(
      <ScheduleBoardMetricsCards
        metrics={{
          players_count: 8,
          matches_count: 12,
          points_per_match: 16,
          partners_count_variation: 2,
          min_opponents_met: 3,
          max_opponents_met: 5,
          playing_distribution: { avg: 0.75, percentage: 75, css_class: 'fair' },
          template_identity: {
            players: 8,
            partners: 4,
            repeat: 1,
            courts: 1,
            version: 4,
          },
        }}
      />
    );
    expect(getByTestId('metric-players').props.children.join('')).toContain('8');
    expect(getByTestId('metric-distribution').props.children.join('')).toContain(
      '75%'
    );
    expect(getByTestId('metric-template').props.children.join('')).toContain('v4');

    rerender(
      <ScheduleBoardMetricsCards
        metrics={{
          players_count: 8,
          matches_count: 12,
          points_per_match: 16,
          partners_count_variation: 2,
          min_opponents_met: 3,
          max_opponents_met: 5,
          playing_distribution: { avg: 0.75, percentage: 75, css_class: 'fair' },
          template_identity: {
            players: 8,
            partners: 4,
            repeat: 1,
            courts: 1,
            version: null,
          },
        }}
      />
    );
    expect(queryByText(/v\d/)).toBeNull();
  });

  it('shows empty state when metrics null', () => {
    const { getByTestId } = render(
      <ScheduleBoardMetricsCards metrics={null} />
    );
    expect(getByTestId('schedule-metrics-empty')).toBeTruthy();
  });
});
