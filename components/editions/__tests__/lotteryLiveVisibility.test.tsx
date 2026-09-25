import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { Platform } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  PageChromeProvider,
  useRegisterPageActions,
} from '@/components/chrome/PageChromeProvider';
import {
  SubTabBarProvider,
  useSubTabBarTrail,
} from '@/components/layout/SubTabBarProvider';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import LotteryLayout from '@/app/(app)/editions/[id]/lottery/_layout';
import fs from 'fs';
import path from 'path';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockOpen = jest.fn();
const mockConfirmDiscardDirty = jest.fn(async () => true);
const mockCancel = jest.fn();
const mockGetLotteries = jest.fn(async () => ({
  data: [{ id_lottery: 3, name: 'Alpha', display_order: 0 }],
}));

jest.mock('@/utils/softDirtyNav', () => ({
  confirmDiscardDirty: (...args: unknown[]) =>
    mockConfirmDiscardDirty(...args),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  return require('@/testing/expoRouterMock').createExpoRouterMock({
    Slot: () => <View testID="slot" />,
    useLocalSearchParams: () => mockParams,
    useGlobalSearchParams: () => mockParams,
    usePathname: () => mockPathname,
    useRouter: () => ({ push: mockPush, replace: mockReplace }),
  });
});

let mockParams: { id: string; ed?: string; lottery?: string } = { id: '1' };
let mockPathname = '/editions/1/lottery/prizes';

jest.mock('@/services/api/editionDivisionsApi', () => ({
  EditionDivisionsApiService: jest.fn().mockImplementation(() => ({
    getEditionDivisions: jest.fn(async () => ({
      data: [{ id_edition_division: 9, name: 'A' }],
    })),
  })),
}));

jest.mock('@/services/api/editionLotteriesApi', () => ({
  EditionLotteriesApiService: jest.fn().mockImplementation(() => ({
    getLotteries: (...args: unknown[]) => mockGetLotteries(...args),
  })),
}));

function SubTabChrome() {
  return useSubTabBarTrail();
}

function DirtyChromeRegistrar({ isDirty }: { isDirty: boolean }) {
  useRegisterPageActions({
    isDirty,
    cancel: mockCancel,
    canSave: true,
  });
  return null;
}

const layoutSrcPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'app',
  '(app)',
  'editions',
  '[id]',
  'lottery',
  '_layout.tsx'
);

describe('lottery LIVE link visibility', () => {
  let activeClient: ReturnType<typeof createTestQueryClient> | null = null;

  function renderLayout(opts?: { isDirty?: boolean }) {
    activeClient = createTestQueryClient();
    return render(
      <QueryClientProvider client={activeClient}>
        <SubTabBarProvider>
          <SubTabChrome />
          <PageChromeProvider>
            {opts?.isDirty != null ? (
              <DirtyChromeRegistrar isDirty={opts.isDirty} />
            ) : null}
            <LotteryLayout />
          </PageChromeProvider>
        </SubTabBarProvider>
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockReplace.mockReset();
    mockParams = { id: '1' };
    mockPathname = '/editions/1/lottery/prizes';
    mockConfirmDiscardDirty.mockResolvedValue(true);
    mockGetLotteries.mockResolvedValue({
      data: [{ id_lottery: 3, name: 'Alpha', display_order: 0 }],
    });
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

  afterEach(async () => {
    cleanup();
    if (activeClient) {
      await disposeTestQueryClient(activeClient);
      activeClient = null;
    }
  });

  it('stabilizes onBeforeNavigate via actionsRef', () => {
    const src = fs.readFileSync(layoutSrcPath, 'utf8');
    expect(src).toContain('usePageChromeActionsRef');
    expect(src).not.toContain('usePageChrome(');
    expect(src).not.toContain('actionsRef.current = actions');
    expect(src).toContain('openLiveLotteryRef');
    expect(src).toMatch(
      /onBeforeNavigate = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\)/
    );
    expect(src).toMatch(
      /openLiveLottery = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\)/
    );
  });

  it('derives hrefs via lotteryQueryId and never syncs URL on mount', () => {
    const src = fs.readFileSync(layoutSrcPath, 'utf8');
    expect(src).toContain('lotteryQueryId');
    expect(src).toContain(
      'withLotteryQuery(withEdQuery(`${base}${path}`, edId), hrefLotteryId)'
    );
    expect(src).toContain(
      'withLotteryQuery(`/lottery-live/${editionId}`, hrefLotteryId)'
    );
    expect(src).toContain('disabled: liveSelectionId == null');
    expect(src).not.toContain('router.replace');
    expect(src).not.toContain('desiredLotteryParam');
    expect(src).not.toContain('lotterySyncAttemptRef');
    expect(src).not.toMatch(/useEffect\s*\(/);
  });

  it('does not replace on mount for single lottery without ?lottery=', async () => {
    mockParams = { id: '1' };
    renderLayout();
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not replace when clearing would be needed (multi stale)', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [
        { id_lottery: 3, name: 'Alpha', display_order: 0 },
        { id_lottery: 9, name: 'Zebra', display_order: 1 },
      ],
    });
    mockParams = { id: '1', lottery: '99' };
    renderLayout();
    await waitFor(() => expect(mockGetLotteries).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('enables LIVE for single lottery without ?lottery= (derived)', async () => {
    mockParams = { id: '1' };
    const { findByTestId } = renderLayout();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBeFalsy()
    );
  });

  it('puts derived lottery on Rules href for single lottery without URL', async () => {
    mockParams = { id: '1' };
    const { findByTestId } = renderLayout();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBeFalsy()
    );
    fireEvent.press(await findByTestId('edition-tab-Rules'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
    expect(String(mockPush.mock.calls[0][0])).toContain('lottery=3');
  });

  it('does not change LIVE disabled when lotteries settle with valid ?lottery=', async () => {
    mockParams = { id: '1', lottery: '3' };
    const { findByTestId } = renderLayout();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBeFalsy()
    );
  });

  it('shows LIVE disabled when multi and ?lottery= is missing', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [
        { id_lottery: 3, name: 'Alpha', display_order: 0 },
        { id_lottery: 9, name: 'Zebra', display_order: 1 },
      ],
    });
    mockParams = { id: '1' };
    const { findByTestId, findByText } = renderLayout();
    expect(await findByText('Prizes')).toBeTruthy();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBe(true)
    );
    fireEvent.press(chip);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('shows LIVE disabled for foreign lottery id after multi list loads', async () => {
    mockGetLotteries.mockResolvedValue({
      data: [
        { id_lottery: 3, name: 'Alpha', display_order: 0 },
        { id_lottery: 9, name: 'Zebra', display_order: 1 },
      ],
    });
    mockParams = { id: '1', lottery: '99' };
    const { findByTestId } = renderLayout();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBe(true)
    );
  });

  it('preserves ?ed= on lottery subtab hrefs', async () => {
    mockParams = { id: '1', ed: '9', lottery: '3' };
    const { findByTestId } = renderLayout();
    expect(await findByTestId('edition-tab-Rules')).toBeTruthy();
  });

  it('pushes Rules href with ?lottery= when lottery is selected', async () => {
    mockParams = { id: '1', lottery: '3' };
    const { findByTestId } = renderLayout();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBeFalsy()
    );
    fireEvent.press(await findByTestId('edition-tab-Rules'));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled();
    });
    const href = String(mockPush.mock.calls[0][0]);
    expect(href).toContain('lottery=3');
  });

  it('opens LIVE lottery in a new browser window when lottery is selected', async () => {
    mockParams = { id: '1', lottery: '3' };
    const { findByTestId } = renderLayout();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBeFalsy()
    );
    await waitFor(() => {
      fireEvent.press(chip);
      expect(mockOpen).toHaveBeenCalledWith(
        'http://localhost/lottery-live/1?lottery=3',
        '_blank',
        'noopener,noreferrer'
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('passes selected lottery on LIVE URL', async () => {
    mockParams = { id: '1', lottery: '3' };
    const { findByTestId } = renderLayout();
    const chip = await findByTestId('open-live-lottery');
    await waitFor(() =>
      expect(chip.props.accessibilityState?.disabled).toBeFalsy()
    );
    await waitFor(() => {
      fireEvent.press(chip);
      expect(mockOpen).toHaveBeenCalledWith(
        'http://localhost/lottery-live/1?lottery=3',
        '_blank',
        'noopener,noreferrer'
      );
    });
  });

  it('blocks href tab navigation when dirty discard is cancelled', async () => {
    mockParams = { id: '1', lottery: '3' };
    mockConfirmDiscardDirty.mockResolvedValue(false);
    const { findByTestId } = renderLayout({ isDirty: true });
    fireEvent.press(await findByTestId('edition-tab-Rules'));
    await waitFor(() => {
      expect(mockConfirmDiscardDirty).toHaveBeenCalled();
    });
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockCancel).not.toHaveBeenCalled();
  });

  it('allows href tab navigation after dirty discard confirms', async () => {
    mockParams = { id: '1', lottery: '3' };
    mockConfirmDiscardDirty.mockResolvedValue(true);
    const { findByTestId } = renderLayout({ isDirty: true });
    fireEvent.press(await findByTestId('edition-tab-Rules'));
    await waitFor(() => {
      expect(mockConfirmDiscardDirty).toHaveBeenCalled();
      expect(mockCancel).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });
  });
});
