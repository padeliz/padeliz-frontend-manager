import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import EditionScheduleTab, {
  mergeCourtSelection,
} from '@/components/editions/EditionScheduleTab';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGetSchedule = jest.fn();
const mockUpdateForm = jest.fn(async () => ({ data: {} }));
const mockPreview = jest.fn();
const mockGenerate = jest.fn(async () => ({ data: {} }));
const mockDestroy = jest.fn(async () => ({ data: {} }));
const mockGetCourts = jest.fn();

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
    updateForm: (...args: unknown[]) => mockUpdateForm(...args),
    preview: (...args: unknown[]) => mockPreview(...args),
    generate: (...args: unknown[]) => mockGenerate(...args),
    destroySchedule: (...args: unknown[]) => mockDestroy(...args),
    reorderMatches: jest.fn(async () => ({ data: {} })),
  },
}));

jest.mock('@/services/api/courtsApi', () => ({
  courtsApi: {
    getCourts: (...args: unknown[]) => mockGetCourts(...args),
  },
}));

function renderTab(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>{ui}</PageChromeProvider>
    </QueryClientProvider>
  );
}

function schedulePayload(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      has_regular_matches: false,
      has_scores: false,
      has_standings: false,
      is_finalized: false,
      courts: [{ id_court: 10, name: 'Court A' }],
      participations: [
        {
          id_participation: 1,
          is_collecting_points: true,
          player: { name: 'Alice' },
        },
        {
          id_participation: 2,
          is_collecting_points: false,
          player: { name: 'Bob' },
        },
      ],
      edition_division: {
        allow_replacements: true,
        include_final: false,
        has_demonstrative_match: false,
        include_scores: true,
      },
      matches: [],
      ...overrides,
    },
  };
}

describe('EditionScheduleTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (window as any).confirm = jest.fn(() => true);
    mockGetSchedule.mockResolvedValue(schedulePayload());
    mockGetCourts.mockResolvedValue({
      data: [
        { id_court: 10, name: 'Court A' },
        { id_court: 11, name: 'Court B' },
      ],
    });
    mockPreview.mockResolvedValue({
      data: {
        matches_count: 2,
        matches_by_court: [
          [{ side_a: [1, 2], side_b: [3, 4], court_name: 'Court A' }],
        ],
      },
    });
  });

  it('loads location courts in knobs section', async () => {
    const { findByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    expect(await findByText('Courts')).toBeTruthy();
    expect(await findByText('Court A (#10)')).toBeTruthy();
    expect(mockGetCourts).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { location_id: 3 },
      })
    );
  });

  it('merges court selection order on MultiSelect apply and supports reorder', async () => {
    expect(mergeCourtSelection([10, 11], [11, 12])).toEqual([11, 12]);
    expect(mergeCourtSelection([10, 11], [10, 11])).toEqual([10, 11]);
    expect(mergeCourtSelection([10, 11], [11, 12, 10])).toEqual([10, 11, 12]);

    mockGetSchedule.mockResolvedValue(
      schedulePayload({
        courts: [
          { id_court: 10, name: 'Court A' },
          { id_court: 11, name: 'Court B' },
        ],
      })
    );
    mockGetCourts.mockResolvedValue({
      data: [
        { id_court: 10, name: 'Court A' },
        { id_court: 11, name: 'Court B' },
        { id_court: 12, name: 'Court C' },
      ],
    });

    const { findByText, getByLabelText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );

    await findByText('1. Court A');
    await findByText('2. Court B');
    expect(await findByText('2 selected')).toBeTruthy();

    fireEvent.press(getByLabelText('Move court 10 down'));
    expect(await findByText('1. Court B')).toBeTruthy();
    expect(await findByText('2. Court A')).toBeTruthy();
  });

  it('renders participations and allows collecting toggle', async () => {
    const { findByText, getAllByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="participations"
      />
    );
    expect(await findByText(/Alice/)).toBeTruthy();
    expect(await findByText(/Bob/)).toBeTruthy();
    const collectingLabels = getAllByText('Collecting points');
    expect(collectingLabels.length).toBeGreaterThanOrEqual(2);
    fireEvent.press(collectingLabels[1]);
  });

  it('disables generate when scores exist', async () => {
    mockGetSchedule.mockResolvedValue(
      schedulePayload({ has_scores: true, has_regular_matches: true })
    );
    const { findByText, getByText, getByTestId, queryByTestId } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText(/Scores: yes/);
    expect(getByTestId('generate-blocked-reason').props.children).toMatch(
      /scores/i
    );
    fireEvent.press(getByText('Generate'));
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(queryByTestId('generate-blocked-reason')).toBeTruthy();
  });

  it('hides generate blocked reason when unblocked', async () => {
    const { findByText, queryByTestId } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText(/Scores: no/);
    expect(queryByTestId('generate-blocked-reason')).toBeNull();
  });

  it('sends confirm_replace when replacing empty schedule', async () => {
    mockGetSchedule.mockResolvedValue(
      schedulePayload({ has_regular_matches: true })
    );
    const { findByText, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText(/Matches: yes/);
    fireEvent.press(getByText('Generate'));
    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalled();
    });
    expect(mockGenerate.mock.calls[0][1].confirm_replace).toBe(true);
  });

  it('shows finalized status from schedule is_finalized', async () => {
    const { findByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    expect(await findByText(/Finalized:\s*no/)).toBeTruthy();
  });

  it('delete schedule calls API after confirm when not gated', async () => {
    mockGetSchedule.mockResolvedValue(
      schedulePayload({ has_regular_matches: true })
    );
    const { findByText, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText(/Matches: yes/);
    fireEvent.press(getByText('Delete schedule'));
    await waitFor(() => {
      expect(mockDestroy).toHaveBeenCalledWith(9);
    });
  });

  it('orders Status, action buttons, knobs, then Courts', async () => {
    const { findByText, UNSAFE_root } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Status');
    const text = UNSAFE_root.findAllByType(require('react-native').Text)
      .map((n: any) => n.props.children)
      .flat()
      .map(String)
      .join(' ');
    const statusIdx = text.indexOf('Status');
    const previewIdx = text.indexOf('Preview');
    const knobsIdx = text.indexOf('Schedule knobs');
    const courtsIdx = text.indexOf('Courts');
    expect(statusIdx).toBeGreaterThanOrEqual(0);
    expect(previewIdx).toBeGreaterThan(statusIdx);
    expect(knobsIdx).toBeGreaterThan(previewIdx);
    expect(courtsIdx).toBeGreaterThan(knobsIdx);
  });

  it('allows Preview when finalized', async () => {
    mockGetSchedule.mockResolvedValue(
      schedulePayload({ is_finalized: true, has_regular_matches: true })
    );
    const { findByText, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText(/Finalized:\s*yes/);
    fireEvent.press(getByText('Preview'));
    await waitFor(() => {
      expect(mockPreview).toHaveBeenCalled();
    });
  });

  it('General shows mild hint and stacked read-only ED sections without mutate actions', async () => {
    mockGetSchedule.mockImplementation(async (edId: number) => {
      if (edId === 10) {
        return schedulePayload({
          has_regular_matches: false,
          edition_division: {
            playing_start_time: '11:00',
            playing_end_time: '17:00',
          },
        });
      }
      return schedulePayload({
        edition_division: {
          playing_start_time: '10:00',
          playing_end_time: '18:00',
        },
      });
    });
    const { findByTestId, queryByText, getByTestId } = renderTab(
      <EditionScheduleTab
        editionDivisionId={null}
        locationId={3}
        section="knobs"
        divisions={
          [
            { id_edition_division: 9, division_title: 'A' },
            { id_edition_division: 10, division_title: 'B' },
          ] as any
        }
      />
    );
    expect(await findByTestId('edition-general-edit-hint')).toBeTruthy();
    expect(getByTestId('schedule-general-ed-9')).toBeTruthy();
    expect(getByTestId('schedule-general-ed-10')).toBeTruthy();
    expect(queryByText('Select an edition division to manage the schedule.')).toBeNull();
    expect(queryByText('Generate')).toBeNull();
    expect(queryByText('Delete schedule')).toBeNull();
    expect(queryByText('Preview')).toBeNull();
  });

  it('requests board=1 for ED matches section', async () => {
    mockGetSchedule.mockResolvedValue(
      schedulePayload({
        board_metrics: {
          players_count: 0,
          matches_count: 0,
          points_per_match: null,
          partners_count_variation: 0,
          min_opponents_met: 0,
          max_opponents_met: 0,
          playing_distribution: { avg: 0, percentage: 0, css_class: 'poor' },
          template_identity: {
            players: 0,
            partners: 0,
            repeat: 1,
            courts: 1,
            version: null,
          },
        },
        players_board: [],
      })
    );
    const { findByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="matches"
      />
    );
    await findByText(/No matches yet/);
    expect(mockGetSchedule).toHaveBeenCalledWith(9, { board: true });
  });
});
