import RegistrationsLayout from '@/app/(app)/editions/[id]/registrations/_layout';
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
  useLocalSearchParams: () => ({ id: '7' }),
  useGlobalSearchParams: () => ({ id: '7' }),
  usePathname: () => '/editions/7/registrations',
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ children }: any) => children,
}));

describe('Registrations nested tabs', () => {
  it('exposes List and Register Players only', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { findByTestId, queryByTestId } = render(
      <QueryClientProvider client={client}>
        <PageChromeProvider>
          <RegistrationsLayout />
        </PageChromeProvider>
      </QueryClientProvider>
    );
    expect(await findByTestId('edition-tab-List')).toBeTruthy();
    expect(await findByTestId('edition-tab-Register Players')).toBeTruthy();
    expect(queryByTestId('edition-tab-Participations')).toBeNull();
    await waitFor(() => {
      expect(queryByTestId('edition-tab-Knobs')).toBeNull();
    });
  });
});
