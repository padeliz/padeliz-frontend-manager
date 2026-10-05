import ScheduleLayout from '@/app/(app)/events/[id]/schedule/_layout';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import {
  SubTabBarProvider,
  useSubTabBarTrail,
} from '@/components/layout/SubTabBarProvider';
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
  useLocalSearchParams: () => ({ id: '1' }),
  useGlobalSearchParams: () => ({ id: '1' }),
  usePathname: () => '/events/1/schedule/knobs',
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ children }: any) => children,
})
);

function SubTabChrome() {
  return <View testID="subtab-chrome">{useSubTabBarTrail()}</View>;
}

describe('Schedule nested tabs', () => {
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
      path.join(__dirname, '..', '[id]', 'schedule', '_layout.tsx'),
      'utf8'
    );
    expect(src).toContain('useSubTabBar');
    expect(src).not.toContain('<EventTabsBar');
  });

  it('stabilizes onBeforeNavigate via actionsRef', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '[id]', 'schedule', '_layout.tsx'),
      'utf8'
    );
    expect(src).toContain('usePageChromeActionsRef');
    expect(src).not.toContain('usePageChrome(');
    expect(src).not.toContain('actionsRef.current = actions');
    expect(src).toMatch(/onBeforeNavigate = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\)/);
    expect(src).not.toMatch(/onBeforeNavigate = useCallback\(async \(\) => \{[\s\S]*?\}, \[actions\]\)/);
  });

  it('exposes Knobs and Matches via useSubTabBar', async () => {
    activeClient = createTestQueryClient();
    const { findByTestId, queryByTestId } = render(
      <QueryClientProvider client={activeClient}>
        <SubTabBarProvider>
          <SubTabChrome />
          <PageChromeProvider>
            <ScheduleLayout />
          </PageChromeProvider>
        </SubTabBarProvider>
      </QueryClientProvider>
    );
    expect(await findByTestId('event-tab-Knobs')).toBeTruthy();
    expect(await findByTestId('event-tab-Matches')).toBeTruthy();
    expect(queryByTestId('event-tab-Participations')).toBeNull();
    await waitFor(() => {
      expect(queryByTestId('event-tab-Participations')).toBeNull();
    });
    expect(await findByTestId('app-sub-tab-bar')).toBeTruthy();
    expect((await findByTestId('event-tab-Knobs')).props.className).toContain(
      'bg-blue-600'
    );
  });
});
