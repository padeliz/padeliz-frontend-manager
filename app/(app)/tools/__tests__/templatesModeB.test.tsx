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
  return ({ label, onPress, testID, status, startIcon }: any) => (
    <Pressable testID={testID} onPress={onPress}>
      <Text>{label}</Text>
      {testID ? (
        <>
          <Text testID={`${testID}-status`}>{status ?? 'idle'}</Text>
          <Text testID={`${testID}-start-icon`}>{startIcon ?? 'none'}</Text>
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
  const { Text, View } = require('react-native');
  return ({ options, selectedValue }: any) => (
    <View>
      <Text testID="dropdown-selected">{String(selectedValue)}</Text>
      {options?.map((o: any) => (
        <Text key={String(o.value)}>{o.label}</Text>
      ))}
    </View>
  );
});

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
const mockGetPlayers = jest.fn(async () => ({
  data: [
    { id_player: 101, name: 'Casey', first_name: 'Casey', last_name: 'C' },
  ],
  meta: { last_page: 1, current_page: 1 },
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

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayers: (...args: unknown[]) => mockGetPlayers(...args),
  })),
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
import {
  createTestQueryClient,
} from '@/testing/createTestQueryClient';
import ToolsTemplatesPage from '@/app/(app)/tools/templates';

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
    'loads catalog/metrics and shows Schedule Templates + Mode B tabs',
    async () => {
      const { findByText, getByTestId } = renderPage();

      expect(getByTestId('tools-tab-catalog')).toBeTruthy();
      expect(getByTestId('tools-tab-mode-b')).toBeTruthy();
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
    'switches to Mode B tab then filters players and previews',
    async () => {
      const { findByText, getByText, getByTestId } = renderPage();

      await waitFor(() => expect(mockCatalog).toHaveBeenCalled());

      fireEvent.press(getByTestId('tools-tab-mode-b'));
      expect(getByTestId('tools-player-filter')).toBeTruthy();

      await waitFor(() => expect(mockGetPlayers).toHaveBeenCalled());
      expect(await findByText(/Rookies \(#FACC15\)/)).toBeTruthy();
      expect(getByText(/Kids \(#22C55E\)/)).toBeTruthy();

      fireEvent.changeText(getByTestId('tools-player-filter'), 'Cas');
      expect(await findByText(/Casey \(#101\)/)).toBeTruthy();
      fireEvent.press(getByText(/Casey \(#101\)/));

      fireEvent.press(getByText('Preview'));
      await waitFor(() => {
        expect(mockPreview).toHaveBeenCalled();
      });
      const payload = mockPreview.mock.calls[0][0];
      expect(payload.player_ids).toEqual([101]);
      expect(payload.collecting_player_ids).toEqual([101]);
      expect(payload.organizer_id).toBe(1);
      expect(payload.club_id).toBeNull();
      expect(payload).not.toHaveProperty('partner_id');
      expect(payload.color).toBe('#FACC15');
      expect(await findByText(/A:1,2 vs B:3,4/)).toBeTruthy();
    },
    15000
  );

  it(
    'offers organizers and clubs as branding pickers instead of partners',
    async () => {
      const { findByText, getByText, getByTestId, queryByText } = renderPage();

      await waitFor(() => expect(mockCatalog).toHaveBeenCalled());
      fireEvent.press(getByTestId('tools-tab-mode-b'));

      await waitFor(() => {
        expect(mockGetOrganizers).toHaveBeenCalled();
        expect(mockGetClubs).toHaveBeenCalled();
      });

      expect(await findByText('Organizer branding')).toBeTruthy();
      expect(getByText('Club host branding')).toBeTruthy();
      expect(queryByText('Partner branding')).toBeNull();
      expect(getByText('1. ARSH Padel MiniTour')).toBeTruthy();
      expect(getByText('4. Padel Club Host')).toBeTruthy();
      expect(getByText('No club host')).toBeTruthy();
    },
    15000
  );

  it(
    'downloads matches and ranking PDFs through download-icon ActionButtons',
    async () => {
      const { getByTestId } = renderPage();

      await waitFor(() => expect(mockCatalog).toHaveBeenCalled());
      fireEvent.press(getByTestId('tools-tab-mode-b'));

      expect(getByTestId('tools-pdf-matches-start-icon')).toHaveTextContent(
        'download'
      );
      expect(getByTestId('tools-pdf-ranking-start-icon')).toHaveTextContent(
        'download'
      );

      fireEvent.press(getByTestId('tools-pdf-matches'));
      await waitFor(() =>
        expect(mockDownloadMatchesPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Scratch MiniTour',
            court_index: 0,
          }),
          'scratch-matches.pdf'
        )
      );

      fireEvent.press(getByTestId('tools-pdf-ranking'));
      await waitFor(() =>
        expect(mockDownloadRankingPdf).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Scratch MiniTour' }),
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

      await waitFor(() => expect(mockCatalog).toHaveBeenCalled());
      fireEvent.press(getByTestId('tools-tab-mode-b'));

      fireEvent.press(getByTestId('tools-pdf-matches'));
      await waitFor(() =>
        expect(getByTestId('tools-pdf-matches-status')).toHaveTextContent(
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

  it(
    'runs the template demo through an ActionButton',
    async () => {
      const { findByText, getByTestId } = renderPage();

      await waitFor(() => expect(mockCatalog).toHaveBeenCalled());
      fireEvent.press(getByTestId('tools-tab-mode-b'));

      fireEvent.press(getByTestId('tools-demo'));
      await waitFor(() => expect(mockDemo).toHaveBeenCalledWith(8, 3, 1, 2));
      expect(await findByText(/Demo loaded/)).toBeTruthy();
      expect(getByTestId('tools-demo-status')).toHaveTextContent('success');
    },
    15000
  );
});
