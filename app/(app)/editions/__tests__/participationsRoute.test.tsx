import EditionParticipationsRoute from '@/app/(app)/editions/[id]/participations';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

let capturedTabProps: any;

const mockFetchAllPaginated = jest.fn();
const mockGetParticipations = jest.fn();
const mockGetEditionDivisions = jest.fn();
const mockGetEdition = jest.fn();
const mockGetPlayerCustomFields = jest.fn();

jest.mock('@/utils/fetchAllPaginated', () => ({
  fetchAllPaginated: (...args: unknown[]) => mockFetchAllPaginated(...args),
}));

jest.mock('@/components/editions/EditionParticipationsTab', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedTabProps = props;
    const { Text } = require('react-native');
    return <Text testID="participations-tab-stub">tab</Text>;
  },
}));

jest.mock('@/services/api/editionParticipationsApi', () => ({
  EditionParticipationsApiService: jest.fn().mockImplementation(() => ({
    getParticipations: (...args: unknown[]) => mockGetParticipations(...args),
  })),
}));

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: (...args: unknown[]) => mockGetEditionDivisions(...args),
  })),
}));

jest.mock('@/services/api/editionsApi', () => ({
  EditionsApiService: jest.fn().mockImplementation(() => ({
    getEdition: (...args: unknown[]) => mockGetEdition(...args),
  })),
}));

jest.mock('@/services/api/playerCustomFieldsApi', () => ({
  PlayerCustomFieldsApiService: jest.fn().mockImplementation(() => ({
    getPlayerCustomFields: (...args: unknown[]) =>
      mockGetPlayerCustomFields(...args),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useLocalSearchParams: () => ({ id: '12' }),
})
);

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});

function renderRoute() {
  const queryClient = createTestQueryClient();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditionParticipationsRoute />
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

describe('Edition participations route', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedTabProps = null;
    mockGetEdition.mockResolvedValue({
      data: { id_edition: 12, finalized_at: null },
    });
    mockGetEditionDivisions.mockResolvedValue({
      data: [{ id_edition_division: 90, edition_id: 12 }],
    });
    mockGetParticipations.mockResolvedValue({
      data: [{ id_participation: 1, edition_id: 12 }],
      meta: {
        last_page: 1,
        edition_summary: {
          registered_not_participating_count: 2,
          participations_locked: true,
        },
      },
    });
    mockGetPlayerCustomFields.mockResolvedValue({ data: [] });
    mockFetchAllPaginated.mockImplementation(async fetchPage => {
      const res = await fetchPage(1);
      return { data: res.data, meta: res.meta };
    });
  });

  afterEach(async () => {
    activeUnmount?.();
    activeUnmount = null;
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  function mountRoute() {
    const mounted = renderRoute();
    activeClient = mounted.queryClient;
    activeUnmount = mounted.unmount;
    return mounted;
  }

  it('loads all pages via fetchAllPaginated and passes edition summary props', async () => {
    mountRoute();

    await waitFor(() => expect(capturedTabProps).toBeTruthy());
    await waitFor(() =>
      expect(capturedTabProps.participations).toEqual([
        { id_participation: 1, edition_id: 12 },
      ])
    );
    expect(mockFetchAllPaginated).toHaveBeenCalled();
    expect(capturedTabProps.editionId).toBe(12);
    expect(mockGetParticipations).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        per_page: 100,
        filters: { edition_id: 12 },
        sort_by: { sort_order: 'asc' },
      })
    );
    expect(capturedTabProps.registeredNotParticipatingCount).toBe(2);
    expect(capturedTabProps.participationsLocked).toBe(true);
    await waitFor(() => {
      expect(mockGetPlayerCustomFields).toHaveBeenCalled();
      expect(capturedTabProps.customFieldOptions).toEqual([]);
    });
  });
});
