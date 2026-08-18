import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageChromeProvider } from '@/components/chrome/PageChromeProvider';
import LotteryLayout from '@/app/(app)/editions/[id]/lottery/_layout';

const mockPush = jest.fn();
const mockOpen = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Slot: () => <View testID="slot" />,
    useLocalSearchParams: () => mockParams,
    useGlobalSearchParams: () => mockParams,
    usePathname: () => '/editions/1/lottery/prizes',
    useRouter: () => ({ push: mockPush }),
  };
});

let mockParams: { id: string; ed?: string; lottery?: string } = { id: '1' };

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: jest.fn(async () => ({
      data: [{ id_edition_division: 9, name: 'A' }],
    })),
  })),
}));

function renderLayout() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PageChromeProvider>
        <LotteryLayout />
      </PageChromeProvider>
    </QueryClientProvider>
  );
}

describe('lottery LIVE link visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    (global as any).window = {
      ...(global as any).window,
      open: mockOpen,
      location: { origin: 'http://localhost' },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('shows LIVE in tab strip under General', async () => {
    mockParams = { id: '1' };
    const { findByTestId, findByText } = renderLayout();
    expect(await findByText('Prizes')).toBeTruthy();
    expect(await findByTestId('open-live-lottery')).toBeTruthy();
  });

  it('shows LIVE in tab strip when ED selected', async () => {
    mockParams = { id: '1', ed: '9' };
    const { findByTestId, findByText } = renderLayout();
    expect(await findByText('Prizes')).toBeTruthy();
    expect(await findByTestId('open-live-lottery')).toBeTruthy();
  });

  it('opens LIVE lottery in a new browser window on web', async () => {
    mockParams = { id: '1' };
    const { findByTestId } = renderLayout();
    fireEvent.press(await findByTestId('open-live-lottery'));
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost/lottery-live/1',
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('passes selected lottery on LIVE URL', async () => {
    mockParams = { id: '1', lottery: '3' };
    const { findByTestId } = renderLayout();
    fireEvent.press(await findByTestId('open-live-lottery'));
    expect(mockOpen).toHaveBeenCalledWith(
      'http://localhost/lottery-live/1?lottery=3',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
