import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
    useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  })
);

jest.mock('@/components/layout/AppLayout', () => {
  const { View } = require('react-native');
  return ({ children, headerActions }: any) => (
    <View>
      {headerActions}
      {children}
    </View>
  );
});

jest.mock('@/components/layout/AppContentScroll', () => {
  const { View } = require('react-native');
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock('@/components/layout/BreadcrumbProvider', () => ({
  useBreadcrumbSegments: jest.fn(),
}));

jest.mock('@/components/ui/ActionButton', () => {
  const { Pressable, Text } = require('react-native');
  return ({ label, onPress, testID, status, startIcon, disabled }: any) => (
    <Pressable
      testID={testID}
      onPress={disabled ? undefined : onPress}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Text>{label}</Text>
      {testID ? (
        <>
          <Text testID={`${testID}-status`}>{status ?? 'idle'}</Text>
          <Text testID={`${testID}-start-icon`}>{startIcon ?? 'none'}</Text>
          <Text testID={`${testID}-disabled`}>{disabled ? '1' : '0'}</Text>
        </>
      ) : null}
    </Pressable>
  );
});

jest.mock('@/components/ui/AdvancedDataTable', () => {
  const { Text } = require('react-native');
  return ({ emptyMessage }: any) => <Text>{emptyMessage || 'table'}</Text>;
});

jest.mock('@/components/ui/SingleSelectDropdown', () => {
  const { Pressable, Text, View } = require('react-native');
  return ({
    options,
    selectedValue,
    onSelectionChange,
    title,
    testID,
  }: any) => (
    <View testID={testID || `dropdown-${title}`}>
      <Text testID={`dropdown-selected-${title}`}>{String(selectedValue)}</Text>
      {options?.map((o: any) => (
        <Pressable
          key={String(o.value)}
          testID={`dropdown-option-${title}-${o.value}`}
          onPress={() => onSelectionChange?.(o.value)}
        >
          <Text>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
});

jest.mock('@/components/ui/Tooltip', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  return ({ content, testID, children }: any) => {
    const [open, setOpen] = React.useState(false);
    return (
      <View>
        <Pressable testID={testID} onPress={() => setOpen(v => !v)}>
          {children}
        </Pressable>
        {open ? <Text testID="tooltip-body">{content}</Text> : null}
      </View>
    );
  };
});

jest.mock('@/components/events/SortableRow', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  const SortableRow = ({
    children,
    index,
    onReorder,
    testID,
  }: {
    children: React.ReactNode;
    index: number;
    onReorder?: (from: number, to: number) => void;
    testID?: string;
  }) => (
    <View testID={testID}>
      {children}
      <Pressable
        testID={testID ? `${testID}-mock-reorder` : undefined}
        onPress={() => onReorder?.(index, index === 0 ? 1 : 0)}
      >
        <Text>reorder</Text>
      </Pressable>
    </View>
  );
  const SortableDragHandle = ({ testID }: { testID?: string }) => (
    <View testID={testID} />
  );
  const reorderList = <T,>(list: T[], from: number, to: number) => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };
  return {
    __esModule: true,
    default: SortableRow,
    SortableDragHandle,
    SortableArrows: () => null,
    reorderList,
    SORTABLE_ROW_HEIGHT: 44,
  };
});

jest.mock('@/components/events/CachedPdfImageReload', () => {
  const { Text, View } = require('react-native');
  return ({ testIdPrefix, imageUrl }: any) =>
    imageUrl ? (
      <View testID={`${testIdPrefix}-present`}>
        <Text>{imageUrl}</Text>
      </View>
    ) : (
      <View testID={`${testIdPrefix}-reload`} />
    );
});

jest.mock('@/hooks/useCachedPdfAvatarReload', () => ({
  useCachedPdfAvatarReload: () => ({
    spinning: {},
    errors: {},
    urlFor: (_key: number, baseUrl: string | null) => baseUrl,
    reload: jest.fn(),
  }),
}));

const mockCatalog = jest.fn(async () => ({
  data: {
    versions: [4],
    combos: [{ players: 8, partners: 3, repeat: 1, courts: 2 }],
  },
}));
const mockMetrics = jest.fn(async () => ({
  data: { total: 12, summary: 'ok' },
}));
const mockPreview = jest.fn(async () => ({
  data: {
    matches_count: 1,
    template_file: 'players-8-partners-3-repeat-1-courts-2.json',
    template_version: 4,
    average_playing_time_minutes: 45.0,
    points_per_match: 15,
    points_per_match_print: 16,
    matches_by_court: [
      [{ side_a: [1, 2], side_b: [3, 4], court_name: 'Court 1' }],
    ],
  },
}));
const mockGetDivisions = jest.fn(async () => ({
  data: [
    { id_division: 1, name: 'Rookies', color: '#FACC15' },
    { id_division: 2, name: 'Kids', color: '#22C55E' },
  ],
}));

const mockDemo = jest.fn(async (..._args: unknown[]) => ({
  data: { players: 8, matches_count: 12 },
}));
const mockDownloadMatchesPdf = jest.fn(
  async (..._args: unknown[]) => undefined
);
const mockDownloadRankingPdf = jest.fn(
  async (..._args: unknown[]) => undefined
);

jest.mock('@/services/api/templatesToolsApi', () => ({
  templatesToolsApi: {
    catalog: (...args: unknown[]) => mockCatalog(...args),
    metrics: (...args: unknown[]) => mockMetrics(...args),
    demo: (...args: unknown[]) => mockDemo(...args),
  },
}));

jest.mock('@/services/api/scratchScheduleApi', () => ({
  scratchScheduleApi: {
    preview: (...args: unknown[]) => mockPreview(...args),
    downloadMatchesPdf: (...args: unknown[]) => mockDownloadMatchesPdf(...args),
    downloadRankingPdf: (...args: unknown[]) => mockDownloadRankingPdf(...args),
  },
}));

jest.mock('@/services/api/divisionsApi', () => ({
  DivisionsApiService: jest.fn().mockImplementation(() => ({
    getDivisions: (...args: unknown[]) => mockGetDivisions(...args),
  })),
}));

jest.mock('@/hooks/usePlayerPicker', () => ({
  usePlayerPicker: () => ({
    options: [
      {
        label: 'Casey',
        value: 101,
        imageUrl: 'https://cdn.example/casey.png',
      },
      { label: 'Dana', value: 102, imageUrl: null },
    ],
    onSearch: jest.fn(),
    loading: false,
  }),
  playerToDropdownOption: (p: any) => ({
    label: p.name,
    value: p.id_player,
  }),
}));

const mockGetOrganizers = jest.fn(async () => ({
  data: [
    { id_organizer: 1, name: 'ARSH Padel MiniTour' },
    { id_organizer: 2, name: 'Second Org' },
  ],
}));
const mockGetClubs = jest.fn(async () => ({
  data: [
    { id_club: 4, name: 'Padel Club Host' },
    { id_club: 5, name: 'Other Club' },
  ],
}));

jest.mock('@/services/api/organizersApi', () => ({
  organizersApi: {
    getOrganizers: (...args: unknown[]) => mockGetOrganizers(...args),
  },
}));

jest.mock('@/services/api/clubsApi', () => ({
  ClubsApiService: jest.fn().mockImplementation(() => ({
    getClubs: (...args: unknown[]) => mockGetClubs(...args),
  })),
}));

import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/testing/createTestQueryClient';
import ToolsTemplatesPage from '@/app/(app)/tools/templates';

const COLLECTING_POINTS_TOOLTIP =
  'If player is collecting points from the matches and they appear on the Ranking poster.';

function renderPage() {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ToolsTemplatesPage />
    </QueryClientProvider>
  );
}

describe('Tools templates Mode B', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
  });

  it(
    'defaults to Mode B first and can switch to Schedule Templates',
    async () => {
      const { findByText, getByTestId, queryByText } = renderPage();

      expect(getByTestId('tools-tab-mode-b')).toBeTruthy();
      expect(getByTestId('tools-tab-catalog')).toBeTruthy();
      expect(getByTestId('tools-branding-row')).toBeTruthy();
      expect(queryByText('Template catalog')).toBeNull();

      fireEvent.press(getByTestId('tools-tab-catalog'));
      expect(await findByText('Template catalog')).toBeTruthy();

      await waitFor(() => {
        expect(mockCatalog).toHaveBeenCalled();
        expect(mockMetrics).toHaveBeenCalled();
        expect(mockGetDivisions).toHaveBeenCalled();
      });
    },
    15000
  );

  it(
    'shows branding with Edition name first, No organizer default, and division row',
    async () => {
      const { findByText, getByText, getByTestId, queryByText, queryByTestId } =
        renderPage();

      await waitFor(() => expect(mockGetDivisions).toHaveBeenCalled());

      expect(getByTestId('tools-branding-row')).toBeTruthy();
      expect(getByTestId('tools-edition-name')).toBeTruthy();
      expect(getByTestId('tools-edition-name').props.maxLength).toBe(25);
      expect(await findByText('Edition name')).toBeTruthy();
      expect(getByText('Organizer branding')).toBeTruthy();
      expect(getByText('Club host branding')).toBeTruthy();
      expect(
        getByTestId('dropdown-selected-Organizer branding')
      ).toHaveTextContent('0');
      expect(getByTestId('tools-division-row')).toBeTruthy();
      expect(getByText('Division')).toBeTruthy();
      expect(getByText('Division name (PDF)')).toBeTruthy();
      expect(getByText('Courts')).toBeTruthy();
      expect(getByText('Start')).toBeTruthy();
      expect(getByText('End')).toBeTruthy();
      expect(getByText('Opponents')).toBeTruthy();
      expect(getByText('Repeat')).toBeTruthy();
      expect(queryByText('PDF title')).toBeNull();
      expect(queryByText('Partner branding')).toBeNull();
      expect(queryByTestId('tools-courts-input')).toBeNull();

      await waitFor(() =>
        expect(getByTestId('tools-division-name-pdf').props.value).toBe(
          'Rookies'
        )
      );
      expect(getByTestId('dropdown-selected-Division')).toHaveTextContent('1');

      fireEvent.press(getByTestId('dropdown-option-Division-2'));
      await waitFor(() =>
        expect(getByTestId('tools-division-name-pdf').props.value).toBe('Kids')
      );
    },
    15000
  );

  it(
    'sends edition_label and organizer_id null on PDF downloads by default',
    async () => {
      const { getByTestId } = renderPage();

      await waitFor(() => expect(mockGetDivisions).toHaveBeenCalled());
      await waitFor(() =>
        expect(getByTestId('tools-division-name-pdf').props.value).toBe(
          'Rookies'
        )
      );

      fireEvent.changeText(getByTestId('tools-edition-name'), 'Mini 12');

      fireEvent.press(getByTestId('tools-pdf-matches-0'));
      await waitFor(() =>
        expect(mockDownloadMatchesPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Rookies',
            edition_label: 'Mini 12',
            organizer_id: null,
            color: '#FACC15',
            court_index: 0,
          }),
          'scratch-matches-court-1.pdf'
        )
      );

      fireEvent.press(getByTestId('tools-pdf-ranking'));
      await waitFor(() =>
        expect(mockDownloadRankingPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Rookies',
            edition_label: 'Mini 12',
            organizer_id: null,
            color: '#FACC15',
          }),
          'scratch-ranking.pdf'
        )
      );
      expect(mockDownloadRankingPdf.mock.calls[0][0]).not.toHaveProperty(
        'court_index'
      );
    },
    15000
  );

  it(
    'adds and removes court badges with Add/Enter, ignoring blank duplicate and over-cap',
    async () => {
      const { getByTestId, queryByTestId } = renderPage();

      await waitFor(() => expect(mockGetDivisions).toHaveBeenCalled());

      expect(getByTestId('tools-court-badge-0')).toBeTruthy();
      expect(getByTestId('tools-court-badge-1')).toBeTruthy();
      expect(getByTestId('tools-court-draft')).toBeTruthy();
      expect(getByTestId('tools-court-add')).toBeTruthy();
      expect(getByTestId('tools-pdf-matches-0')).toBeTruthy();
      expect(getByTestId('tools-pdf-matches-1')).toBeTruthy();

      fireEvent.changeText(getByTestId('tools-court-draft'), '   ');
      fireEvent.press(getByTestId('tools-court-add'));
      expect(queryByTestId('tools-court-badge-2')).toBeNull();

      fireEvent.changeText(getByTestId('tools-court-draft'), 'Court 1');
      fireEvent.press(getByTestId('tools-court-add'));
      expect(queryByTestId('tools-court-badge-2')).toBeNull();
      expect(getByTestId('tools-court-draft').props.value).toBe('');

      fireEvent.changeText(getByTestId('tools-court-draft'), 'Court 3');
      fireEvent(getByTestId('tools-court-draft'), 'submitEditing');
      expect(getByTestId('tools-court-badge-2')).toBeTruthy();
      expect(getByTestId('tools-pdf-matches-2')).toBeTruthy();

      fireEvent.changeText(getByTestId('tools-court-draft'), 'Court 4');
      fireEvent.press(getByTestId('tools-court-add'));
      expect(getByTestId('tools-court-badge-3')).toBeTruthy();
      expect(getByTestId('tools-court-add-disabled')).toHaveTextContent('1');

      fireEvent.changeText(getByTestId('tools-court-draft'), 'Court 5');
      fireEvent.press(getByTestId('tools-court-add'));
      expect(queryByTestId('tools-court-badge-4')).toBeNull();

      fireEvent.press(getByTestId('tools-court-remove-1'));
      expect(queryByTestId('tools-court-badge-3')).toBeNull();
      expect(getByTestId('tools-pdf-matches-0')).toBeTruthy();
      expect(getByTestId('tools-pdf-matches-1')).toBeTruthy();
      expect(getByTestId('tools-pdf-matches-2')).toBeTruthy();
      expect(queryByTestId('tools-pdf-matches-3')).toBeNull();

      fireEvent.press(getByTestId('tools-preview'));
      await waitFor(() => expect(mockPreview).toHaveBeenCalled());
      expect(mockPreview.mock.calls[0][0].court_names).toEqual([
        'Court 1',
        'Court 3',
        'Court 4',
      ]);
    },
    15000
  );

  it(
    'adds players with DnD handle, avatar, collecting tooltip, and reorder',
    async () => {
      const { getByTestId, queryByTestId, getByText } = renderPage();

      await waitFor(() => expect(mockGetDivisions).toHaveBeenCalled());

      expect(queryByTestId('tools-selected-players')).toBeNull();
      expect(queryByTestId('tools-player-filter')).toBeNull();

      fireEvent.press(getByTestId('dropdown-option-Players-101'));
      expect(getByTestId('tools-selected-players')).toBeTruthy();
      expect(getByText('Selected players (1)')).toBeTruthy();
      expect(getByTestId('tools-collecting-101')).toBeTruthy();
      expect(getByTestId('tools-collecting-tip-101')).toBeTruthy();
      expect(getByTestId('tools-player-drag-101')).toBeTruthy();
      expect(getByTestId('tools-player-avatar-101-present')).toBeTruthy();
      expect(queryByTestId('tools-player-up-101')).toBeNull();
      expect(queryByTestId('tools-player-down-101')).toBeNull();

      fireEvent.press(getByTestId('tools-collecting-tip-101'));
      expect(getByTestId('tooltip-body')).toHaveTextContent(
        COLLECTING_POINTS_TOOLTIP
      );

      fireEvent.press(getByTestId('dropdown-option-Players-101'));
      expect(getByText('Selected players (1)')).toBeTruthy();

      fireEvent.press(getByTestId('dropdown-option-Players-102'));
      expect(getByText('Selected players (2)')).toBeTruthy();
      expect(getByTestId('tools-player-avatar-102-reload')).toBeTruthy();

      fireEvent.press(getByTestId('tools-preview'));
      await waitFor(() => expect(mockPreview).toHaveBeenCalled());
      expect(mockPreview.mock.calls[0][0].player_ids).toEqual([101, 102]);
      expect(mockPreview.mock.calls[0][0].collecting_player_ids).toEqual([
        101, 102,
      ]);
      expect(mockPreview.mock.calls[0][0].color).toBe('#FACC15');
      expect(mockPreview.mock.calls[0][0].adjust).toBe(0);

      fireEvent.press(getByTestId('tools-player-row-101-mock-reorder'));
      fireEvent.press(getByTestId('tools-preview'));
      await waitFor(() =>
        expect(mockPreview.mock.calls.at(-1)?.[0].player_ids).toEqual([
          102, 101,
        ])
      );

      fireEvent.press(getByTestId('tools-collecting-101'));
      fireEvent.press(getByTestId('tools-preview'));
      await waitFor(() =>
        expect(mockPreview.mock.calls.at(-1)?.[0].collecting_player_ids).toEqual(
          [102]
        )
      );

      fireEvent.press(getByTestId('tools-remove-player-102'));
      expect(getByText('Selected players (1)')).toBeTruthy();
      fireEvent.press(getByTestId('tools-remove-player-101'));
      expect(queryByTestId('tools-selected-players')).toBeNull();
    },
    15000
  );

  it(
    'previews template file, avg time, and matches count without match lines',
    async () => {
      const { findByText, getByText, queryByText } = renderPage();

      await waitFor(() => expect(mockGetDivisions).toHaveBeenCalled());
      fireEvent.press(getByText('Preview'));

      expect(
        await findByText(
          /Template file: players-8-partners-3-repeat-1-courts-2\.json/
        )
      ).toBeTruthy();
      expect(getByText(/Template version: 4/)).toBeTruthy();
      expect(getByText(/Average playing time \/ match: 45 min/)).toBeTruthy();
      expect(getByText(/Matches: 1/)).toBeTruthy();
      expect(getByText(/Points per match: 16/)).toBeTruthy();
      expect(queryByText(/Points per match: 15/)).toBeNull();
      expect(queryByText(/A:1,2 vs B:3,4/)).toBeNull();
      expect(queryByText(/matches=/)).toBeNull();
      expect(queryByText('Template demo')).toBeNull();
      expect(mockDemo).not.toHaveBeenCalled();
    },
    15000
  );

  it(
    'downloads per-court matches PDFs and ranking with division name as title',
    async () => {
      const { getByTestId } = renderPage();

      await waitFor(() => expect(mockGetDivisions).toHaveBeenCalled());
      await waitFor(() =>
        expect(getByTestId('tools-division-name-pdf').props.value).toBe(
          'Rookies'
        )
      );

      expect(getByTestId('tools-pdf-matches-0-start-icon')).toHaveTextContent(
        'download'
      );
      expect(getByTestId('tools-pdf-matches-1-start-icon')).toHaveTextContent(
        'download'
      );
      expect(getByTestId('tools-pdf-ranking-start-icon')).toHaveTextContent(
        'download'
      );

      fireEvent.press(getByTestId('tools-pdf-matches-0'));
      await waitFor(() =>
        expect(mockDownloadMatchesPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Rookies',
            color: '#FACC15',
            court_index: 0,
            edition_label: '',
            organizer_id: null,
            adjust: 0,
          }),
          'scratch-matches-court-1.pdf'
        )
      );

      fireEvent.press(getByTestId('tools-pdf-matches-1'));
      await waitFor(() =>
        expect(mockDownloadMatchesPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Rookies',
            court_index: 1,
          }),
          'scratch-matches-court-2.pdf'
        )
      );

      fireEvent.press(getByTestId('tools-pdf-ranking'));
      await waitFor(() =>
        expect(mockDownloadRankingPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Rookies',
            color: '#FACC15',
            edition_label: '',
            organizer_id: null,
            adjust: 0,
          }),
          'scratch-ranking.pdf'
        )
      );

      await waitFor(() =>
        expect(getByTestId('tools-pdf-ranking-status')).toHaveTextContent(
          'success'
        )
      );
    },
    15000
  );

  it(
    'reports download and preview failures on the button, not a banner',
    async () => {
      Object.defineProperty(Platform, 'OS', {
        configurable: true,
        get: () => 'ios',
      });
      mockPreview.mockRejectedValueOnce(new Error('Scratch preview exploded'));

      const { getByTestId, queryByText } = renderPage();

      await waitFor(() => expect(mockGetDivisions).toHaveBeenCalled());

      fireEvent.press(getByTestId('tools-pdf-matches-0'));
      await waitFor(() =>
        expect(getByTestId('tools-pdf-matches-0-status')).toHaveTextContent(
          'error'
        )
      );
      expect(mockDownloadMatchesPdf).not.toHaveBeenCalled();
      expect(queryByText('PDF download is web-only.')).toBeNull();

      fireEvent.press(getByTestId('tools-preview'));
      await waitFor(() =>
        expect(getByTestId('tools-preview-status')).toHaveTextContent('error')
      );
      expect(queryByText('Scratch preview exploded')).toBeNull();
    },
    15000
  );
});
