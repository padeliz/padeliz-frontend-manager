import React from 'react';
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import EditionReplacementsTab, {
  matchLabel,
} from '@/components/editions/EditionReplacementsTab';
import { PLAYER_PICKER_DEBOUNCE_MS } from '@/hooks/usePlayerPicker';
import type { QueryClient } from '@tanstack/react-query';

const mockGetSchedule = jest.fn();
const mockList = jest.fn();
const mockListForEdition = jest.fn();
const mockCreate = jest.fn();
const mockPatch = jest.fn();
const mockDestroy = jest.fn();
const mockGetPlayers = jest.fn(async () => ({
  data: [{ id_player: 5, name: 'Guest Eve', pdf_avatar_url: 'https://cdn.example/eve.png' }],
}));
const mockGeneratePdfAvatar = jest.fn();
const mockPlaySuccess = jest.fn(async () => undefined);
const mockPlayError = jest.fn(async () => undefined);

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
      data: {
        id_player: 5,
        name: 'Guest Eve',
        pdf_avatar_url: 'https://cdn.example/eve.png',
      },
    })),
    generatePdfAvatar: (...args: unknown[]) => mockGeneratePdfAvatar(...args),
  })),
}));

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: (...args: unknown[]) => mockPlaySuccess(...args),
  playError: (...args: unknown[]) => mockPlayError(...args),
}));

// Keep Tooltip on its native branch so error text is readable via a11y hint.
jest.mock('@/utils/isWebPlatform', () => ({
  isWebPlatform: () => false,
}));

let activeClient: QueryClient | null = null;

function renderWithProviders(ui: React.ReactElement) {
  activeClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={activeClient}>
      <PageChromeProvider>{ui}</PageChromeProvider>
    </QueryClientProvider>
  );
}

function scheduleWithOnePair() {
  return {
    data: {
      is_finalized: false,
      schedule: { allow_replacements: true },
      participations: [
        { id_participation: 1, player: { name: 'Original Alice' } },
        { id_participation: 2, player: { name: 'Sub Bob' } },
      ],
      matches: [],
    },
  };
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
    (window as any).confirm = jest.fn(() => true);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await act(async () => {
      await new Promise<void>(resolve =>
        setTimeout(resolve, PLAYER_PICKER_DEBOUNCE_MS)
      );
    });
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  it('gates UI when allow_replacements is false', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        schedule: { allow_replacements: false },
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
        schedule: { allow_replacements: true },
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

  it('renders Create and Delete as ActionButtons with mapped variants', async () => {
    mockGetSchedule.mockResolvedValue(scheduleWithOnePair());
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
    const { findByTestId, getByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    const create = await findByTestId('replacements-create');
    // Disabled until an original participation is picked.
    expect(create.props.accessibilityState.disabled).toBe(true);
    expect(getByTestId('replacements-delete-8').props.className).toMatch(
      /bg-red-600/
    );
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
        schedule: { allow_replacements: true },
        participations: [
          { id_participation: 1, player: { name: 'Original Alice' } },
        ],
        matches: [],
      },
    });
    mockList.mockResolvedValue({ data: [] });
    mockCreate.mockResolvedValue({ data: { id_replacement: 9 } });
    const { findByText, findByTestId, getByText } = renderWithProviders(
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
    expect(await findByTestId('replacements-create-success')).toBeTruthy();
    expect(mockPlaySuccess).toHaveBeenCalled();
  });

  it('create failure reports on the button without an action banner', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        schedule: { allow_replacements: true },
        participations: [
          { id_participation: 1, player: { name: 'Original Alice' } },
        ],
        matches: [],
      },
    });
    mockList.mockResolvedValue({ data: [] });
    mockCreate.mockRejectedValue(new Error('Create exploded'));
    const { findByText, findByTestId, getByTestId, getByText, queryByText } =
      renderWithProviders(
        <EditionReplacementsTab editionId={36} editionDivisionId={9} />
      );
    fireEvent.press(await findByText('Select original participation'));
    fireEvent.press(getByText('Original Alice'));
    fireEvent.press(getByText('Create'));
    expect(await findByTestId('replacements-create-error')).toBeTruthy();
    expect(
      getByTestId('replacements-create-tooltip').props.accessibilityHint
    ).toBe('Create exploded');
    expect(mockPlayError).toHaveBeenCalled();
    expect(queryByText('Create exploded')).toBeNull();
  });

  it('edit existing row calls patch including cleared substitute and match', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        schedule: { allow_replacements: true },
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
    expect(mockPlaySuccess).toHaveBeenCalled();
  });

  it('Delete confirms before deleting and skips the call when declined', async () => {
    mockGetSchedule.mockResolvedValue(scheduleWithOnePair());
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
    (window as any).confirm = jest.fn(() => false);
    const { findByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('replacements-delete-8'));
    await waitFor(() => expect((window as any).confirm).toHaveBeenCalled());
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('Delete runs after confirmation and reports success on its own button', async () => {
    mockGetSchedule.mockResolvedValue(scheduleWithOnePair());
    mockList.mockResolvedValue({
      data: [
        {
          id_replacement: 8,
          original_participation_id: 1,
          substitute_participation_id: 2,
          match_id: null,
        },
        {
          id_replacement: 9,
          original_participation_id: 2,
          substitute_participation_id: 1,
          match_id: null,
        },
      ],
    });
    mockDestroy.mockResolvedValue({ data: null });
    (window as any).confirm = jest.fn(() => true);
    const { findByTestId, getByTestId, queryByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('replacements-delete-8'));
    await waitFor(() => expect(mockDestroy).toHaveBeenCalledWith(8));
    expect(await findByTestId('replacements-delete-8-success')).toBeTruthy();
    // Per-button status: the sibling row is untouched.
    expect(queryByTestId('replacements-delete-9-success')).toBeNull();
    expect(
      getByTestId('replacements-delete-9').props.accessibilityState.disabled
    ).toBe(false);
    expect(mockPlaySuccess).toHaveBeenCalled();
  });

  it('Delete failure reports on the button without an action banner', async () => {
    mockGetSchedule.mockResolvedValue(scheduleWithOnePair());
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
    mockDestroy.mockRejectedValue(new Error('Delete refused'));
    const { findByTestId, getByTestId, queryByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    fireEvent.press(await findByTestId('replacements-delete-8'));
    expect(await findByTestId('replacements-delete-8-error')).toBeTruthy();
    expect(
      getByTestId('replacements-delete-8-tooltip').props.accessibilityHint
    ).toBe('Delete refused');
    expect(queryByText('Delete refused')).toBeNull();
    expect(mockPlayError).toHaveBeenCalled();
  });

  it('keeps the query load error banner', async () => {
    mockGetSchedule.mockResolvedValue(scheduleWithOnePair());
    mockList.mockRejectedValue(new Error('Replacements list failed'));
    const { findByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    expect(await findByText('Replacements list failed')).toBeTruthy();
  });

  it('hides create edit and delete when finalized', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: true,
        schedule: { allow_replacements: true },
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
    expect(queryByTestId('replacements-delete-8')).toBeNull();
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
    const { findByText, queryByText, queryByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={null} />
    );
    expect(await findByText(/Alice Original/)).toBeTruthy();
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Delete')).toBeNull();
    expect(queryByText('Create replacement')).toBeNull();
    expect(queryByTestId('replacements-delete-1')).toBeNull();
  });

  it('substitute picker uses the shared searchable player picker', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        schedule: { allow_replacements: true },
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
    expect(await findByTestId('dropdown-search-wrapper')).toBeTruthy();
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalled());
    for (const call of mockGetPlayers.mock.calls) {
      expect(call[0].per_page).toBeLessThanOrEqual(100);
    }
  });

  it('has no press-tied action error state and confirms deletes', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EditionReplacementsTab.tsx'),
      'utf8'
    );
    expect(src).not.toContain('setActionError');
    expect(src).not.toContain('actionError');
    expect(src).toContain("import { confirmAction } from '@/utils/confirmAction'");
    expect(src).toContain('useActionButtonStatus');
    expect(src).toContain('confirmAction(');
  });

  it('shows list avatars for original and substitute when nested URLs set', async () => {
    mockGetSchedule.mockResolvedValue(scheduleWithOnePair());
    mockList.mockResolvedValue({
      data: [
        {
          id_replacement: 7,
          original_participation_id: 1,
          substitute_participation_id: 2,
          original_participation: {
            id_participation: 1,
            is_collecting_points: true,
            player: {
              id_player: 1,
              name: 'Original Alice',
              pdf_avatar_url: 'https://cdn.example/a.png',
            },
          },
          substitute_participation: {
            id_participation: 2,
            is_collecting_points: false,
            player: {
              id_player: 2,
              name: 'Sub Bob',
              pdf_avatar_url: 'https://cdn.example/b.png',
            },
          },
        },
      ],
    });
    const { findByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    expect(
      await findByTestId('replacement-original-avatar-7-present')
    ).toBeTruthy();
    expect(
      await findByTestId('replacement-substitute-avatar-7-present')
    ).toBeTruthy();
  });

  it('reloads substitute guest avatar with collecting true', async () => {
    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/guest.png' },
    });
    mockGetSchedule.mockResolvedValue(scheduleWithOnePair());
    mockList.mockResolvedValue({
      data: [
        {
          id_replacement: 8,
          original_participation_id: 1,
          substitute_player_id: 5,
          original_participation: {
            id_participation: 1,
            is_collecting_points: true,
            player: { id_player: 1, name: 'Original Alice', pdf_avatar_url: null },
          },
          substitute_player: {
            id_player: 5,
            name: 'Guest Eve',
            pdf_avatar_url: null,
          },
        },
      ],
    });
    const { findByTestId } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );
    fireEvent.press(
      await findByTestId('replacement-substitute-avatar-8-reload')
    );
    await waitFor(() => {
      expect(mockGeneratePdfAvatar).toHaveBeenCalledWith(5, true);
    });
    expect(
      await findByTestId('replacement-substitute-avatar-8-present')
    ).toBeTruthy();
  });

  it('passes imageUrl on original and substitute dropdown options', async () => {
    mockGetSchedule.mockResolvedValue({
      data: {
        is_finalized: false,
        schedule: { allow_replacements: true },
        participations: [
          {
            id_participation: 1,
            pdf_avatar_url: 'https://cdn.example/alice.png',
            player: { name: 'Original Alice' },
          },
          {
            id_participation: 2,
            pdf_avatar_url: 'https://cdn.example/bob.png',
            player: { name: 'Sub Bob' },
          },
        ],
        matches: [],
      },
    });
    mockList.mockResolvedValue({ data: [] });
    const { findByTestId, findByText, getByText } = renderWithProviders(
      <EditionReplacementsTab editionId={36} editionDivisionId={9} />
    );

    const original = await findByTestId('replacements-original-picker');
    fireEvent.press(within(original).getByText('Select original participation'));
    const originalImg = await findByTestId('dropdown-option-image-1');
    expect(originalImg.props.source).toEqual({
      uri: 'https://cdn.example/alice.png',
    });
    fireEvent.press(getByText('Original Alice'));

    const substitute = await findByTestId('replacements-substitute-picker');
    fireEvent.press(within(substitute).getByText('None'));
    expect(await findByText('Participation · Sub Bob')).toBeTruthy();
    const partImg = await findByTestId('dropdown-option-image-part:2');
    expect(partImg.props.source).toEqual({
      uri: 'https://cdn.example/bob.png',
    });
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalled());
    const playerImg = await findByTestId('dropdown-option-image-player:5');
    expect(playerImg.props.source).toEqual({
      uri: 'https://cdn.example/eve.png',
    });
  });
});
