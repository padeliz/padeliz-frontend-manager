import EditionDivisionsTab from '@/components/editions/EditionDivisionsTab';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';

const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockReorder = jest.fn();
const mockGetPlayers = jest.fn(async () => ({
  data: [{ id_player: 1, name: 'Alice' }],
}));

jest.mock('@/services/api/editionParticipationsApi', () => ({
  EditionParticipationsApiService: jest.fn().mockImplementation(() => ({
    createParticipation: (...args: unknown[]) => mockCreate(...args),
    deleteParticipation: (...args: unknown[]) => mockDelete(...args),
    reorderParticipations: (...args: unknown[]) => mockReorder(...args),
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
    is_minor: false,
    is_student: false,
    payment: 0,
    inserted_at: 1,
    player: { id_player: 1, name: 'Alice' },
  },
  {
    id_participation: 101,
    edition_id: 1,
    player_id: 2,
    edition_division_id: 10,
    division_id: 3,
    sort_order: 0,
    is_minor: false,
    is_student: false,
    payment: 0,
    inserted_at: 1,
    player: { id_player: 2, name: 'Bob' },
  },
];

function renderTab(opts: {
  editionFinalized: boolean;
  selectedDivisionId: number | null;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <EditionDivisionsTab
          editionId={1}
          editionFinalized={opts.editionFinalized}
          divisions={divisions as any}
          participations={participations as any}
          selectedDivisionId={opts.selectedDivisionId}
          onRefresh={async () => {}}
        />
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('EditionDivisionsTab finalized lock', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows add form and delete when not finalized', () => {
    const { getByTestId, queryByTestId } = renderTab({
      editionFinalized: false,
      selectedDivisionId: 9,
    });
    expect(getByTestId('divisions-add-form')).toBeTruthy();
    expect(getByTestId('divisions-add-form-row')).toBeTruthy();
    expect(getByTestId('divisions-add-form-row').props.className).toContain(
      'flex-row'
    );
    expect(getByTestId('divisions-add-form-row').props.className).toContain(
      'flex-wrap'
    );
    expect(getByTestId('divisions-add-button')).toBeTruthy();
    expect(getByTestId('delete-participation-100')).toBeTruthy();
    expect(getByTestId('participation-row-100')).toBeTruthy();
    expect(queryByTestId('divisions-finalized-hint')).toBeNull();
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

  it('disables add/delete when edition finalized', () => {
    const { getByTestId, queryByTestId } = renderTab({
      editionFinalized: true,
      selectedDivisionId: 9,
    });
    expect(getByTestId('divisions-finalized-hint')).toBeTruthy();
    expect(queryByTestId('divisions-add-form')).toBeNull();
    expect(queryByTestId('divisions-add-button')).toBeNull();
    expect(queryByTestId('delete-participation-100')).toBeNull();
    expect(queryByTestId('move-up-100')).toBeNull();
  });
});

describe('EditionDivisionsTab General DnD UI', () => {
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
    expect(getByTestId('divisions-player-picker')).toBeTruthy();
    fireEvent.press(getByText('Select player'));
    expect(getByTestId('dropdown-search')).toBeTruthy();
    await waitFor(() => expect(mockGetPlayers).toHaveBeenCalled());
    for (const call of mockGetPlayers.mock.calls) {
      expect(call[0].per_page).toBeLessThanOrEqual(100);
      expect(call[0].per_page).not.toBe(200);
    }
  });
});

describe('EditionDivisionsTab player history', () => {
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
          <EditionDivisionsTab
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
          <EditionDivisionsTab
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
