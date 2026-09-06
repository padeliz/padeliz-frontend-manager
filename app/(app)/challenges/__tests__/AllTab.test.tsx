import ChallengesAllTab from '../(hub)/all';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ push: jest.fn() }),
})
);

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));

jest.mock('@/components/chrome/PageChromeProvider', () => ({
  useRegisterPageActions: jest.fn(),
  useHasPageChrome: () => false,
}));

jest.mock('@/hooks/useResourceMetadata', () => ({
  useResourceMetadata: () => ({
    getMetadata: () => null,
    isLoading: () => false,
  }),
}));

jest.mock('@/services/api/challengesApi', () => ({
  challengesApi: {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id_challenge_session: 1,
          type: 'king_of_the_court',
          status: 'active',
          title: 'KOTC Session',
          started_at: 1000,
          completed_at: null,
        },
      ],
      meta: { current_page: 1, last_page: 1, total: 1, per_page: 10 },
      links: {},
    }),
    show: jest.fn().mockResolvedValue({
      data: {
        id_challenge_session: 1,
        type: 'king_of_the_court',
        status: 'active',
        title: 'KOTC Session',
        started_at: 1000,
        completed_at: null,
      },
    }),
  },
}));

jest.mock('@/components/ui/AdvancedDataTable', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    data,
    columns,
  }: {
    data: { title: string }[];
    columns: { key: string; render?: (item: any) => React.ReactNode }[];
  }) => (
    <View testID="advanced-data-table">
      {data.map((row, i) => (
        <View key={i} testID={`row-${i}`}>
          {columns[0]?.render?.(row)}
        </View>
      ))}
    </View>
  );
});

jest.mock('@/components/ui/AdvancedSearchFilters', () => {
  const { View } = require('react-native');
  return () => <View testID="search-filters" />;
});

describe('ChallengesAllTab', () => {
  let client = createTestQueryClient();

  afterEach(async () => {
    cleanup();
    await disposeTestQueryClient(client);
    client = createTestQueryClient();
  });

  it('embeds ResourceListPage without Add button', async () => {
    const { getByTestId, queryByTestId } = render(
      <QueryClientProvider client={client}>
        <ChallengesAllTab />
      </QueryClientProvider>
    );

    await waitFor(() =>
      expect(getByTestId('resource-list-embedded')).toBeTruthy()
    );
    expect(queryByTestId('resource-list-add')).toBeNull();
    expect(getByTestId('advanced-data-table')).toBeTruthy();
    await act(async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    });
  });
});
