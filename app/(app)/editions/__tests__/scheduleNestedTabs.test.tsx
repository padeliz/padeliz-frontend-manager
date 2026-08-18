import ScheduleLayout from '@/app/(app)/editions/[id]/schedule/_layout';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: async () => ({ data: [] }),
  })),
}));

jest.mock('expo-router', () => ({
  Slot: () => null,
  useLocalSearchParams: () => ({ id: '1' }),
  useGlobalSearchParams: () => ({ id: '1' }),
  usePathname: () => '/editions/1/schedule/knobs',
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ children }: any) => children,
}));

describe('Schedule nested tabs', () => {
  it('exposes Knobs and Matches only', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { findByTestId, queryByTestId } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <ScheduleLayout />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    expect(await findByTestId('edition-tab-Knobs')).toBeTruthy();
    expect(await findByTestId('edition-tab-Matches')).toBeTruthy();
    expect(queryByTestId('edition-tab-Participations')).toBeNull();
    await waitFor(() => {
      expect(queryByTestId('edition-tab-Participations')).toBeNull();
    });
  });
});
