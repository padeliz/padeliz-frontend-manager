import EditionParticipationsTab from '@/components/editions/EditionParticipationsTab';
import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Pressable, Text, Platform } from 'react-native';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockReorder = jest.fn();
const mockUpdate = jest.fn();
const mockGetPlayers = jest.fn(async () => ({
  data: [{ id_player: 1, name: 'Alice' }],
}));

jest.mock('@/services/api/editionParticipationsApi', () => ({
  EditionParticipationsApiService: jest.fn().mockImplementation(() => ({
    createParticipation: (...args: unknown[]) => mockCreate(...args),
    deleteParticipation: (...args: unknown[]) => mockDelete(...args),
    reorderParticipations: (...args: unknown[]) => mockReorder(...args),
    updateParticipation: (...args: unknown[]) => mockUpdate(...args),
  })),
}));

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayers: (...args: unknown[]) => mockGetPlayers(...args),
    getPlayer: jest.fn(async () => ({
      data: { id_player: 1, name: 'Alice' },
    })),
  })),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    View,
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withSpring: (v: any) => v,
    runOnJS: (fn: any) => fn,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: () => ({
        enabled: () => ({
          activeOffsetY: () => ({
            onStart: () => ({
              onUpdate: () => ({
                onEnd: () => ({
                  onFinalize: () => ({}),
                }),
              }),
            }),
          }),
        }),
      }),
    },
  };
});

const divisions = [
  {
    id_edition_division: 9,
    edition_id: 1,
    division_id: 2,
    division_title: 'A',
    players_limit: 8,
    playing_start_time: '10:00',
    playing_end_time: '18:00',
    player_matches_repeat: 1,
    include_scores: true,
    has_demonstrative_match: false,
    inserted_at: 1,
    division: { id_division: 2, name: 'A', color: '#112233' },
  },
  {
    id_edition_division: 10,
    edition_id: 1,
    division_id: 3,
    division_title: 'B',
    players_limit: 8,
    playing_start_time: '10:00',
    playing_end_time: '18:00',
    player_matches_repeat: 1,
    include_scores: true,
    has_demonstrative_match: false,
    inserted_at: 1,
    division: { id_division: 3, name: 'B', color: '' },
  },
];

const participations = [
  {
    id_participation: 100,
    edition_id: 1,
    player_id: 1,
    edition_division_id: 9,
    division_id: 2,
    sort_order: 0,
    inserted_at: 1,
    is_collecting_points: true,
    player: { id_player: 1, name: 'Alice' },
  },
  {
    id_participation: 101,
    edition_id: 1,
    player_id: 2,
    edition_division_id: 10,
    division_id: 3,
    sort_order: 0,
    inserted_at: 1,
    is_collecting_points: false,
    player: { id_player: 2, name: 'Bob' },
  },
];

function ChromeProbe() {
  const { actions } = usePageChrome();
  return (
    <>
      <Text testID="chrome-is-dirty">{actions?.isDirty ? 'yes' : 'no'}</Text>
      <Text testID="chrome-can-save">{actions?.canSave ? 'yes' : 'no'}</Text>
      <Pressable testID="chrome-save" onPress={() => void actions?.save?.()} />
    </>
  );
}

const customFieldOptions = [
  { label: 'Shirt size', value: 10 },
  { label: 'Club', value: 11 },
];

function renderTab(opts: {
  editionFinalized: boolean;
  selectedDivisionId: number | null;
  registeredNotParticipatingCount?: number;
  participationsLocked?: boolean;
  participationsOverride?: typeof participations;
  customFieldOptions?: Array<{ label: string; value: number }>;
  selectedCustomFieldIds?: number[];
  onCustomFieldSelectionChange?: (ids: number[]) => void;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <ChromeProbe />
        <EditionParticipationsTab
          editionId={1}
          editionFinalized={opts.editionFinalized}
          divisions={divisions as any}
          participations={(opts.participationsOverride ?? participations) as any}
          selectedDivisionId={opts.selectedDivisionId}
          registeredNotParticipatingCount={
            opts.registeredNotParticipatingCount ?? 0
          }
          participationsLocked={opts.participationsLocked ?? false}
          customFieldOptions={opts.customFieldOptions}
          selectedCustomFieldIds={opts.selectedCustomFieldIds}
          onCustomFieldSelectionChange={opts.onCustomFieldSelectionChange}
          onRefresh={async () => {}}
        />
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('EditionParticipationsTab finalized lock', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows add form and exclude when not finalized', () => {
    const { getByTestId, queryByTestId, getByText } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
    });
    expect(getByText('Participations')).toBeTruthy();
    expect(getByTestId('participations-add-form')).toBeTruthy();
    expect(getByText('Participations')).toBeTruthy();
    expect(getByTestId('participations-add-form-row')).toBeTruthy();
    expect(getByTestId('participations-add-form-row').props.className).toContain(
      'flex-row'
    );
    expect(getByTestId('participations-add-form-row').props.className).toContain(
      'flex-wrap'
    );
    expect(getByTestId('participations-add-button')).toBeTruthy();
    expect(getByTestId('exclude-participation-100')).toBeTruthy();
    expect(getByTestId('participation-row-100')).toBeTruthy();
    expect(queryByTestId('participations-finalized-hint')).toBeNull();
  });

  it('shows division color square or warning when color missing', () => {
    const { getByTestId, queryByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: null,
    });
    expect(getByTestId('ed-color-9').props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#112233' })
    );
    expect(queryByTestId('ed-color-missing-9')).toBeNull();
    expect(getByTestId('ed-color-missing-10')).toBeTruthy();
    expect(queryByTestId('ed-color-10')).toBeNull();
  });

  it('disables add/exclude when edition finalized', () => {
    const { getByTestId, queryByTestId } = renderTab({
      editionFinalized: true,
      selectedDivisionId: 9,
    });
    expect(getByTestId('participations-finalized-hint')).toBeTruthy();
    expect(queryByTestId('participations-add-form')).toBeNull();
    expect(queryByTestId('participations-add-button')).toBeNull();
    expect(queryByTestId('exclude-participation-100')).toBeNull();
    expect(queryByTestId('move-up-100')).toBeNull();
  });
});

describe('EditionParticipationsTab General DnD UI', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('lists all EDs under General and has no → move chips', () => {
    const { getByTestId, queryByText, getByText } = renderTab({
      editionFinalized: false,
      selectedDivisionId: null,
    });
    expect(getByTestId('ed-section-9')).toBeTruthy();
    expect(getByTestId('ed-section-10')).toBeTruthy();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
    expect(queryByText(/→/)).toBeNull();
  });

  it('shows only the selected ED section when an ED is selected', () => {
    const { getByTestId, queryByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
    });
    expect(getByTestId('ed-section-9')).toBeTruthy();
    expect(queryByTestId('ed-section-10')).toBeNull();
  });

  it('Select player is searchable and does not request per_page 200', async () => {
    const { getByTestId, getByText } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
    });
    expect(getByTestId('participations-player-picker')).toBeTruthy();
    fireEvent.press(getByText('Select player'));
    expect(getByTestId('dropdown-search-wrapper')).toBeTruthy();
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalled());
    for (const call of mockGetPlayers.mock.calls) {
      expect(call[0].per_page).toBeLessThanOrEqual(100);
      expect(call[0].per_page).not.toBe(200);
    }
  });
});

describe('EditionParticipationsTab player history', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('renders played rank and count lines left of arrows; omits empty and Winner', () => {
    const withHistory = [
      {
        ...participations[0],
        player_history: {
          last_played: {
            division_title: 'Explorers',
            rank: 3,
            participant_count: 12,
          },
          participated_count: 2,
          banned_count: 1,
          absented_count: 0,
        },
      },
      {
        ...participations[1],
        player_history: {
          last_played: {
            division_title: 'Explorers',
            rank: null,
            participant_count: 12,
          },
          participated_count: 1,
          banned_count: 0,
          absented_count: 3,
        },
      },
    ];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { getByText, queryByText, getByTestId, getAllByTestId } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <EditionParticipationsTab
            editionId={1}
            editionFinalized={false}
            divisions={divisions as any}
            participations={withHistory as any}
            selectedDivisionId={null}
            onRefresh={async () => {}}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );

    expect(getByTestId('player-history-100').props.children).toBeTruthy();
    expect(getByTestId('history-division-title-100').props.className).toContain(
      'font-bold'
    );
    expect(getByTestId('history-division-title-100')).toHaveTextContent(
      'Explorers'
    );
    expect(getByTestId('history-times-participated-100')).toBeTruthy();
    expect(getByTestId('history-times-participated-101')).toBeTruthy();
    expect(getByTestId('history-times-banned-100')).toBeTruthy();
    expect(getByTestId('history-times-absented-101')).toBeTruthy();
    expect(getByText('2 times')).toBeTruthy();
    expect(getByText('3 times')).toBeTruthy();
    expect(queryByText(/Winner/)).toBeNull();
    expect(getAllByTestId(/player-history-/).length).toBe(2);
    expect(getByTestId('player-history-100')).toHaveTextContent(/ • /);
  });

  it('omits history lines when empty', () => {
    const emptyHistory = [
      {
        ...participations[0],
        player_history: {
          last_played: null,
          participated_count: 0,
          banned_count: 0,
          absented_count: 0,
        },
      },
    ];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { queryByTestId, getByText } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <EditionParticipationsTab
            editionId={1}
            editionFinalized={false}
            divisions={divisions as any}
            participations={emptyHistory as any}
            selectedDivisionId={9}
            onRefresh={async () => {}}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    expect(getByText('Alice')).toBeTruthy();
    expect(queryByTestId('player-history-100')).toBeNull();
  });
});

describe('EditionParticipationsTab collecting points', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ data: {} });
    mockReorder.mockResolvedValue({ data: [] });
  });

  it('shows a collecting toggle per row and marks dirty on change', () => {
    const { getByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
    });
    expect(getByTestId('collecting-points-100')).toBeTruthy();
    expect(getByTestId('chrome-is-dirty')).toHaveTextContent('no');
    fireEvent.press(getByTestId('collecting-points-100'));
    expect(getByTestId('chrome-is-dirty')).toHaveTextContent('yes');
    expect(getByTestId('chrome-can-save')).toHaveTextContent('yes');
  });

  it('saves collecting-only changes via updateParticipation', async () => {
    mockUpdate.mockResolvedValue({ data: {} });
    const { getByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
    });
    fireEvent.press(getByTestId('collecting-points-100'));
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(100, {
        edition_id: 1,
        edition_division_id: 9,
        player_id: 1,
        is_collecting_points: false,
      });
    });
    expect(mockReorder).not.toHaveBeenCalled();
  });

  it('saves order-only changes via reorderParticipations', async () => {
    mockReorder.mockResolvedValue({ data: [] });
    const twoInSameEd = [
      participations[0],
      {
        ...participations[0],
        id_participation: 102,
        player_id: 3,
        sort_order: 1,
        is_collecting_points: true,
        player: { id_player: 3, name: 'Cara' },
      },
    ];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { getByTestId } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <ChromeProbe />
          <EditionParticipationsTab
            editionId={1}
            editionFinalized={false}
            divisions={divisions as any}
            participations={twoInSameEd as any}
            selectedDivisionId={9}
            onRefresh={async () => {}}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    fireEvent.press(getByTestId('move-down-100'));
    expect(getByTestId('chrome-is-dirty')).toHaveTextContent('yes');
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockReorder).toHaveBeenCalled();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('keeps the toggle visible when finalized but press does not dirty or call APIs', async () => {
    const { getByTestId } = renderTab({
      editionFinalized: true,
      selectedDivisionId: 9,
    });
    expect(getByTestId('collecting-points-100')).toBeTruthy();
    fireEvent.press(getByTestId('collecting-points-100'));
    expect(getByTestId('chrome-is-dirty')).toHaveTextContent('no');
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockReorder).not.toHaveBeenCalled();
    });
  });
});

describe('EditionParticipationsTab summary UX', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows registered-not-participating banner on General view', () => {
    const { getByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: null,
      registeredNotParticipatingCount: 3,
    });
    expect(getByTestId('registered-not-participating-hint')).toHaveTextContent(
      '3 registered players are not participating.'
    );
  });

  it('uses singular copy for one registered non-participant', () => {
    const { getByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: null,
      registeredNotParticipatingCount: 1,
    });
    expect(getByTestId('registered-not-participating-hint')).toHaveTextContent(
      '1 registered player is not participating.'
    );
  });

  it('hides registered-not-participating banner when an ED is selected', () => {
    const { queryByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
      registeredNotParticipatingCount: 3,
    });
    expect(queryByTestId('registered-not-participating-hint')).toBeNull();
  });

  it('shows over-limit warning per ED header', () => {
    const overLimitDivision = {
      ...divisions[0],
      players_limit: 1,
    };
    const twoInSameEd = [
      participations[0],
      {
        ...participations[0],
        id_participation: 102,
        player_id: 3,
        sort_order: 1,
        player: { id_player: 3, name: 'Cara' },
      },
    ];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { getByTestId } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <EditionParticipationsTab
            editionId={1}
            editionFinalized={false}
            divisions={[overLimitDivision] as any}
            participations={twoInSameEd as any}
            selectedDivisionId={9}
            onRefresh={async () => {}}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    expect(getByTestId('ed-over-limit-9')).toHaveTextContent(
      '2 participants (limit 1).'
    );
  });

  it('renders stackable flag badges without row tint', () => {
    const flagged = [
      {
        ...participations[0],
        flags: ['duplicate', 'not_registered'],
      },
    ];
    const { getByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: flagged as any,
    });
    expect(getByTestId('participation-flag-duplicate-100')).toBeTruthy();
    expect(getByTestId('participation-flag-not_registered-100')).toBeTruthy();
    expect(getByTestId('participation-row-100').props.className).not.toContain(
      'bg-amber'
    );
  });

  it('hides exclude and shows lottery lock hint when participationsLocked', () => {
    const { getByTestId, queryByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
      participationsLocked: true,
    });
    expect(getByTestId('participations-lottery-lock-hint')).toBeTruthy();
    expect(queryByTestId('exclude-participation-100')).toBeNull();
    expect(getByTestId('move-up-100')).toBeTruthy();
  });
});

describe('EditionParticipationsTab custom fields', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows custom fields multiselect beside add form when not finalized', () => {
    const { getByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
      customFieldOptions,
    });
    const outer = getByTestId('participations-add-form-row-outer');
    const form = getByTestId('participations-add-form');
    const row = getByTestId('participations-add-form-row');
    const picker = getByTestId('participations-custom-fields-picker');
    expect(outer).toContainElement(form);
    expect(outer).toContainElement(picker);
    expect(row).not.toContainElement(picker);
    expect(picker.props.style).toEqual(
      expect.objectContaining({ minWidth: 180 })
    );
  });

  it('hides custom fields picker when not finalized and no options', () => {
    const { queryByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
    });
    expect(queryByTestId('participations-custom-fields-picker')).toBeNull();
  });

  it('shows custom fields filter row when finalized with options', () => {
    const { getByTestId, queryByTestId } = renderTab({
      editionFinalized: true,
      selectedDivisionId: 9,
      customFieldOptions,
    });
    expect(getByTestId('participations-custom-fields-filter-row')).toBeTruthy();
    expect(queryByTestId('participations-add-form')).toBeNull();
    expect(queryByTestId('participations-custom-fields-picker')).toBeNull();
  });

  it('hides custom fields filter row when finalized without options', () => {
    const { queryByTestId } = renderTab({
      editionFinalized: true,
      selectedDivisionId: 9,
    });
    expect(queryByTestId('participations-custom-fields-filter-row')).toBeNull();
  });

  it('renders custom field values with EllipsisText after player history', () => {
    const withCustomFields = [
      {
        ...participations[0],
        player_history: {
          last_played: {
            division_title: 'Explorers',
            rank: 3,
            participant_count: 12,
          },
          participated_count: 2,
          banned_count: 0,
          absented_count: 0,
        },
        custom_field_values: [
          {
            field_id: 10,
            label: 'Shirt size',
            value: 'Very long custom field value text',
          },
        ],
      },
    ];
    const originalOs = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    try {
      const { getByTestId, getByText, queryByText } = renderTab({
        editionFinalized: false,
        selectedDivisionId: 9,
        participationsOverride: withCustomFields as any,
      });
      expect(getByTestId('player-history-100')).toBeTruthy();
      expect(queryByText('Shirt size:')).toBeNull();
      expect(getByTestId('custom-field-value-100-10-tooltip')).toBeTruthy();
      const valueNode = getByText('Very long custom field value text');
      expect(valueNode.props.numberOfLines).toBe(1);
      expect(valueNode.props.className).toContain('truncate');
      expect(valueNode.props.title).toBeUndefined();
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
    }
  });

  it('reflects selectedCustomFieldIds and calls onCustomFieldSelectionChange from add form', () => {
    const onChange = jest.fn();
    const { getByText } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
      customFieldOptions,
      selectedCustomFieldIds: [10],
      onCustomFieldSelectionChange: onChange,
    });
    expect(getByText('Shirt size')).toBeTruthy();
    fireEvent.press(getByText('Shirt size'));
    fireEvent.press(getByText('Club'));
    fireEvent.press(getByText('Apply'));
    expect(onChange).toHaveBeenCalledWith([10, 11]);
  });

  it('reflects selectedCustomFieldIds and calls onCustomFieldSelectionChange when finalized', () => {
    const onChange = jest.fn();
    const { getByText } = renderTab({
      editionFinalized: true,
      selectedDivisionId: 9,
      customFieldOptions,
      selectedCustomFieldIds: [11],
      onCustomFieldSelectionChange: onChange,
    });
    expect(getByText('Club')).toBeTruthy();
    fireEvent.press(getByText('Club'));
    fireEvent.press(getByText('Shirt size'));
    fireEvent.press(getByText('Apply'));
    expect(onChange).toHaveBeenCalledWith([11, 10]);
  });
});
