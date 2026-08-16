import React from 'react';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import EditionReplacementsTab, {
  matchLabel,
} from '@/components/editions/EditionReplacementsTab';

const mockGetSchedule = jest.fn();
const mockList = jest.fn();
const mockListForEdition = jest.fn();
const mockGetPlayers = jest.fn(async () => ({
  data: [{ id_player: 5, name: 'Guest Eve' }],
}));

jest.mock('@/services/api/scheduleApi', () => ({
  scheduleApi: {
    getSchedule: (...args: unknown[]) => mockGetSchedule(...args),
  },
}));

jest.mock('@/services/api/replacementsApi', () => ({
  replacementsApi: {
    list: (...args: unknown[]) => mockList(...args),
    listForEdition: (...args: unknown[]) => mockListForEdition(...args),
    create: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayers: (...args: unknown[]) => mockGetPlayers(...args),
    getPlayer: jest.fn(async () => ({
      data: { id_player: 5, name: 'Guest Eve' },
    })),
  })),
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

describe('matchLabel', () => {
  it('uses clockHi HH:MM from scheduled_start H:i:s', () => {
    const label = matchLabel({
      id_match: 1,
      scheduled_start: '20:00:00',
      match_kind: 'REGULAR',
    } as any);
    expect(label).toContain('20:00');
    expect(label).not.toContain('Invalid Date');
    expect(label).not.toMatch(/\bAM\b/);
    expect(label).not.toMatch(/\bPM\b/);
  });
});

describe('EditionReplacementsTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gates UI when allow_replacements is false', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        edition_division: { allow_replacements: false },
        participations: [],
        matches: [],
      },
    });
    mockList.mockResolvedValue({ data: [] });
    const { findByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    expect(
      await findByText(/Replacements are disabled.*allow_replacements/)
    ).toBeTruthy();
  });

  it('shows player names for participations and rows', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        edition_division: { allow_replacements: true },
        participations: [
          {
            id_participation: 1,
            player: { name: 'Original Alice' },
          },
          {
            id_participation: 2,
            player: { name: 'Sub Bob' },
          },
        ],
        matches: [],
      },
    });
    mockList.mockResolvedValue({
      data: [
        {
          id_replacement: 8,
          original_participation_id: 1,
          substitute_participation_id: 2,
          substitute_player_id: null,
          match_id: null,
        },
      ],
    });
    const { findByText, getByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    expect(await findByText(/#8:.*Original Alice/)).toBeTruthy();
    expect(await findByText(/Sub Bob/)).toBeTruthy();
    expect(getByTestId('replacements-create-form-row')).toBeTruthy();
    expect(
      getByTestId('replacements-create-form-row').props.className
    ).toContain('flex-row');
    expect(
      getByTestId('replacements-create-form-row').props.className
    ).toContain('flex-wrap');
  });

  it('lists edition-wide replacements in General and hides create', async () => {
    mockListForEdition.mockResolvedValue({
      data: [
        {
          id_replacement: 1,
          edition_division_id: 170,
          original_participation_id: 10,
          substitute_participation_id: 11,
          edition_division: { division_title: 'Beginners' },
          original_participation: {
            id_participation: 10,
            player: { name: 'Alice Original' },
          },
          substitute_participation: {
            id_participation: 11,
            player: { name: 'Bob Sub' },
          },
        },
        {
          id_replacement: 2,
          edition_division_id: 173,
          original_participation_id: 20,
          substitute_participation_id: 21,
          edition_division: { division_title: 'Explorers' },
          original_participation: {
            id_participation: 20,
            player: { name: 'Carol Original' },
          },
          substitute_participation: {
            id_participation: 21,
            player: { name: 'Dan Sub' },
          },
        },
      ],
    });
    const { findByText, queryByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={null} />
    );
    expect(await findByText(/Beginners/)).toBeTruthy();
    expect(await findByText(/Explorers/)).toBeTruthy();
    expect(await findByText(/Alice Original/)).toBeTruthy();
    expect(await findByText(/Bob Sub/)).toBeTruthy();
    expect(queryByText('Create replacement')).toBeNull();
    expect(queryByText(/Participation #10/)).toBeNull();
    expect(queryByText(/Select an edition/)).toBeNull();
    expect(await findByText(/Pick an edition division above to edit/)).toBeTruthy();
    expect(mockGetSchedule).not.toHaveBeenCalled();
    expect(mockListForEdition).toHaveBeenCalledWith(36);
  });

  it('substitute picker uses the shared searchable player picker', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        edition_division: { allow_replacements: true },
        participations: [
          { id_participation: 1, player: { name: 'Original Alice' } },
        ],
        matches: [],
      },
    });
    mockList.mockResolvedValue({ data: [] });
    const { findByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    const picker = await findByTestId('replacements-substitute-picker');
    fireEvent.press(within(picker).getByText('None'));
    expect(await findByTestId('dropdown-search')).toBeTruthy();
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalled());
    for (const call of mockGetPlayers.mock.calls) {
      expect(call[0].per_page).toBeLessThanOrEqual(100);
    }
  });
});
