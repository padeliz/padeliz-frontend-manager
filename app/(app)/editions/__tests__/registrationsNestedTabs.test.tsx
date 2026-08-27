import RegistrationsLayout from '@/app/(app)/editions/[id]/registrations/_layout';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import { SubTabBarProvider, useSubTabBarTrail } from '@/components/layout/SubTabBarProvider';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { View } from 'react-native';

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: async () => ({ data: [] }),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  Slot: () => null,
  useLocalSearchParams: () => ({ id: '7' }),
  useGlobalSearchParams: () => ({ id: '7' }),
  usePathname: () => '/editions/7/registrations',
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ children }: any) => children,
})
);

function SubTabChrome() {
  return <View testID="subtab-chrome">{useSubTabBarTrail()}</View>;
}

describe('Registrations nested tabs', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;

  afterEach(async () => {
    cleanup();
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  it('does not render a local EditionTabsBar in layout source', () => {
    const src = fs.readFileSync(
      path.join(
        __dirname,
        '..',
        '[id]',
        'registrations',
        '_layout.tsx'
      ),
      'utf8'
    );
    expect(src).toContain('useSubTabBar');
    expect(src).not.toContain('<EditionTabsBar');
  });

  it('exposes List and Register Players via useSubTabBar', async () => {
    activeClient = createTestQueryClient();
    const { findByTestId, queryByTestId } = render(
      <QueryClientProvider client={activeClient}>
        <SubTabBarProvider>
          <SubTabChrome />
          <PageChromeProvider>
            <RegistrationsLayout />
          </PageChromeProvider>
        </SubTabBarProvider>
      </QueryClientProvider>
    );
    expect(await findByTestId('edition-tab-List')).toBeTruthy();
    expect(await findByTestId('edition-tab-Register Players')).toBeTruthy();
    expect(queryByTestId('edition-tab-Participations')).toBeNull();
    await waitFor(() => {
      expect(queryByTestId('edition-tab-Knobs')).toBeNull();
    });
    expect(await findByTestId('app-sub-tab-bar')).toBeTruthy();
  });
});
