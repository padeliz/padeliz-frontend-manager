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
const mockCreate = jest.fn();
const mockPatch = jest.fn();
const mockDestroy = jest.fn();
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
    create: (...args: unknown[]) => mockCreate(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    destroy: (...args: unknown[]) => mockDestroy(...args),
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

  it('create with None substitute omits substitute ids', async () => {
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
    mockCreate.mockResolvedValue({ data: { id_replacement: 9 } });
    const { findByText, getByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    fireEvent.press(await findByText('Select original participation'));
    fireEvent.press(getByText('Original Alice'));
    fireEvent.press(getByText('Create'));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    const payload = mockCreate.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.original_participation_id).toBe(1);
    expect(payload).not.toHaveProperty('substitute_participation_id');
    expect(payload).not.toHaveProperty('substitute_player_id');
  });

  it('edit existing row calls patch including cleared substitute and match', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        edition_division: { allow_replacements: true },
        participations: [
          { id_participation: 1, player: { name: 'Original Alice' } },
          { id_participation: 2, player: { name: 'Sub Bob' } },
        ],
        matches: [{ id_match: 44, scheduled_start: '20:00:00', match_kind: 'REGULAR' }],
      },
    });
    mockList.mockResolvedValue({
      data: [
        {
          id_replacement: 8,
          original_participation_id: 1,
          substitute_participation_id: 2,
          substitute_player_id: null,
          match_id: 44,
        },
      ],
    });
    mockPatch.mockResolvedValue({ data: { id_replacement: 8 } });
    const { findByTestId, getByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('replacements-edit-8'));
    expect(await findByTestId('replacements-save')).toBeTruthy();
    const picker = await findByTestId('replacements-substitute-picker');
    fireEvent.press(within(picker).getByText('Participation · Sub Bob'));
    fireEvent.press(getByText('None'));
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockPatch).toHaveBeenCalled());
    expect(mockPatch).toHaveBeenCalledWith(
      8,
      expect.objectContaining({
        original_participation_id: 1,
        substitute_participation_id: null,
        substitute_player_id: null,
      })
    );
  });

  it('hides create edit and delete when finalized', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: true,
        edition_division: { allow_replacements: true },
        participations: [
          { id_participation: 1, player: { name: 'Original Alice' } },
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
          match_id: null,
        },
      ],
    });
    const { findByText, queryByText, queryByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    expect(await findByText(/#8:/)).toBeTruthy();
    expect(queryByText('Create replacement')).toBeNull();
    expect(queryByText('Create')).toBeNull();
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Delete')).toBeNull();
    expect(queryByTestId('replacements-edit-8')).toBeNull();
  });

  it('hides edit and delete in General', async () => {
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
      ],
    });
    const { findByText, queryByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={null} />
    );
    expect(await findByText(/Alice Original/)).toBeTruthy();
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Delete')).toBeNull();
    expect(queryByText('Create replacement')).toBeNull();
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
