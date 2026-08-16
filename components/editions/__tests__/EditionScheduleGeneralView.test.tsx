import EditionScheduleGeneralView from '@/components/editions/EditionScheduleGeneralView';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockGetSchedule = jest.fn();

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
  },
}));

function renderView(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>{ui}</PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('EditionScheduleGeneralView matches cards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests schedule without board=1 and shows metric cards only', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        has_regular_matches: true,
        has_scores: false,
        has_standings: false,
        is_finalized: false,
        courts: [],
        participations: [],
        matches: [{ id_match: 1, sequence_no: 1 }],
        board_metrics: {
          players_count: 8,
          matches_count: 12,
          points_per_match: 16,
          partners_count_variation: 2,
          min_opponents_met: 3,
          max_opponents_met: 5,
          playing_distribution: { avg: 0.8, percentage: 80, css_class: 'good' },
          template_identity: {
            players: 8,
            partners: 4,
            repeat: 1,
            courts: 1,
            version: 4,
          },
        },
        edition_division: {},
      },
    });

    const { findByTestId, queryByText, queryByTestId } = renderView(
      <EditionScheduleGeneralView
        section="matches"
        divisions={
          [{ id_edition_division: 9, division_title: 'Learners' }] as any
        }
      />
    );

    expect(await findByTestId('schedule-metrics-cards')).toBeTruthy();
    expect(await findByTestId('metric-players')).toBeTruthy();
    expect(await findByTestId('metric-distribution')).toHaveTextContent(
      'Min/avg playing %: 80%'
    );
    expect(queryByText(/seq /)).toBeNull();
    expect(queryByTestId('schedule-matches-board')).toBeNull();
    expect(queryByText('Generate')).toBeNull();

    await waitFor(() => {
      expect(mockGetSchedule).toHaveBeenCalledWith(9);
    });
    expect(mockGetSchedule.mock.calls[0][1]).toBeUndefined();
  });

  it('shows empty metrics when board_metrics null', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        has_regular_matches: false,
        matches: [],
        board_metrics: null,
        participations: [],
        courts: [],
        edition_division: { template_version: null },
      },
    });

    const { findByTestId } = renderView(
      <EditionScheduleGeneralView
        section="matches"
        divisions={[{ id_edition_division: 3, division_title: 'A' }] as any}
      />
    );
    expect(await findByTestId('schedule-metrics-empty')).toBeTruthy();
  });
});
