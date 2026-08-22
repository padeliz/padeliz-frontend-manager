import EditionRegistrationsTab from '@/app/(app)/editions/[id]/registrations/index';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { ToastProvider } from '@/context/ToastContext';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetRegistrations = jest.fn(async () => ({
  data: [],
  meta: {},
  links: {},
}));
const mockGetEdition = jest.fn(async () => ({
  data: { id_edition: 7, name: 'Cup', finalized_at: null },
}));
const mockPush = jest.fn();
let capturedConfig: any;

jest.mock('@/services/api/editionRegistrationsApi', () => ({
  EditionRegistrationsApiService: jest.fn().mockImplementation(() => ({
    getRegistrations: (...args: unknown[]) => mockGetRegistrations(...args),
    bulkDeleteRegistrations: jest.fn(),
  })),
}));

jest.mock('@/services/api/editionsApi', () => ({
  EditionsApiService: jest.fn().mockImplementation(() => ({
    getEdition: (...args: unknown[]) => mockGetEdition(...args),
  })),
}));

jest.mock('@/services/api/editionParticipationMappingApi', () => ({
  EditionParticipationMappingApiService: jest.fn().mockImplementation(() => ({
    preview: jest.fn(async () => ({
      data: {
        can_map: true,
        disabled_reason: null,
        existing_participations_count: 0,
        registered_player_count: 0,
        division_specific_registration_count: 0,
        edition_wide_registration_count: 0,
      },
    })),
    map: jest.fn(),
  })),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ id: '7' }),
}));

jest.mock('@/components/pages/ResourceListPage', () => ({
  __esModule: true,
  default: ({ config }: any) => {
    capturedConfig = config;
    const { Pressable, Text, View } = require('react-native');
    return (
      <View testID="embedded-registrations-list">
        <Text>{config.embedded ? 'embedded' : 'full'}</Text>
        <Text testID="exclude-fields">{(config.excludeFields || []).join(',')}</Text>
        <Pressable testID="tab-add" onPress={() => config.onAdd?.()} />
      </View>
    );
  },
}));

function renderTab() {
  const queryClient = createTestQueryClient();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <PageChromeProvider>
          <EditionRegistrationsTab />
        </PageChromeProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
  return { ...utils, queryClient };
}

describe('Edition registrations tab', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;
  let activeUnmount: (() => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    capturedConfig = null;
    mockGetEdition.mockResolvedValue({
      data: { id_edition: 7, name: 'Cup', finalized_at: null },
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

  function mountTab() {
    const mounted = renderTab();
    activeClient = mounted.queryClient;
    activeUnmount = mounted.unmount;
    return mounted;
  }

  it('embeds the list, hides the edition column, and locks filters.edition_id last', async () => {
    const { getByTestId } = mountTab();
    await waitFor(() => {
      expect(capturedConfig).toBeTruthy();
    });
    expect(capturedConfig.embedded).toBe(true);
    expect(capturedConfig.excludeFields).toEqual(['edition_id']);
    expect(capturedConfig.mutationsDisabled).toBe(false);

    await capturedConfig.fetchData({
      page: 1,
      filters: { player_id: 3, edition_id: 999 },
    });
    expect(mockGetRegistrations).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: { player_id: 3, edition_id: 7 },
      })
    );
    expect(getByTestId('embedded-registrations-list')).toBeTruthy();
  });

  it('Add uses withSearchParams for edition_id', async () => {
    const { getByTestId } = mountTab();
    await waitFor(() => expect(capturedConfig).toBeTruthy());
    fireEvent.press(getByTestId('tab-add'));
    expect(mockPush).toHaveBeenCalledWith(
      '/edition-registrations/add?edition_id=7'
    );
  });

  it('disables mutations when the edition is finalized', async () => {
    mockGetEdition.mockResolvedValue({
      data: { id_edition: 7, name: 'Cup', finalized_at: 123 },
    });
    const { findByTestId } = mountTab();
    await findByTestId('registrations-finalized-hint');
    await waitFor(() => {
      expect(capturedConfig?.mutationsDisabled).toBe(true);
    });
  });
});
