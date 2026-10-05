import EventParticipationsRoute from '@/app/(app)/events/[id]/participations';
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
const mockGetEventDivisions = jest.fn();
const mockGetEvent = jest.fn();
const mockGetPlayerCustomFields = jest.fn();

jest.mock('@/utils/fetchAllPaginated', () => ({
  fetchAllPaginated: (...args: unknown[]) => mockFetchAllPaginated(...args),
}));

jest.mock('@/components/events/EventParticipationsTab', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedTabProps = props;
    const { Text } = require('react-native');
    return <Text testID="participations-tab-stub">tab</Text>;
  },
}));

jest.mock('@/services/api/eventParticipationsApi', () => ({
  EventParticipationsApiService: jest.fn().mockImplementation(() => ({
    getParticipations: (...args: unknown[]) => mockGetParticipations(...args),
  })),
}));

jest.mock('@/services/api/eventDivisionsApi', () => ({
  EventDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEventDivisions: (...args: unknown[]) => mockGetEventDivisions(...args),
  })),
}));

jest.mock('@/services/api/eventsApi', () => ({
  EventsApiService: jest.fn().mockImplementation(() => ({
    getEvent: (...args: unknown[]) => mockGetEvent(...args),
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
      <EventParticipationsRoute />
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

describe('Event participations route', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedTabProps = null;
    mockGetEvent.mockResolvedValue({
      data: { id_event: 12, finalized_at: null },
    });
    mockGetEventDivisions.mockResolvedValue({
      data: [{ id_event_division: 90, event_id: 12 }],
    });
    mockGetParticipations.mockResolvedValue({
      data: [{ id_participation: 1, event_id: 12 }],
      meta: {
        last_page: 1,
        event_summary: {
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

  it('loads all pages via fetchAllPaginated and passes event summary props', async () => {
    mountRoute();

    await waitFor(() => expect(capturedTabProps).toBeTruthy());
    await waitFor(() =>
      expect(capturedTabProps.participations).toEqual([
        { id_participation: 1, event_id: 12 },
      ])
    );
    expect(mockFetchAllPaginated).toHaveBeenCalled();
    expect(capturedTabProps.eventId).toBe(12);
    expect(mockGetParticipations).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        per_page: 100,
        filters: { event_id: 12 },
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
