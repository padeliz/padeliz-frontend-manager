import React from 'react';
import { TextInput, Pressable, Text, View } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PageChromeProvider,
  usePageChrome,
} from '@/components/chrome/PageChromeProvider';
import EditionScoresTab, {
  scoresFillStats,
  scoresVisibleMatches,
} from '@/components/editions/EditionScoresTab';

const mockGetSchedule = jest.fn();
const mockUpdateScores = jest.fn(async () => ({ data: {} }));

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

function ChromeSaveButton() {
  const { actions } = usePageChrome();
  return (
    <Pressable testID="chrome-save" onPress={() => void actions?.save?.()}>
      <Text>Save</Text>
    </Pressable>
  );
}

function renderTab(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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

describe('EditionScoresTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
            edition_division_court_id: 1,
            edition_division_court: { court: { name: 'Court 1' } },
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
      <EditionScoresTab editionDivisionId={9} />
    );
    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledWith(9, { scores: true });
    });
    expect(await findByTestId('score-match-80')).toBeTruthy();
    expect(getByTestId('score-match-80').props.className).toContain('border-amber-400');
    expect(queryByTestId('score-match-99')).toBeNull();
    expect(getByTestId('score-meta-50').props.children.join('')).toMatch(/14:00/);
    expect(getByTestId('score-meta-50').props.children.join('')).not.toMatch(/seq /);
    expect(getByTestId('couple-left-50')).toBeTruthy();
    expect(getByTestId('couple-left-50').props.style).toEqual(
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
    const { findByTestId } = renderTab(
      <EditionScoresTab editionDivisionId={9} />
    );
    expect(await findByTestId('couple-missing-left-70')).toBeTruthy();
    expect(await findByTestId('couple-missing-right-70')).toBeTruthy();
  });

  it('shows player names and soft standings hint after save', async () => {
    const { findByText, getByTestId, UNSAFE_getAllByType } = renderTab(
      <EditionScoresTab editionDivisionId={9} />
    );
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
      await findByText(/Scores saved\. Run Recalculate on the Standings tab/)
    ).toBeTruthy();
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
      <EditionScoresTab editionDivisionId={9} />
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
      <EditionScoresTab editionDivisionId={9} />
    );
    expect(await findByText('From Map')).toBeTruthy();
  });

  it('General shows stats only without match rows or inputs', async () => {
    mockGetSchedule.mockImplementation(async (id: number) => ({
      data: {
        edition_division: { include_final: id === 9 },
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
      <EditionScoresTab
        editionDivisionId={null}
        divisions={
          [
            { id_edition_division: 9, division_title: 'A' },
            { id_edition_division: 10, division_title: 'B' },
          ] as any
        }
      />
    );
    expect(await findByTestId('edition-general-edit-hint')).toBeTruthy();
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
