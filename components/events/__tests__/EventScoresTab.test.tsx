import React from 'react';
import { TextInput, Pressable, Text, View } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import {
  PageChromeProvider,
  usePageChrome,
} from '@/components/chrome/PageChromeProvider';
import EventScoresTab, {
  scoresFillStats,
  scoresVisibleMatches,
} from '@/components/events/EventScoresTab';

const mockGetSchedule = jest.fn();
const mockUpdateScores = jest.fn(async () => ({ data: {} }));
const mockGeneratePairImage = jest.fn();

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
  },
}));

jest.mock('@/services/api/matchesApi', () => ({
  matchesApi: {
    updateScores: (...args: unknown[]) => mockUpdateScores(...args),
  },
}));

jest.mock('@/services/api/cachedPdfImagesApi', () => ({
  cachedPdfImagesApi: {
    generatePairImage: (...args: unknown[]) => mockGeneratePairImage(...args),
  },
}));

function ChromeSaveButton() {
  const { actions } = usePageChrome();
  return (
    <Pressable testID="chrome-save" onPress={() => void actions?.save?.()}>
      <Text>Save</Text>
    </Pressable>
  );
}

function renderTab(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <View>
          <ChromeSaveButton />
          {ui}
        </View>
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('scores helpers', () => {
  it('filters DEMO and puts FINAL first', () => {
    const list = scoresVisibleMatches([
      { id_match: 1, match_kind: 'REGULAR' },
      { id_match: 2, match_kind: 'DEMONSTRATIVE' },
      { id_match: 3, match_kind: 'FINAL' },
    ] as any);
    expect(list.map(m => m.id_match)).toEqual([3, 1]);
  });

  it('counts REGULAR sides only and flags missing final', () => {
    const stats = scoresFillStats(
      [
        {
          id_match: 1,
          match_kind: 'REGULAR',
          sides: [{ score: 6 }, { score: null }],
        },
        { id_match: 2, match_kind: 'DEMONSTRATIVE', sides: [{ score: 1 }, { score: 1 }] },
      ] as any,
      true
    );
    expect(stats.filled).toBe(1);
    expect(stats.expected).toBe(2);
    expect(stats.missingFinal).toBe(true);
  });
});

describe('EventScoresTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePairImage.mockResolvedValue({
      success: true,
      data: { couple_image_url: 'https://cdn.example/couple.png' },
    });
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        participations: [],
        matches: [
          {
            id_match: 50,
            match_kind: 'REGULAR',
            sequence_no: 1,
            scheduled_start: '14:00:00',
            event_division_court_id: 1,
            event_division_court: { court: { name: 'Court 1' } },
            sides: [
              {
                side: 'LEFT',
                score: 0,
                couple_image_url: 'https://example.com/c.png',
                players: [{ player_id: 1, player: { name: 'Alice' } }],
              },
              {
                side: 'RIGHT',
                score: 0,
                players: [{ player_id: 2, player: { name: 'Bob' } }],
              },
            ],
          },
          {
            id_match: 99,
            match_kind: 'DEMONSTRATIVE',
            sequence_no: 9,
            sides: [
              { side: 'LEFT', score: 0, players: [] },
              { side: 'RIGHT', score: 0, players: [] },
            ],
          },
          {
            id_match: 80,
            match_kind: 'FINAL',
            sequence_no: 8,
            scheduled_start: '18:00:00',
            sides: [
              { side: 'LEFT', score: 0, players: [{ player: { name: 'C' } }] },
              { side: 'RIGHT', score: 0, players: [{ player: { name: 'D' } }] },
            ],
          },
        ],
      },
    });
  });

  it('requests scores=1, hides DEMO, FINAL first+highlight, start not seq, couple image', async () => {
    const { findByTestId, queryByTestId, getByTestId, queryByText } = renderTab(
      <EventScoresTab eventDivisionId={9} />
    );
    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledWith(9, { scores: true });
    });
    expect(await findByTestId('score-match-80')).toBeTruthy();
    expect(getByTestId('score-match-80').props.className).toContain('border-amber-400');
    expect(queryByTestId('score-match-99')).toBeNull();
    expect(getByTestId('score-meta-50').props.children.join('')).toMatch(/14:00/);
    expect(getByTestId('score-meta-50').props.children.join('')).not.toMatch(/seq /);
    expect(getByTestId('couple-left-50-present')).toBeTruthy();
    expect(getByTestId('couple-left-50-present').props.style).toEqual(
      expect.objectContaining({ width: 36, height: 36 })
    );
    expect(getByTestId('score-match-row-50').props.className).toContain(
      'flex-row'
    );
    expect(queryByText('LEFT')).toBeNull();
    expect(queryByText('RIGHT')).toBeNull();
    expect(getByTestId('couple-missing-right-50')).toBeTruthy();
  });

  it('shows pair missing warning when couple image absent', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        participations: [],
        matches: [
          {
            id_match: 70,
            match_kind: 'REGULAR',
            sequence_no: 1,
            sides: [
              { side: 'LEFT', score: 0, players: [{ player: { name: 'A' } }] },
              { side: 'RIGHT', score: 0, players: [{ player: { name: 'B' } }] },
            ],
          },
        ],
      },
    });
    const { findByTestId, queryByTestId } = renderTab(
      <EventScoresTab eventDivisionId={9} />
    );
    expect(await findByTestId('couple-missing-left-70')).toBeTruthy();
    expect(await findByTestId('couple-missing-right-70')).toBeTruthy();
    expect(queryByTestId('couple-left-70-reload')).toBeNull();
    expect(queryByTestId('couple-right-70-reload')).toBeNull();
  });

  it('reloads a missing couple image from both side players', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        participations: [
          { id_participation: 10, player_id: 1, is_collecting_points: true },
          { id_participation: 11, player_id: 2, is_collecting_points: false },
        ],
        matches: [
          {
            id_match: 60,
            match_kind: 'REGULAR',
            sequence_no: 1,
            sides: [
              {
                side: 'LEFT',
                score: 0,
                players: [
                  { participation_id: 10, player_id: 1 },
                  { participation_id: 11, player_id: 2 },
                ],
              },
              { side: 'RIGHT', score: 0, players: [] },
            ],
          },
        ],
      },
    });
    const { findByTestId, queryByTestId } = renderTab(
      <EventScoresTab eventDivisionId={9} />
    );
    fireEvent.press(await findByTestId('couple-left-60-reload'));
    await waitFor(() => {
      expect(mockGeneratePairImage).toHaveBeenCalledWith({
        player1Id: 1,
        player2Id: 2,
        player1IsCollectingPoints: true,
        player2IsCollectingPoints: false,
      });
    });
    expect(await findByTestId('couple-left-60-present')).toBeTruthy();
    expect(queryByTestId('couple-left-60-reload')).toBeNull();
    expect(await findByTestId('couple-missing-right-60')).toBeTruthy();
  });

  it('surfaces couple reload failures without a reload for short sides', async () => {
    mockGeneratePairImage.mockRejectedValue(new Error('pair boom'));
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        participations: [],
        matches: [
          {
            id_match: 61,
            match_kind: 'REGULAR',
            sequence_no: 1,
            sides: [
              {
                side: 'LEFT',
                score: 0,
                players: [{ player_id: 5 }, { player_id: 6 }],
              },
              { side: 'RIGHT', score: 0, players: [{ player_id: 7 }] },
            ],
          },
        ],
      },
    });
    const { findByTestId, queryByTestId } = renderTab(
      <EventScoresTab eventDivisionId={9} />
    );
    fireEvent.press(await findByTestId('couple-left-61-reload'));
    await waitFor(() => {
      expect(mockGeneratePairImage).toHaveBeenCalledWith({
        player1Id: 5,
        player2Id: 6,
        player1IsCollectingPoints: false,
        player2IsCollectingPoints: false,
      });
    });
    expect(await findByTestId('couple-left-61-error')).toHaveTextContent(
      'pair boom'
    );
    expect(queryByTestId('couple-right-61-reload')).toBeNull();
    expect(await findByTestId('couple-missing-right-61')).toBeTruthy();
  });

  it('shows player names and saves without body banner or hint', async () => {
    const { findByText, getByTestId, queryByText, UNSAFE_getAllByType } =
      renderTab(<EventScoresTab eventDivisionId={9} />);
    expect(await findByText('Alice')).toBeTruthy();
    expect(await findByText('Bob')).toBeTruthy();

    const inputs = UNSAFE_getAllByType(TextInput);
    fireEvent.changeText(inputs[0], '6');
    fireEvent.changeText(inputs[1], '4');

    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdateScores).toHaveBeenCalled();
    });
    expect(
      queryByText(/Scores saved\. Run Recalculate on the Standings tab/)
    ).toBeNull();
  });

  it('save path throws without setError or setHint', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../EventScoresTab.tsx'),
      'utf8'
    );
    expect(src).not.toContain('setError');
    expect(src).not.toContain('setHint');
    expect(src).not.toContain('Scores saved. Run Recalculate');
  });

  it('locks scores when finalized', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: true,
        participations: [],
        matches: [
          {
            id_match: 50,
            match_kind: 'REGULAR',
            sequence_no: 1,
            sides: [
              { side: 'LEFT', score: 6, players: [] },
              { side: 'RIGHT', score: 4, players: [] },
            ],
          },
        ],
      },
    });
    const { findByText } = renderTab(
      <EventScoresTab eventDivisionId={9} />
    );
    expect(
      await findByText(/Schedule is finalized — scores are read-only/)
    ).toBeTruthy();
  });

  it('resolves names via participation map when nest player is null', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        participations: [
          { id_participation: 10, player: { name: 'From Map' } },
        ],
        matches: [
          {
            id_match: 51,
            match_kind: 'REGULAR',
            sequence_no: 1,
            sides: [
              {
                side: 'LEFT',
                score: 0,
                players: [{ participation_id: 10, player: null }],
              },
              { side: 'RIGHT', score: 0, players: [] },
            ],
          },
        ],
      },
    });
    const { findByText } = renderTab(
      <EventScoresTab eventDivisionId={9} />
    );
    expect(await findByText('From Map')).toBeTruthy();
  });

  it('General shows stats only without match rows or inputs', async () => {
    mockGetSchedule.mockImplementation(async (id: number) => ({
      data: {
        event_division: { id_event_division: id },
        schedule: { include_final: id === 9 },
        matches: [
          {
            id_match: 1,
            match_kind: 'REGULAR',
            sides: [{ score: 6 }, { score: 4 }],
          },
          {
            id_match: 2,
            match_kind: 'DEMONSTRATIVE',
            sides: [{ score: 1 }, { score: 1 }],
          },
        ],
      },
    }));
    const { findByTestId, queryByText, UNSAFE_queryAllByType } = renderTab(
      <EventScoresTab
        eventDivisionId={null}
        divisions={
          [
            { id_event_division: 9, division_title: 'A' },
            { id_event_division: 10, division_title: 'B' },
          ] as any
        }
      />
    );
    expect(await findByTestId('event-general-edit-hint')).toBeTruthy();
    expect(await findByTestId('scores-stat-fill-9')).toHaveTextContent(
      /Scores filled: 2\/2/
    );
    expect(await findByTestId('scores-stat-final-9')).toHaveTextContent(
      /missing/
    );
    expect(queryByText(/Match #/)).toBeNull();
    expect(UNSAFE_queryAllByType(TextInput).length).toBe(0);
  });
});
