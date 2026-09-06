import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import EditionScheduleTab, {
  mergeCourtSelection,
} from '@/components/editions/EditionScheduleTab';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Pressable } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

const mockGetSchedule = jest.fn();
const mockUpdateForm = jest.fn(async () => ({ data: {} }));
const mockPreview = jest.fn();
const mockGenerate = jest.fn(async () => ({ data: {} }));
const mockDestroy = jest.fn(async () => ({ data: {} }));
const mockGetCourts = jest.fn();
const mockPlaySuccess = jest.fn(async () => undefined);
const mockPlayError = jest.fn(async () => undefined);

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: (...args: unknown[]) => mockPlaySuccess(...args),
  playError: (...args: unknown[]) => mockPlayError(...args),
}));

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

let lastChromeSaveError: unknown = null;

function ChromeSaveProbe() {
  const { actions } = usePageChrome();
  return (
    <Pressable
      testID="chrome-save"
      onPress={() => {
        void (async () => {
          try {
            await actions?.save?.();
          } catch (e) {
            lastChromeSaveError = e;
          }
        })();
      }}
    />
  );
}

function renderTab(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <ChromeSaveProbe />
        {ui}
      </PageChromeProvider>
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
        id_edition_division: 9,
        playing_start_time: '10:00',
        playing_end_time: '18:00',
      },
      schedule: {
        id_edition_division_schedule: 1,
        edition_division_id: 9,
        allow_replacements: true,
        include_final: false,
        has_demonstrative_match: false,
        include_scores: true,
        player_matches_repeat: 1,
        final_points_target: 24,
        adjust: 0,
      },
      matches: [],
      ...overrides,
    },
  };
}

describe('EditionScheduleTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastChromeSaveError = null;
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

  it('omits collecting flags and participation_ids from chrome Save', async () => {
    const { findByText, getByTestId } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');

    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdateForm).toHaveBeenCalled();
    });
    const saveBody = mockUpdateForm.mock.calls[0][1];
    expect(saveBody).not.toHaveProperty('is_collecting_points');
    expect(saveBody).not.toHaveProperty('participation_ids');
  });

  it('omits collecting flags and participation_ids from Preview persist and preview body', async () => {
    const { findByText, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');
    fireEvent.press(getByText('Preview'));
    await waitFor(() => {
      expect(mockUpdateForm).toHaveBeenCalled();
      expect(mockPreview).toHaveBeenCalled();
    });
    const previewPersist = mockUpdateForm.mock.calls[0][1];
    expect(previewPersist).not.toHaveProperty('is_collecting_points');
    expect(previewPersist).not.toHaveProperty('participation_ids');
    const previewBody = mockPreview.mock.calls[0][1];
    expect(previewBody).not.toHaveProperty('is_collecting_points');
    expect(previewBody).not.toHaveProperty('participation_ids');
  });

  it('omits collecting flags and participation_ids from Generate', async () => {
    const { findByText, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');
    fireEvent.press(getByText('Generate'));
    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalled();
    });
    const generateBody = mockGenerate.mock.calls[0][1];
    expect(generateBody).not.toHaveProperty('is_collecting_points');
    expect(generateBody).not.toHaveProperty('participation_ids');
  });

  it('does not render a participations section', async () => {
    const { findByText, queryByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Schedule knobs');
    expect(queryByText('Participations order')).toBeNull();
    expect(queryByText('Collecting points')).toBeNull();
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

  it('shows the playing window read-only and never sends times back', async () => {
    const { findByTestId, getByTestId, queryByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    expect(await findByTestId('schedule-playing-window')).toHaveTextContent(
      /10:00 – 18:00/
    );
    expect(queryByText('Start (HH:MM)')).toBeNull();
    expect(queryByText('End (HH:MM)')).toBeNull();

    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdateForm).toHaveBeenCalled();
    });
    const saveBody = mockUpdateForm.mock.calls[0][1];
    expect(saveBody).not.toHaveProperty('playing_start_time');
    expect(saveBody).not.toHaveProperty('playing_end_time');
    expect(saveBody).not.toHaveProperty('include_club_host_on_pdf');
  });

  it('seeds knob defaults when the schedule row is missing', async () => {
    mockGetSchedule.mockResolvedValue(schedulePayload({ schedule: null }));
    const { findByText, getByTestId } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Schedule knobs');
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdateForm).toHaveBeenCalled();
    });
    expect(mockUpdateForm.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        player_matches_repeat: 1,
        include_scores: true,
        allow_replacements: true,
        final_points_target: 24,
        adjust: 0,
      })
    );
  });

  it('persists adjust from the schedule row through save', async () => {
    mockGetSchedule.mockResolvedValue(
      schedulePayload({
        schedule: {
          id_edition_division_schedule: 1,
          edition_division_id: 9,
          allow_replacements: true,
          include_final: false,
          has_demonstrative_match: false,
          include_scores: true,
          player_matches_repeat: 1,
          final_points_target: 24,
          adjust: 4,
        },
      })
    );
    const { findByText, getByTestId } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Schedule knobs');

    fireEvent.press(getByTestId('schedule-adjust--2'));
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdateForm).toHaveBeenCalled();
    });
    expect(mockUpdateForm.mock.calls[0][1].adjust).toBe(-2);
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

  it('asks for confirmation before generating and aborts when declined', async () => {
    (window as any).confirm = jest.fn(() => false);
    const { findByText, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');
    fireEvent.press(getByText('Generate'));
    expect((window as any).confirm).toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('asks for confirmation before deleting and aborts when declined', async () => {
    (window as any).confirm = jest.fn(() => false);
    const { findByText, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');
    fireEvent.press(getByText('Delete schedule'));
    expect((window as any).confirm).toHaveBeenCalled();
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('reports action failures on the button instead of a page banner', async () => {
    mockPreview.mockRejectedValueOnce(new Error('Preview boom'));
    const { findByText, getByText, findByTestId, queryByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');
    fireEvent.press(getByText('Preview'));
    expect(await findByTestId('schedule-preview-error')).toBeTruthy();
    expect(queryByText('Preview boom')).toBeNull();
  });

  it('chrome Save rethrows and renders no error banner', async () => {
    mockUpdateForm.mockRejectedValueOnce(new Error('Save boom'));
    const { findByText, getByTestId, queryByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(lastChromeSaveError).toBeInstanceOf(Error);
    });
    expect((lastChromeSaveError as Error).message).toBe('Save boom');
    expect(queryByText('Save boom')).toBeNull();
    expect(queryByText('Failed to save form')).toBeNull();
  });

  it('plays mutation feedback for Generate but stays silent for Preview', async () => {
    const { findByText, findByTestId, getByText } = renderTab(
      <EditionScheduleTab
        editionDivisionId={9}
        locationId={3}
        section="knobs"
      />
    );
    await findByText('Courts');

    fireEvent.press(getByText('Preview'));
    expect(await findByTestId('schedule-preview-success')).toBeTruthy();
    expect(mockPlaySuccess).not.toHaveBeenCalled();

    fireEvent.press(getByText('Generate'));
    await waitFor(() => {
      expect(mockPlaySuccess).toHaveBeenCalledTimes(1);
    });
  });
});

describe('EditionScheduleTab source contract', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'EditionScheduleTab.tsx'),
    'utf8'
  );

  it('drives the action pills with ActionButton + useActionButtonStatus', () => {
    expect(src).toContain(
      "import ActionButton from '@/components/ui/ActionButton'"
    );
    expect(src).toContain(
      "import { useActionButtonStatus } from '@/hooks/useActionButtonStatus'"
    );
    expect(src).not.toContain('actionPillClass');
    expect(src).toMatch(/testID="schedule-preview"[\s\S]*?variant="primary"/);
    expect(src).toMatch(/testID="schedule-generate"[\s\S]*?variant="positive"/);
    expect(src).toMatch(/testID="schedule-delete"[\s\S]*?variant="danger"/);
  });

  it('uses the shared confirmAction helper instead of a local copy', () => {
    expect(src).toContain(
      "import { confirmAction } from '@/utils/confirmAction'"
    );
    expect(src).not.toMatch(/function confirmAction\s*\(/);
    expect(src).not.toContain('Alert.alert');
  });

  it('never sets a press-tied error banner', () => {
    expect(src).not.toContain('setError');
    expect(src).not.toMatch(/const \[error, setError\]/);
  });

  it('gives mutations auditory feedback and keeps Preview silent', () => {
    expect(src).toContain('const previewStatus = useActionButtonStatus();');
    expect(src).toContain(
      'const generateStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
    expect(src).toContain(
      'const deleteStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
  });

  it('keeps label-only action statuses sticky (no successHoldMs)', () => {
    expect(src).not.toContain('successHoldMs');
  });

  it('confirms outside run and lets the run throw', () => {
    expect(src).toMatch(
      /confirmAction\([\s\S]*?generateStatus\.run\(async \(\) => \{/
    );
    expect(src).toMatch(
      /confirmAction\([\s\S]*?deleteStatus\.run\(async \(\) => \{/
    );
    expect(src).not.toMatch(/catch \(e: any\)/);
  });
});
