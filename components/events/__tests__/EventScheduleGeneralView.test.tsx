import EventScheduleGeneralView from '@/components/events/EventScheduleGeneralView';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

const mockGetSchedule = jest.fn();

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
  },
}));

function renderView(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>{ui}</PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('EventScheduleGeneralView matches cards', () => {
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
          points_per_match: 15,
          points_per_match_print: 16,
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
        event_division: {},
      },
    });

    const { findByTestId, queryByText, queryByTestId } = renderView(
      <EventScheduleGeneralView
        section="matches"
        divisions={
          [{ id_event_division: 9, division_title: 'Learners' }] as any
        }
      />
    );

    expect(await findByTestId('schedule-metrics-cards')).toBeTruthy();
    expect(await findByTestId('metric-players')).toBeTruthy();
    expect(await findByTestId('metric-points')).toHaveTextContent(
      'Points/match: 16'
    );
    expect(queryByText(/Points\/match: 15/)).toBeNull();
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
        event_division: { template_version: null },
      },
    });

    const { findByTestId } = renderView(
      <EventScheduleGeneralView
        section="matches"
        divisions={[{ id_event_division: 3, division_title: 'A' }] as any}
      />
    );
    expect(await findByTestId('schedule-metrics-empty')).toBeTruthy();
  });

  it('has no participations or collecting branch', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        has_regular_matches: false,
        participations: [
          {
            id_participation: 1,
            is_collecting_points: true,
            player: { name: 'Alice' },
          },
        ],
        courts: [],
        event_division: {},
      },
    });
    const { findByTestId, queryByText } = renderView(
      <EventScheduleGeneralView
        section="knobs"
        divisions={[{ id_event_division: 9, division_title: 'A' }] as any}
      />
    );
    await findByTestId('schedule-general-ed-9');
    expect(queryByText(/collecting/i)).toBeNull();
    expect(queryByText(/Alice/)).toBeNull();
  });

  it('shows print-rounded points/match on knobs summary', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        has_regular_matches: true,
        has_scores: false,
        has_standings: false,
        is_finalized: false,
        courts: [],
        participations: [],
        matches: [],
        schedule: {
          player_opponents_nr: 4,
          player_matches_repeat: 1,
          final_points_target: 24,
          include_final: false,
          has_demonstrative_match: false,
          include_scores: true,
          allow_replacements: true,
          adjust: 0,
          points_per_match: 15,
          points_per_match_print: 16,
        },
        event_division: {
          playing_start_time: '14:00',
          playing_end_time: '17:00',
        },
      },
    });

    const { findByTestId, findByText, queryByText } = renderView(
      <EventScheduleGeneralView
        section="knobs"
        divisions={[{ id_event_division: 9, division_title: 'A' }] as any}
      />
    );
    await findByTestId('schedule-general-ed-9');
    expect(await findByText(/points\/match 16/)).toBeTruthy();
    expect(queryByText(/points\/match 15/)).toBeNull();
  });
});
