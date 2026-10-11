import { EventChrome } from '@/components/events/EventDetailChrome';
import {
  PageChromeProvider,
  useRegisterPageActions,
} from '@/components/chrome/PageChromeProvider';
import { formatDisplayDate } from '@/utils/fieldFormatter';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import fs from 'fs';
import path from 'path';

const mockGetEvent = jest.fn(async () => ({
  data: {
    id_event: 1,
    name: 'Test Event',
    event_starts_at: Math.floor(
      new Date('2026-08-24T09:00:00+03:00').getTime() / 1000
    ),
    event_ends_at: Math.floor(
      new Date('2026-08-24T22:00:00+03:00').getTime() / 1000
    ),
    finalized_at: null,
  },
}));
const mockGetEventDivisions = jest.fn(async () => ({
  data: [
    {
      id_event_division: 9,
      event_id: 1,
      division_title: 'Open A',
    },
  ],
}));

jest.mock('@/services/api/eventsApi', () => ({
  EventsApiService: jest.fn().mockImplementation(() => ({
    getEvent: (...args: unknown[]) => mockGetEvent(...args),
    finalizeEvent: jest.fn(),
  })),
}));

jest.mock('@/services/api/eventDivisionsApi', () => ({
  EventDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEventDivisions: (...args: unknown[]) =>
      mockGetEventDivisions(...args),
  })),
}));

jest.mock('@/services/api/eventLotteriesApi', () => ({
  EventLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: jest.fn(async () => ({
      data: [
        { id_lottery: 3, name: 'Alpha Draw', display_order: 0, has_luckies: false },
        { id_lottery: 9, name: 'Zebra Draw', display_order: 1, has_luckies: false },
      ],
    })),
  })),
}));

let mockPathname = '/events/1/details';
let mockSlot: React.ComponentType | null = null;

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({ replace: jest.fn(), back: jest.fn() }),
  usePathname: () => mockPathname,
  useLocalSearchParams: () => ({ id: '1' }),
  useGlobalSearchParams: () => ({ id: '1' }),
  Slot: () => {
    const ReactLocal = require('react');
    return mockSlot ? ReactLocal.createElement(mockSlot) : null;
  },
  Redirect: () => null,
})
);

jest.mock('@/components/layout/AppLayout', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({
    children,
    title,
    description,
    headerActions,
  }: {
    children: React.ReactNode;
    title?: string;
    description?: string;
    headerActions?: React.ReactNode;
  }) => (
    <View>
      {title ? <Text testID="app-layout-title">{title}</Text> : null}
      {description ? (
        <Text testID="app-layout-description">{description}</Text>
      ) : null}
      {headerActions}
      {children}
    </View>
  );
});

function renderChrome() {
  const client = createTestQueryClient();
  const result = render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <EventChrome />
      </PageChromeProvider>
    </QueryClientProvider>
  );
  return { ...result, client };
}

describe('EventChrome ED picker visibility', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSlot = null;
    (window as any).addEventListener = jest.fn();
    (window as any).removeEventListener = jest.fn();
  });

  afterEach(async () => {
    cleanup();
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  function mountChrome() {
    const mounted = renderChrome();
    activeClient = mounted.client;
    return mounted;
  }

  it('hides the ED picker on Details', async () => {
    mockPathname = '/events/1/details';
    const { queryByTestId, findByText } = mountChrome();
    await findByText('Event: Test Event');
    expect(queryByTestId('event-division-picker')).toBeNull();
  });

  it('hides the ED picker on Registrations', async () => {
    mockPathname = '/events/1/registrations';
    const { queryByTestId, findByText } = mountChrome();
    await findByText('Event: Test Event');
    expect(queryByTestId('event-division-picker')).toBeNull();
  });

  it('hides the ED picker on Divisions', async () => {
    mockPathname = '/events/1/divisions';
    const { queryByTestId, findByText } = mountChrome();
    await findByText('Event: Test Event');
    expect(queryByTestId('event-division-picker')).toBeNull();
  });

  it('shows the ED picker on Participations', async () => {
    mockPathname = '/events/1/participations';
    const { findByTestId } = mountChrome();
    expect(await findByTestId('event-division-picker')).toBeTruthy();
  });

  it('hides the ED picker on Lottery and shows the lottery picker', async () => {
    mockPathname = '/events/1/lottery/prizes';
    const { findByTestId, queryByTestId, findByText } = mountChrome();
    await findByText('Event: Test Event');
    expect(queryByTestId('event-division-picker')).toBeNull();
    expect(await findByTestId('event-lottery-picker')).toBeTruthy();
  });

  it('shows formatted event date in Page Header description', async () => {
    mockPathname = '/events/1/details';
    const { findByTestId, queryByText } = mountChrome();
    const expectedDate = formatDisplayDate('2026-08-24');
    expect(await findByTestId('app-layout-description')).toHaveTextContent(
      expectedDate
    );
    expect(queryByText(/ID 1/)).toBeNull();
  });

  it('stabilizes discardIfNeeded via actionsRef', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EventDetailChrome.tsx'),
      'utf8'
    );
    const chromeStart = src.indexOf('export function EventChrome()');
    expect(chromeStart).toBeGreaterThanOrEqual(0);
    const chromeBody = src.slice(chromeStart);
    expect(chromeBody).toContain('usePageChromeActionsRef');
    expect(chromeBody).not.toContain('usePageChrome(');
    expect(chromeBody).not.toContain('actionsRef.current = actions');
    const discardBlock = chromeBody.match(
      /const discardIfNeeded = useCallback\(async \(\): Promise<boolean> => \{[\s\S]*?\}, \[([^\]]*)\]\)/
    );
    expect(discardBlock).not.toBeNull();
    expect(discardBlock![1].trim()).toBe('');
  });

  it('keeps PageChrome reads in EventChromeHeaderActions leaf', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EventDetailChrome.tsx'),
      'utf8'
    );
    const leafStart = src.indexOf('export function EventChromeHeaderActions');
    const chromeStart = src.indexOf('export function EventChrome()');
    expect(leafStart).toBeGreaterThanOrEqual(0);
    expect(chromeStart).toBeGreaterThan(leafStart);
    const leafBody = src.slice(leafStart, chromeStart);
    expect(leafBody).toContain('usePageChrome(');

    for (const name of ['onSave', 'onRefresh'] as const) {
      const block = src.match(
        new RegExp(
          `const ${name} = useCallback\\([\\s\\S]*?\\}, \\[([^\\]]*)\\]\\)`
        )
      );
      expect(block).not.toBeNull();
      expect(block![1]).not.toMatch(/\bactions\b/);
      expect(block![1]).not.toContain('actions?.isDirty');
    }

    expect(src).toMatch(
      /useEffect\(\(\) => \{[\s\S]*?beforeunload[\s\S]*?\}, \[actionsRef\]\)/
    );
    expect(src).toMatch(
      /hardwareBackPress[\s\S]*?\}, \[actionsRef, onBack\]\)/
    );
  });

  it('does not re-render Slot content when registered isDirty flips; Save enables', async () => {
    mockPathname = '/events/1/details';
    const contentRenders = { current: 0 };

    function ContentProbe() {
      contentRenders.current += 1;
      return <Text testID="slot-content-renders">{String(contentRenders.current)}</Text>;
    }

    function FlipRegistrar() {
      const [dirty, setDirty] = useState(false);
      useRegisterPageActions({
        isDirty: dirty,
        canSave: dirty,
        cancel: () => undefined,
      });
      return (
        <Pressable testID="flip-dirty" onPress={() => setDirty(true)}>
          <Text>flip</Text>
        </Pressable>
      );
    }

    mockSlot = function IsolationSlot() {
      return (
        <View>
          <ContentProbe />
          <FlipRegistrar />
        </View>
      );
    };

    const { getByTestId, findByText } = mountChrome();
    await findByText('Event: Test Event');
    await waitFor(() => {
      expect(getByTestId('event-chrome-save').props.accessibilityState?.disabled).toBe(
        true
      );
    });
    const afterMount = Number(getByTestId('slot-content-renders').props.children);

    await act(async () => {
      fireEvent.press(getByTestId('flip-dirty'));
    });

    await waitFor(() => {
      expect(getByTestId('event-chrome-save').props.accessibilityState?.disabled).toBe(
        false
      );
    });
    expect(Number(getByTestId('slot-content-renders').props.children)).toBe(
      afterMount
    );
  });

  it('passes lotteryQueryId into top tabs and navigateEd lottery query', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'EventDetailChrome.tsx'),
      'utf8'
    );
    expect(src).toContain('lotteryQueryId');
    expect(src).toContain(
      'buildEventTopTabs(eventId, selectedDivisionId, hrefLotteryId)'
    );
    expect(src).toContain('withLotteryQuery(pathname, hrefLotteryId)');
    expect(src).toContain(
      'withLotteryQuery(withEdQuery(pathname, id), hrefLotteryId)'
    );
    expect(src).not.toContain(
      'const selectedLotteryId = lotteriesLoaded ? lotteryId : rawLotteryId'
    );
  });
});

