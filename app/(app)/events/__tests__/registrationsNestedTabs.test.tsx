import RegistrationsLayout from '@/app/(app)/events/[id]/registrations/_layout';
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

jest.mock('@/services/api/eventDivisionsApi', () => ({
  EventDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEventDivisions: async () => ({ data: [] }),
  })),
}));

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  Slot: () => null,
  useLocalSearchParams: () => ({ id: '7' }),
  useGlobalSearchParams: () => ({ id: '7' }),
  usePathname: () => '/events/7/registrations',
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

  it('does not render a local EventTabsBar in layout source', () => {
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
    expect(src).not.toContain('<EventTabsBar');
  });

  it('stabilizes onBeforeNavigate via actionsRef', () => {
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
    expect(src).toContain('usePageChromeActionsRef');
    expect(src).not.toContain('usePageChrome(');
    expect(src).not.toContain('actionsRef.current = actions');
    expect(src).toMatch(/onBeforeNavigate = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\)/);
    expect(src).not.toMatch(/onBeforeNavigate = useCallback\(async \(\) => \{[\s\S]*?\}, \[actions\]\)/);
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
    expect(await findByTestId('event-tab-List')).toBeTruthy();
    expect(await findByTestId('event-tab-Register Players')).toBeTruthy();
    expect(queryByTestId('event-tab-Participations')).toBeNull();
    await waitFor(() => {
      expect(queryByTestId('event-tab-Knobs')).toBeNull();
    });
    expect(await findByTestId('app-sub-tab-bar')).toBeTruthy();
  });
});
