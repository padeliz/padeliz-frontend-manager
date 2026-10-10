import {
  PageChromeProvider,
  usePageChrome,
} from '@/components/chrome/PageChromeProvider';
import EventStandingsTab from '@/components/events/EventStandingsTab';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Pressable } from 'react-native';

const mockPlaySuccess = jest.fn(async () => undefined);
const mockPlayError = jest.fn(async () => undefined);

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: (...args: unknown[]) => mockPlaySuccess(...args),
  playError: (...args: unknown[]) => mockPlayError(...args),
}));

jest.mock('@/services/api/standingsApi', () => ({
  standingsApi: {
    getStandings: jest.fn(async () => ({
      data: [
        {
          id_standing: 1,
          event_division_id: 9,
          participation_id: 100,
          points_total: 10,
          wins: 2,
          rank: 1,
          participation: {
            id_participation: 100,
            player: { name: 'Mara Lovelace' },
          },
        },
      ],
    })),
    recalculate: jest.fn(async () => ({ data: [] })),
    updateStanding: jest.fn(async () => ({ data: {} })),
  },
}));

const mockGetParticipationLevel = jest.fn(async (..._args: unknown[]) => ({
  data: null as null | { level: string },
}));
const mockUpsertParticipationLevel = jest.fn(
  async (..._args: unknown[]) => ({ data: {} })
);

jest.mock('@/services/api/eventParticipationsApi', () => ({
  EventParticipationsApiService: jest.fn().mockImplementation(() => ({
    getParticipationLevel: (...args: unknown[]) =>
      mockGetParticipationLevel(...args),
    upsertParticipationLevel: (...args: unknown[]) =>
      mockUpsertParticipationLevel(...args),
  })),
}));

const mockGetAllLevels = jest.fn(async () => [
  { id_level: 1, name: 'Mid', level_min: '3.00', level_max: '4.99' },
]);

jest.mock('@/services/api/levelsApi', () => ({
  LevelsApiService: jest.fn().mockImplementation(() => ({
    getAllLevels: () => mockGetAllLevels(),
  })),
}));

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: jest.fn(async () => ({
      data: {
        is_finalized: false,
        participations: [
          {
            id_participation: 100,
            player: { name: 'Mara Lovelace' },
          },
        ],
        event_division: {},
        matches: [],
      },
    })),
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

describe('EventStandingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastChromeSaveError = null;
    (window as any).confirm = jest.fn(() => true);
    mockGetParticipationLevel.mockResolvedValue({ data: null });
    mockGetAllLevels.mockResolvedValue([
      { id_level: 1, name: 'Mid', level_min: '3.00', level_max: '4.99' },
    ]);
  });

  it('shows the saved participation level in a per-row level input', async () => {
    mockGetParticipationLevel.mockResolvedValue({ data: { level: '3.50' } });
    const { findByTestId } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    const input = await findByTestId('standing-level-100');
    await waitFor(() => expect(input.props.value).toBe('3.50'));
    expect(mockGetParticipationLevel).toHaveBeenCalledWith(100);
  });

  it('saves an entered level through event-participations/{id}/level', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    const { findByTestId, getByTestId } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    const input = await findByTestId('standing-level-100');
    fireEvent.changeText(input, '3.50');
    fireEvent.press(getByTestId('chrome-save'));

    await waitFor(() =>
      expect(mockUpsertParticipationLevel).toHaveBeenCalledWith(100, '3.50')
    );
    // The standing row itself was untouched.
    expect(standingsApi.updateStanding).not.toHaveBeenCalled();
    expect(lastChromeSaveError).toBeNull();
  });

  it('rejects a level without 2 decimals before any request', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    const { findByTestId, getByTestId, getByDisplayValue } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    const input = await findByTestId('standing-level-100');
    fireEvent.changeText(getByDisplayValue('10'), '15');
    fireEvent.changeText(input, '3.5');
    fireEvent.press(getByTestId('chrome-save'));

    await waitFor(() => expect(lastChromeSaveError).toBeInstanceOf(Error));
    expect((lastChromeSaveError as Error).message).toMatch(/2 decimals/);
    expect(mockUpsertParticipationLevel).not.toHaveBeenCalled();
    expect(standingsApi.updateStanding).not.toHaveBeenCalled();
  });

  it('rejects a 2-decimal level outside every band before any request', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    const { findByTestId, getByTestId } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    const input = await findByTestId('standing-level-100');
    await waitFor(() => expect(mockGetAllLevels).toHaveBeenCalled());
    fireEvent.changeText(input, '8.00');
    fireEvent.press(getByTestId('chrome-save'));

    await waitFor(() => expect(lastChromeSaveError).toBeInstanceOf(Error));
    expect((lastChromeSaveError as Error).message).toMatch(/outside every/);
    expect(mockUpsertParticipationLevel).not.toHaveBeenCalled();
    expect(standingsApi.updateStanding).not.toHaveBeenCalled();
  });

  it('accepts an in-band 2-decimal level', async () => {
    const { findByTestId, getByTestId } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    const input = await findByTestId('standing-level-100');
    await waitFor(() => expect(mockGetAllLevels).toHaveBeenCalled());
    fireEvent.changeText(input, '3.75');
    fireEvent.press(getByTestId('chrome-save'));

    await waitFor(() =>
      expect(mockUpsertParticipationLevel).toHaveBeenCalledWith(100, '3.75')
    );
    expect(lastChromeSaveError).toBeNull();
  });

  it('does not re-send an unchanged level', async () => {
    mockGetParticipationLevel.mockResolvedValue({ data: { level: '3.50' } });
    const { findByTestId, getByTestId } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    const input = await findByTestId('standing-level-100');
    await waitFor(() => expect(input.props.value).toBe('3.50'));
    fireEvent.changeText(input, '3.50');
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => expect(lastChromeSaveError).toBeNull());
    expect(mockUpsertParticipationLevel).not.toHaveBeenCalled();
  });

  it('surfaces API level errors through chrome Save', async () => {
    mockUpsertParticipationLevel.mockRejectedValueOnce(
      new Error('Level 3.75 is not inside a seeded level band.')
    );
    const { findByTestId, getByTestId } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    fireEvent.changeText(await findByTestId('standing-level-100'), '3.75');
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => expect(lastChromeSaveError).toBeInstanceOf(Error));
    expect((lastChromeSaveError as Error).message).toMatch(/seeded level band/);
  });

  it('shows player names and recalculate button', async () => {
    const { getByText, findByText } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    expect(await findByText(/Mara Lovelace/)).toBeTruthy();
    expect(getByText(/Recalculate/i)).toBeTruthy();
  });

  it('calls recalculate when pressed', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    const { getByText, findByText } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    await findByText(/Mara Lovelace/);
    fireEvent.press(getByText(/Recalculate/i));
    await waitFor(() => {
      expect(standingsApi.recalculate).toHaveBeenCalledWith(9);
    });
  });

  it('General shows hint and stacked rows without Recalculate', async () => {
    const { findByTestId, queryByText, getByTestId } = renderTab(
      <EventStandingsTab
        eventDivisionId={null}
        divisions={
          [{ id_event_division: 9, division_title: 'A' }] as any
        }
      />
    );
    expect(await findByTestId('event-general-edit-hint')).toBeTruthy();
    expect(getByTestId('standings-general-ed-9')).toBeTruthy();
    expect(queryByText(/Select an event division to edit standings/)).toBeNull();
    expect(queryByText(/Recalculate/i)).toBeNull();
  });

  it('asks for confirmation before recalculating and aborts when declined', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    (window as any).confirm = jest.fn(() => false);
    const { getByText, findByText } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    await findByText(/Mara Lovelace/);
    fireEvent.press(getByText(/Recalculate/i));
    expect((window as any).confirm).toHaveBeenCalled();
    expect(standingsApi.recalculate).not.toHaveBeenCalled();
  });

  it('reports recalculate failure on the button instead of a page banner', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    standingsApi.recalculate.mockRejectedValueOnce(new Error('Recalc boom'));
    const { getByText, findByText, findByTestId, queryByText } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    await findByText(/Mara Lovelace/);
    fireEvent.press(getByText(/Recalculate/i));
    expect(await findByTestId('standings-recalculate-error')).toBeTruthy();
    expect(queryByText('Recalc boom')).toBeNull();
    expect(queryByText('Recalculate failed')).toBeNull();
  });

  it('plays mutation feedback when recalculate succeeds', async () => {
    const { getByText, findByText } = renderTab(
      <EventStandingsTab eventDivisionId={9} />
    );
    await findByText(/Mara Lovelace/);
    fireEvent.press(getByText(/Recalculate/i));
    await waitFor(() => {
      expect(mockPlaySuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('chrome Save rethrows and renders no error banner', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    standingsApi.updateStanding.mockRejectedValueOnce(new Error('Save boom'));
    const { findByText, getByDisplayValue, getByTestId, queryByText } =
      renderTab(<EventStandingsTab eventDivisionId={9} />);
    await findByText(/Mara Lovelace/);

    fireEvent.changeText(getByDisplayValue('10'), '15');
    fireEvent.press(getByTestId('chrome-save'));

    await waitFor(() => {
      expect(lastChromeSaveError).toBeInstanceOf(Error);
    });
    expect((lastChromeSaveError as Error).message).toBe('Save boom');
    expect(queryByText('Save boom')).toBeNull();
    expect(queryByText('Save failed')).toBeNull();
  });
});

describe('EventStandingsTab source contract', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'EventStandingsTab.tsx'),
    'utf8'
  );

  it('drives Recalculate with ActionButton + useActionButtonStatus', () => {
    expect(src).toContain(
      "import ActionButton from '@/components/ui/ActionButton'"
    );
    expect(src).toContain(
      "import { useActionButtonStatus } from '@/hooks/useActionButtonStatus'"
    );
    expect(src).toMatch(
      /testID="standings-recalculate"[\s\S]*?variant="primary"/
    );
  });

  it('uses the shared confirmAction helper instead of a local copy', () => {
    expect(src).toContain(
      "import { confirmAction } from '@/utils/confirmAction'"
    );
    expect(src).not.toMatch(/function confirmAction\s*\(/);
    expect(src).not.toContain('Alert.alert');
  });

  it('drops the press-only error banner state', () => {
    expect(src).not.toContain('setError');
    expect(src).not.toMatch(/const \[error, setError\]/);
    expect(src).not.toContain('text-red-600');
  });

  it('gives the Recalculate mutation sticky auditory feedback', () => {
    expect(src).toContain(
      'const recalculateStatus = useActionButtonStatus({ auditoryFeedback: true });'
    );
    expect(src).not.toContain('successHoldMs');
  });

  it('confirms outside run and lets the run throw', () => {
    expect(src).toMatch(
      /confirmAction\([\s\S]*?recalculateStatus\.run\(async \(\) => \{/
    );
    expect(src).not.toMatch(/catch \(e: any\)/);
  });

  it('keeps the finalized read-only notice', () => {
    expect(src).toContain('standings are read-only');
  });
});
