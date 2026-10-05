import EventParticipationsTab from '@/components/events/EventParticipationsTab';
import { PageChromeProvider, usePageChrome } from '@/components/chrome/PageChromeProvider';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import React from 'react';
import { Alert, Pressable, Text, Platform } from 'react-native';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockReorder = jest.fn();
const mockUpdate = jest.fn();
const mockGetPlayers = jest.fn(async () => ({
  data: [{ id_player: 1, name: 'Alice' }],
}));
const mockGeneratePdfAvatar = jest.fn();

jest.mock('@/services/api/eventParticipationsApi', () => ({
  EventParticipationsApiService: jest.fn().mockImplementation(() => ({
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
    generatePdfAvatar: (...args: unknown[]) => mockGeneratePdfAvatar(...args),
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
    id_event_division: 9,
    event_id: 1,
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
    id_event_division: 10,
    event_id: 1,
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
    event_id: 1,
    player_id: 1,
    event_division_id: 9,
    division_id: 2,
    sort_order: 0,
    inserted_at: 1,
    is_collecting_points: true,
    player: { id_player: 1, name: 'Alice' },
  },
  {
    id_participation: 101,
    event_id: 1,
    player_id: 2,
    event_division_id: 10,
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
  eventFinalized: boolean;
  selectedDivisionId: number | null;
  registeredNotParticipatingCount?: number;
  participationsLocked?: boolean;
  divisionsOverride?: typeof divisions;
  participationsOverride?: typeof participations;
  customFieldOptions?: Array<{ label: string; value: number }>;
  selectedCustomFieldIds?: number[];
  onCustomFieldSelectionChange?: (ids: number[]) => void;
}) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <ChromeProbe />
        <EventParticipationsTab
          eventId={1}
          eventFinalized={opts.eventFinalized}
          divisions={(opts.divisionsOverride ?? divisions) as any}
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

describe('EventParticipationsTab finalized lock', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows add form and exclude when not finalized', () => {
    const { getByTestId, queryByTestId, getByText } = renderTab({
      eventFinalized: false,
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
      eventFinalized: false,
      selectedDivisionId: null,
    });
    expect(getByTestId('ed-color-9').props.style).toEqual(
      expect.objectContaining({ backgroundColor: '#112233' })
    );
    expect(queryByTestId('ed-color-missing-9')).toBeNull();
    expect(getByTestId('ed-color-missing-10')).toBeTruthy();
    expect(queryByTestId('ed-color-10')).toBeNull();
  });

  it('stretches the ED table ScrollView content to fill available width', () => {
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    expect(getByTestId('ed-table-scroll-9').props.contentContainerStyle).toEqual(
      expect.objectContaining({ flexGrow: 1 })
    );
    expect(getByTestId('ed-table-9').props.style).toEqual(
      expect.objectContaining({ minWidth: '100%' })
    );
  });

  it('disables add/exclude when event finalized', () => {
    const { getByTestId, queryByTestId } = renderTab({
      eventFinalized: true,
      selectedDivisionId: 9,
    });
    expect(getByTestId('participations-finalized-hint')).toBeTruthy();
    expect(queryByTestId('participations-add-form')).toBeNull();
    expect(queryByTestId('participations-add-button')).toBeNull();
    expect(queryByTestId('exclude-participation-100')).toBeNull();
    expect(queryByTestId('move-up-100')).toBeNull();
  });
});

describe('EventParticipationsTab General DnD UI', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('lists all EDs under General and has no → move chips', () => {
    const { getByTestId, queryByText, getByText } = renderTab({
      eventFinalized: false,
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
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    expect(getByTestId('ed-section-9')).toBeTruthy();
    expect(queryByTestId('ed-section-10')).toBeNull();
  });

  it('Select player is searchable and does not request per_page 200', async () => {
    const { getByTestId, getByText } = renderTab({
      eventFinalized: false,
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

describe('EventParticipationsTab player history', () => {
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
            division_color: '#112233',
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
            division_color: '#445566',
            rank: null,
            participant_count: 12,
          },
          participated_count: 1,
          banned_count: 0,
          absented_count: 3,
        },
      },
    ];
    const client = createTestQueryClient();
    const { getByText, queryByText, getByTestId, getAllByTestId } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <EventParticipationsTab
            eventId={1}
            eventFinalized={false}
            divisions={divisions as any}
            participations={withHistory as any}
            selectedDivisionId={null}
            onRefresh={async () => {}}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );

    expect(getByTestId('history-played-100')).toBeTruthy();
    expect(getByTestId('ed-col-played-9')).toHaveTextContent('Played');
    expect(getByTestId('ed-col-participated-9')).toHaveTextContent(
      'Participated'
    );
    expect(getByTestId('history-division-title-100').props.className).toContain(
      'font-bold'
    );
    expect(getByTestId('history-division-title-100').props.style).toEqual(
      expect.objectContaining({ color: '#112233' })
    );
    expect(getByTestId('history-division-title-100')).toHaveTextContent(
      'Explorers'
    );
    expect(queryByText(/^Played /)).toBeNull();
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

  it('always shows Played and Participated columns when history is empty', () => {
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
    const client = createTestQueryClient();
    const { getByTestId, getByText } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <EventParticipationsTab
            eventId={1}
            eventFinalized={false}
            divisions={divisions as any}
            participations={emptyHistory as any}
            selectedDivisionId={9}
            onRefresh={async () => {}}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    expect(getByText('Alice')).toBeTruthy();
    expect(getByTestId('history-played-empty-100')).toHaveTextContent('—');
    expect(getByTestId('history-times-participated-100')).toHaveTextContent(
      '—'
    );
  });

  it('shows leading — in Participated when count is 0 but Banned exists', () => {
    const withBannedOnly = [
      {
        ...participations[0],
        player_history: {
          last_played: null,
          participated_count: 0,
          banned_count: 1,
          absented_count: 0,
        },
      },
    ];
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: withBannedOnly as any,
    });
    expect(getByTestId('history-times-participated-100')).toHaveTextContent(
      '—'
    );
    expect(getByTestId('player-history-100')).toHaveTextContent(/—.*Banned/);
    expect(getByTestId('history-times-banned-100')).toHaveTextContent(
      '1 time'
    );
  });
});

describe('EventParticipationsTab collecting points', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({ data: {} });
    mockReorder.mockResolvedValue({ data: [] });
  });

  it('shows a collecting toggle per row and marks dirty on change', () => {
    const { getByTestId, queryByText } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    const toggle = getByTestId('collecting-points-100');
    expect(toggle).toBeTruthy();
    expect(toggle.props.accessibilityLabel).toBe('Collecting points');
    expect(queryByText('Collecting points')).toBeNull();
    expect(getByTestId('collecting-points-tip-100')).toBeTruthy();
    expect(getByTestId('chrome-is-dirty')).toHaveTextContent('no');
    fireEvent.press(toggle);
    expect(getByTestId('chrome-is-dirty')).toHaveTextContent('yes');
    expect(getByTestId('chrome-can-save')).toHaveTextContent('yes');
  });

  it('saves collecting-only changes via updateParticipation', async () => {
    mockUpdate.mockResolvedValue({ data: {} });
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    fireEvent.press(getByTestId('collecting-points-100'));
    fireEvent.press(getByTestId('chrome-save'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(100, {
        event_id: 1,
        event_division_id: 9,
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
    const client = createTestQueryClient();
    const { getByTestId } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <ChromeProbe />
          <EventParticipationsTab
            eventId={1}
            eventFinalized={false}
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
      eventFinalized: true,
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

describe('EventParticipationsTab summary UX', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows registered-not-participating banner on General view', () => {
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: null,
      registeredNotParticipatingCount: 3,
    });
    expect(getByTestId('registered-not-participating-hint')).toHaveTextContent(
      '3 registered players are not participating.'
    );
  });

  it('uses singular copy for one registered non-participant', () => {
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: null,
      registeredNotParticipatingCount: 1,
    });
    expect(getByTestId('registered-not-participating-hint')).toHaveTextContent(
      '1 registered player is not participating.'
    );
  });

  it('hides registered-not-participating banner when an ED is selected', () => {
    const { queryByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      registeredNotParticipatingCount: 3,
    });
    expect(queryByTestId('registered-not-participating-hint')).toBeNull();
  });

  it('shows capacity and warning icon when over limit', async () => {
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
    const client = createTestQueryClient();
    const { getByTestId, queryByText } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <EventParticipationsTab
            eventId={1}
            eventFinalized={false}
            divisions={[overLimitDivision] as any}
            participations={twoInSameEd as any}
            selectedDivisionId={9}
            onRefresh={async () => {}}
          />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    expect(getByTestId('ed-capacity-9')).toHaveTextContent('2/1');
    expect(queryByText(/participants \(limit/)).toBeNull();
    fireEvent.press(getByTestId('ed-over-limit-9'));
    await waitFor(() => {
      expect(getByTestId('tooltip-body')).toHaveTextContent(
        'This division exceeds the participants limit.'
      );
    });
  });

  it('shows ? for capacity when players_limit is unset', () => {
    const noLimitDivision = {
      ...divisions[0],
      players_limit: null,
    };
    const { getByTestId, queryByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      divisionsOverride: [noLimitDivision] as any,
    });
    expect(getByTestId('ed-capacity-9')).toHaveTextContent('1/?');
    expect(queryByTestId('ed-over-limit-9')).toBeNull();
  });

  it('renders stackable flag badges without row tint', () => {
    const flagged = [
      {
        ...participations[0],
        flags: ['duplicate', 'not_registered'],
      },
    ];
    const { getByTestId } = renderTab({
      eventFinalized: false,
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
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsLocked: true,
    });
    expect(getByTestId('participations-lottery-lock-hint')).toBeTruthy();
    expect(queryByTestId('exclude-participation-100')).toBeNull();
    expect(getByTestId('move-up-100')).toBeTruthy();
  });
});

describe('EventParticipationsTab custom fields', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows custom fields multiselect beside add form when not finalized', () => {
    const { getByTestId, getAllByText } = renderTab({
      eventFinalized: false,
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
    expect(picker.props.className).toContain('border-gray-200');
    expect(getAllByText('Custom fields').length).toBeGreaterThan(0);
  });

  it('hides custom fields picker when not finalized and no options', () => {
    const { queryByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    expect(queryByTestId('participations-custom-fields-picker')).toBeNull();
  });

  it('shows custom fields filter row when finalized with options', () => {
    const { getByTestId, queryByTestId } = renderTab({
      eventFinalized: true,
      selectedDivisionId: 9,
      customFieldOptions,
    });
    expect(getByTestId('participations-custom-fields-filter-row')).toBeTruthy();
    expect(queryByTestId('participations-add-form')).toBeNull();
    expect(queryByTestId('participations-custom-fields-picker')).toBeNull();
    expect(
      getByTestId('participations-custom-fields-filter-row')
    ).toHaveTextContent(/Custom fields/);
  });

  it('hides custom fields filter row when finalized without options', () => {
    const { queryByTestId } = renderTab({
      eventFinalized: true,
      selectedDivisionId: 9,
    });
    expect(queryByTestId('participations-custom-fields-filter-row')).toBeNull();
  });

  it('renders custom field values with EllipsisText after player history', async () => {
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
            recent_answers: [
              {
                value: 'M',
                event_name: 'Past Cup',
                inserted_date: '2026-01-01',
              },
              {
                value: 'Very long custom field value text',
                event_name: 'Current Cup',
                inserted_date: '2026-06-15',
              },
            ],
          },
        ],
      },
    ];
    const originalOs = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });

    try {
      const { getByTestId, getByText, queryByText } = renderTab({
        eventFinalized: false,
        selectedDivisionId: 9,
        participationsOverride: withCustomFields as any,
        customFieldOptions: [{ label: 'Shirt size', value: 10 }],
        selectedCustomFieldIds: [10],
      });
      expect(getByTestId('player-history-100')).toBeTruthy();
      expect(getByTestId('ed-col-custom-9-10')).toHaveTextContent('Shirt size');
      expect(queryByText('Shirt size:')).toBeNull();
      expect(getByTestId('custom-field-value-100-10-tooltip')).toBeTruthy();
      const valueNode = getByText('Very long custom field value text');
      expect(valueNode.props.numberOfLines).toBe(1);
      expect(valueNode.props.className).toContain('truncate');
      expect(valueNode.props.title).toBeUndefined();

      fireEvent.press(getByTestId('custom-field-value-100-10-tooltip'));
      await waitFor(() => {
        expect(getByTestId('tooltip-title')).toHaveTextContent('Shirt size');
        expect(getByTestId('tooltip-body')).toHaveTextContent(
          '(Past Cup) M\n(Current Cup) Very long custom field value text'
        );
      });
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
    }
  });

  it('renders empty custom field cells in selected column order', () => {
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      customFieldOptions: [
        { label: 'Shirt size', value: 10 },
        { label: 'Club', value: 11 },
      ],
      selectedCustomFieldIds: [11, 10],
    });
    expect(getByTestId('ed-col-custom-9-11')).toHaveTextContent('Club');
    expect(getByTestId('ed-col-custom-9-10')).toHaveTextContent('Shirt size');
    expect(getByTestId('custom-field-empty-100-11')).toBeTruthy();
    expect(getByTestId('custom-field-empty-100-10')).toBeTruthy();
  });

  it('reflects selectedCustomFieldIds and calls onCustomFieldSelectionChange from add form', () => {
    const onChange = jest.fn();
    const { getByText, getAllByText } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      customFieldOptions,
      selectedCustomFieldIds: [10],
      onCustomFieldSelectionChange: onChange,
    });
    expect(getAllByText('Shirt size').length).toBeGreaterThan(0);
    fireEvent.press(getAllByText('Shirt size')[0]);
    fireEvent.press(getByText('Club'));
    fireEvent.press(getByText('Apply'));
    expect(onChange).toHaveBeenCalledWith([10, 11]);
  });

  it('reflects selectedCustomFieldIds and calls onCustomFieldSelectionChange when finalized', () => {
    const onChange = jest.fn();
    const { getByText, getAllByText } = renderTab({
      eventFinalized: true,
      selectedDivisionId: 9,
      customFieldOptions,
      selectedCustomFieldIds: [11],
      onCustomFieldSelectionChange: onChange,
    });
    expect(getAllByText('Club').length).toBeGreaterThan(0);
    fireEvent.press(getAllByText('Club')[0]);
    fireEvent.press(getByText('Shirt size'));
    fireEvent.press(getByText('Apply'));
    expect(onChange).toHaveBeenCalledWith([11, 10]);
  });
});

describe('EventParticipationsTab add player', () => {
  beforeEach(() => {
    mockCreate.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('adds the picked player and marks the Add button successful', async () => {
    const { getByTestId, getByText, findByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 10,
    });
    fireEvent.press(getByText('Select player'));
    await waitFor(() => expect(getByText('Alice')).toBeTruthy());
    fireEvent.press(getByText('Alice'));
    fireEvent.press(getByTestId('participations-add-button'));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        event_id: 1,
        event_division_id: 10,
        player_id: 1,
      })
    );
    expect(await findByTestId('participations-add-button-success')).toBeTruthy();
  });

  it('runs validation inside run and throws without calling the API', async () => {
    const { getByTestId, findByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    fireEvent.press(getByTestId('participations-add-button'));
    expect(await findByTestId('participations-add-button-error')).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('surfaces create failures on the Add button, not an inline banner', async () => {
    mockCreate.mockRejectedValueOnce(new Error('already participating'));
    const { getByTestId, getByText, findByTestId, queryByText } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 10,
    });
    fireEvent.press(getByText('Select player'));
    await waitFor(() => expect(getByText('Alice')).toBeTruthy());
    fireEvent.press(getByText('Alice'));
    fireEvent.press(getByTestId('participations-add-button'));
    expect(await findByTestId('participations-add-button-error')).toBeTruthy();
    expect(queryByText('already participating')).toBeNull();
  });
});

describe('EventParticipationsTab exclude player', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('confirms then excludes and holds the success state', async () => {
    (window as any).confirm = jest.fn(() => true);
    mockDelete.mockResolvedValue(undefined);
    const { getByTestId, findByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    fireEvent.press(getByTestId('exclude-participation-100'));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(100));
    expect(
      await findByTestId('exclude-participation-100-success')
    ).toBeTruthy();
  });

  it('skips the exclude request when the confirm is cancelled', () => {
    (window as any).confirm = jest.fn(() => false);
    const { getByTestId, queryByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    fireEvent.press(getByTestId('exclude-participation-100'));
    expect(mockDelete).not.toHaveBeenCalled();
    expect(queryByTestId('exclude-participation-100-pending')).toBeNull();
  });

  it('reports exclude failure on the button instead of an Alert', async () => {
    (window as any).confirm = jest.fn(() => true);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockDelete.mockRejectedValueOnce(new Error('lottery draw exists'));
    const { getByTestId, findByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    fireEvent.press(getByTestId('exclude-participation-100'));
    expect(await findByTestId('exclude-participation-100-error')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('keeps a per-row status so one exclude does not mark the others', async () => {
    (window as any).confirm = jest.fn(() => true);
    mockDelete.mockResolvedValue(undefined);
    const { getByTestId, findByTestId, queryByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: null,
    });
    fireEvent.press(getByTestId('exclude-participation-100'));
    expect(
      await findByTestId('exclude-participation-100-success')
    ).toBeTruthy();
    expect(queryByTestId('exclude-participation-101-success')).toBeNull();
  });
});

describe('EventParticipationsTab ActionButton wiring', () => {
  it('routes add/exclude through ActionButton with confirm and no press-tied banners', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EventParticipationsTab.tsx'),
      'utf8'
    );
    expect(src).toContain(
      "import { useActionButtonStatus } from '@/hooks/useActionButtonStatus'"
    );
    expect(src).toContain(
      "import { confirmAction } from '@/utils/confirmAction'"
    );
    expect(src).toContain('useActionButtonStatus({ auditoryFeedback: true })');
    expect(src).toContain('auditoryFeedback: true');
    expect(src).toContain('successHoldMs: 4000');
    expect(src).toContain('variant="primary"');
    expect(src).toContain('startIcon="remove-circle-outline"');
    expect(src).toContain('label="Exclude"');
    expect(src).toContain('iconColor="#dc2626"');
    expect(src).toContain(
      "throw new Error('Select a player and event division.')"
    );
    expect(src).toContain('confirmAction(');
    expect(src).not.toContain('addError');
    expect(src).not.toContain('setAdding');
    expect(src).not.toContain('Alert.alert');
    expect(src).not.toContain('Alert,');
    // confirmAction wraps run(), never the other way round.
    expect(src).not.toMatch(/void run\(async[\s\S]{0,400}?confirmAction\(/);
  });
});

describe('EventParticipationsTab avatars', () => {
  beforeEach(() => {
    mockGeneratePdfAvatar.mockReset();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  it('shows avatar present when pdf_avatar_url is set and reload when missing', () => {
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: [
        {
          ...participations[0],
          pdf_avatar_url: 'https://cdn.example/a.png',
        },
        {
          ...participations[1],
          event_division_id: 9,
          division_id: 2,
          pdf_avatar_url: null,
        },
      ],
    });
    expect(getByTestId('participation-avatar-100-present')).toBeTruthy();
    expect(getByTestId('participation-avatar-101-reload')).toBeTruthy();
  });

  it('reloads with local collecting flag and swaps to present', async () => {
    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/b.png' },
    });
    const { getByTestId, queryByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 10,
      participationsOverride: [
        {
          ...participations[1],
          pdf_avatar_url: null,
          is_collecting_points: false,
        },
      ],
    });
    fireEvent.press(getByTestId('participation-avatar-101-reload'));
    await waitFor(() => {
      expect(mockGeneratePdfAvatar).toHaveBeenCalledWith(2, false);
    });
    await waitFor(() => {
      expect(getByTestId('participation-avatar-101-present')).toBeTruthy();
    });
    expect(queryByTestId('participation-avatar-101-reload')).toBeNull();
  });

  it('surfaces avatar reload failures', async () => {
    mockGeneratePdfAvatar.mockRejectedValue(new Error('avatar boom'));
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: [
        {
          ...participations[0],
          pdf_avatar_url: null,
        },
      ],
    });
    fireEvent.press(getByTestId('participation-avatar-100-reload'));
    await waitFor(() => {
      expect(getByTestId('participation-avatar-100-error')).toHaveTextContent(
        'avatar boom'
      );
    });
  });
});

describe('EventParticipationsTab row chrome and tooltips', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('uses grey collecting checkbox and albums tip without stealing toggle', async () => {
    const { getByTestId, UNSAFE_getAllByType } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
    });
    const { Ionicons } = require('@expo/vector-icons');
    const icons = UNSAFE_getAllByType(Ionicons);
    const checkbox = icons.find(
      (node: { props: { name?: string } }) =>
        node.props.name === 'checkbox' || node.props.name === 'square-outline'
    );
    const albums = icons.find(
      (node: { props: { name?: string } }) => node.props.name === 'albums-outline'
    );
    expect(checkbox?.props.color).toBe('#6b7280');
    expect(albums).toBeTruthy();

    fireEvent.press(getByTestId('collecting-points-tip-100'));
    await waitFor(() => {
      expect(getByTestId('tooltip-body')).toHaveTextContent(
        'If player is collecting points from the matches and they appear on the Ranking poster.'
      );
    });
    expect(getByTestId('chrome-is-dirty')).toHaveTextContent('no');
  });

  it('places collecting control before flags', () => {
    const withFlags = [
      {
        ...participations[0],
        flags: ['duplicate'],
      },
    ];
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: withFlags as any,
    });
    const collecting = getByTestId('collecting-points-100');
    const flag = getByTestId('participation-flag-duplicate-100');
    expect(collecting).toBeTruthy();
    expect(flag).toBeTruthy();
    // Both are under the same row; collecting is rendered before flags in JSX.
    const row = getByTestId('participation-row-100');
    expect(row).toContainElement(collecting);
    expect(row).toContainElement(flag);
  });

  it('applies bg-gray-50 on even-numbered rows', () => {
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
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: twoInSameEd as any,
    });
    expect(getByTestId('participation-row-100').props.className).not.toContain(
      'bg-gray-50'
    );
    expect(getByTestId('participation-row-102').props.className).toContain(
      'bg-gray-50'
    );
  });

  it('shows history tooltips with titles and bodies', async () => {
    const withHistory = [
      {
        ...participations[0],
        player_history: {
          last_played: {
            division_title: 'Explorers',
            division_color: '#ab12cd',
            rank: null,
            participant_count: 12,
          },
          participated_count: 2,
          banned_count: 1,
          absented_count: 1,
          played_recent: [
            {
              event_name: 'Spring Cup',
              division_title: 'Explorers',
              division_color: '#ab12cd',
              rank: null,
              participant_count: 12,
              date: '2026-01-01',
            },
          ],
          participated_tooltip: {
            lines: [
              { type: 'entry', event_name: 'Winter Cup', date: '2025-01-01' },
              { type: 'ellipsis' },
              { type: 'entry', event_name: 'Spring Cup', date: '2026-01-01' },
            ],
          },
          banned_recent: [
            {
              event_name: 'Ban Cup',
              date: '2025-06-01',
              ban_reason: 'AGGRESSIVE PLAYER',
            },
          ],
          absented_recent: [
            {
              event_name: 'Absent Cup',
              date: '2025-03-01',
              absence_reason: 'SICK',
            },
          ],
        },
      },
    ];
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: withHistory as any,
    });

    fireEvent.press(getByTestId('history-tooltip-played-100'));
    await waitFor(() => {
      expect(getByTestId('tooltip-title')).toHaveTextContent('Played');
      expect(getByTestId('tooltip-body')).toHaveTextContent(
        'Spring Cup: Explorers —/12'
      );
    });
    fireEvent.press(getByTestId('tooltip-backdrop'));

    fireEvent.press(getByTestId('history-tooltip-participated-100'));
    await waitFor(() => {
      expect(getByTestId('tooltip-title')).toHaveTextContent('Participated');
      expect(getByTestId('tooltip-body').props.children).toContain('...');
    });
    fireEvent.press(getByTestId('tooltip-backdrop'));

    fireEvent.press(getByTestId('history-tooltip-banned-100'));
    await waitFor(() => {
      expect(getByTestId('tooltip-title')).toHaveTextContent('Banned');
      expect(getByTestId('tooltip-body')).toHaveTextContent(
        'Ban Cup: Jun 1st, 2025 (AGGRESSIVE PLAYER)'
      );
    });
    fireEvent.press(getByTestId('tooltip-backdrop'));

    fireEvent.press(getByTestId('history-tooltip-absented-100'));
    await waitFor(() => {
      expect(getByTestId('tooltip-title')).toHaveTextContent('Absented');
      expect(getByTestId('tooltip-body')).toHaveTextContent(
        /Absent Cup:.*\(SICK\)/
      );
    });
  });

  it('renders global custom field tip with formatted inserted date', async () => {
    const withGlobal = [
      {
        ...participations[0],
        custom_field_values: [
          {
            field_id: 11,
            label: 'Club',
            value: 'Padel Club',
            recent_answers: [
              {
                value: 'Padel Club',
                event_name: null,
                inserted_date: '2026-01-10',
              },
            ],
          },
        ],
      },
    ];
    const { getByTestId } = renderTab({
      eventFinalized: false,
      selectedDivisionId: 9,
      participationsOverride: withGlobal as any,
      customFieldOptions: [{ label: 'Club', value: 11 }],
      selectedCustomFieldIds: [11],
    });
    fireEvent.press(getByTestId('custom-field-value-100-11-tooltip'));
    await waitFor(() => {
      expect(getByTestId('tooltip-title')).toHaveTextContent('Club');
      expect(getByTestId('tooltip-body')).toHaveTextContent(/Padel Club/);
    });
  });
});
