import {
  PageChromeProvider,
  usePageChrome,
} from '@/components/chrome/PageChromeProvider';
import EditionStandingsTab from '@/components/editions/EditionStandingsTab';
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
          edition_division_id: 9,
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
        edition_division: {},
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

describe('EditionStandingsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastChromeSaveError = null;
    (window as any).confirm = jest.fn(() => true);
  });

  it('shows player names and recalculate button', async () => {
    const { getByText, findByText } = renderTab(
      <EditionStandingsTab editionDivisionId={9} />
    );
    expect(await findByText(/Mara Lovelace/)).toBeTruthy();
    expect(getByText(/Recalculate/i)).toBeTruthy();
  });

  it('calls recalculate when pressed', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    const { getByText, findByText } = renderTab(
      <EditionStandingsTab editionDivisionId={9} />
    );
    await findByText(/Mara Lovelace/);
    fireEvent.press(getByText(/Recalculate/i));
    await waitFor(() => {
      expect(standingsApi.recalculate).toHaveBeenCalledWith(9);
    });
  });

  it('General shows hint and stacked rows without Recalculate', async () => {
    const { findByTestId, queryByText, getByTestId } = renderTab(
      <EditionStandingsTab
        editionDivisionId={null}
        divisions={
          [{ id_edition_division: 9, division_title: 'A' }] as any
        }
      />
    );
    expect(await findByTestId('edition-general-edit-hint')).toBeTruthy();
    expect(getByTestId('standings-general-ed-9')).toBeTruthy();
    expect(queryByText(/Select an edition division to edit standings/)).toBeNull();
    expect(queryByText(/Recalculate/i)).toBeNull();
  });

  it('asks for confirmation before recalculating and aborts when declined', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    (window as any).confirm = jest.fn(() => false);
    const { getByText, findByText } = renderTab(
      <EditionStandingsTab editionDivisionId={9} />
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
      <EditionStandingsTab editionDivisionId={9} />
    );
    await findByText(/Mara Lovelace/);
    fireEvent.press(getByText(/Recalculate/i));
    expect(await findByTestId('standings-recalculate-error')).toBeTruthy();
    expect(queryByText('Recalc boom')).toBeNull();
    expect(queryByText('Recalculate failed')).toBeNull();
  });

  it('plays mutation feedback when recalculate succeeds', async () => {
    const { getByText, findByText } = renderTab(
      <EditionStandingsTab editionDivisionId={9} />
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
      renderTab(<EditionStandingsTab editionDivisionId={9} />);
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

describe('EditionStandingsTab source contract', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'EditionStandingsTab.tsx'),
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
