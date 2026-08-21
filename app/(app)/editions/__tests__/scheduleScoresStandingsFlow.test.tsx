/**
 * Happy-path smoke: schedule → scores → standings (mocked APIs).
 */
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import EditionScheduleTab from '@/components/editions/EditionScheduleTab';
import EditionScoresTab from '@/components/editions/EditionScoresTab';
import EditionStandingsTab from '@/components/editions/EditionStandingsTab';
import { matchesApi } from '@/services/api/matchesApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const scheduleState = {
  has_regular_matches: true,
  has_scores: false,
  has_standings: false,
  is_finalized: false,
  courts: [{ id_court: 10, name: 'Court A' }],
  participations: [
    {
      id_participation: 1,
      is_collecting_points: true,
      player: { name: 'Mara Lovelace' },
    },
  ],
  schedule: { allow_replacements: true },
  matches: [
    {
      id_match: 50,
      match_kind: 'REGULAR',
      sequence_no: 1,
      sides: [
        {
          side: 'LEFT',
          score: null,
          players: [{ player_id: 1, player: { name: 'Mara Lovelace' } }],
        },
        {
          side: 'RIGHT',
          score: null,
          players: [{ player_id: 2, player: { name: 'Bob' } }],
        },
      ],
    },
  ],
};

const mockGetSchedule = jest.fn(async () => ({ data: scheduleState }));
const mockGenerate = jest.fn(async () => {
  scheduleState.has_regular_matches = true;
  return { data: {} };
});
const mockUpdateScores = jest.fn(async () => {
  scheduleState.has_scores = true;
  return { data: {} };
});
const mockRecalculate = jest.fn(async () => {
  scheduleState.has_standings = true;
  return {
    data: [
      {
        id_standing: 1,
        participation_id: 1,
        points_total: 10,
        wins: 1,
        rank: 1,
        participation: {
          id_participation: 1,
          player: { name: 'Mara Lovelace' },
        },
      },
    ],
  };
});
const mockGetStandings = jest.fn(async () => ({
  data: [
    {
      id_standing: 1,
      participation_id: 1,
      points_total: 10,
      wins: 1,
      rank: 1,
      participation: {
        id_participation: 1,
        player: { name: 'Mara Lovelace' },
      },
    },
  ],
}));

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
    updateForm: jest.fn(async () => ({ data: {} })),
    preview: jest.fn(),
    generate: (...args: unknown[]) => mockGenerate(...args),
    destroySchedule: jest.fn(),
  },
}));

jest.mock('@/services/api/courtsApi', () => ({
  courtsApi: {
    getCourts: jest.fn(async () => ({
      data: [{ id_court: 10, name: 'Court A' }],
    })),
  },
}));

jest.mock('@/services/api/matchesApi', () => ({
  matchesApi: {
    updateScores: (...args: unknown[]) => mockUpdateScores(...args),
  },
}));

jest.mock('@/services/api/standingsApi', () => ({
  standingsApi: {
    getStandings: (...args: unknown[]) => mockGetStandings(...args),
    recalculate: (...args: unknown[]) => mockRecalculate(...args),
    updateStanding: jest.fn(),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>{ui}</PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('schedule → scores → standings flow', () => {
  beforeEach(() => {
    (window as any).confirm = jest.fn(() => true);
    scheduleState.has_scores = false;
    scheduleState.has_standings = false;
    jest.clearAllMocks();
  });

  it('covers generate → nested player names → recalculate', async () => {
    const schedule = renderWithProviders(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={2}
        section="knobs"
      />
    );
    expect(await schedule.findByText('Generate')).toBeTruthy();
    fireEvent.press(schedule.getByText('Generate'));
    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
    schedule.unmount();

    const scores = renderWithProviders(
      <EditionScoresTab editionDivisionId={9} />
    );
    expect(await scores.findByText('Mara Lovelace')).toBeTruthy();
    expect(scores.getByText('Bob')).toBeTruthy();
    expect(scores.getByTestId('score-match-row-50')).toBeTruthy();
    expect(scores.queryByText('LEFT')).toBeNull();
    expect(scores.queryByText('RIGHT')).toBeNull();
    await matchesApi.updateScores(50, { left_score: 6, right_score: 4 });
    expect(mockUpdateScores).toHaveBeenCalledWith(50, {
      left_score: 6,
      right_score: 4,
    });
    scores.unmount();

    const standings = renderWithProviders(
      <EditionStandingsTab editionDivisionId={9} />
    );
    expect(await standings.findByText(/Mara Lovelace/)).toBeTruthy();
    fireEvent.press(standings.getByText(/Recalculate/i));
    await waitFor(() => expect(mockRecalculate).toHaveBeenCalledWith(9));
  });
});
