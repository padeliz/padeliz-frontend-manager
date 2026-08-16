import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import EditionStandingsTab from '@/components/editions/EditionStandingsTab';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

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
            player: { name: 'Ada Lovelace' },
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
            player: { name: 'Ada Lovelace' },
          },
        ],
        edition_division: {},
        matches: [],
      },
    })),
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

describe('EditionStandingsTab', () => {
  beforeEach(() => {
    (window as any).confirm = jest.fn(() => true);
  });

  it('shows player names and recalculate button', async () => {
    const { getByText, findByText } = renderTab(
      <EditionStandingsTab editionDivisionId={9} />
    );
    expect(await findByText(/Ada Lovelace/)).toBeTruthy();
    expect(getByText(/Recalculate/i)).toBeTruthy();
  });

  it('calls recalculate when pressed', async () => {
    const { standingsApi } = require('@/services/api/standingsApi');
    const { getByText, findByText } = renderTab(
      <EditionStandingsTab editionDivisionId={9} />
    );
    await findByText(/Ada Lovelace/);
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
});
