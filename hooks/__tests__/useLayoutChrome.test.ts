import { renderHook, act } from '@testing-library/react-native';
import { useLayoutChrome } from '@/hooks/useLayoutChrome';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();

let mockPathname = '/challenges/kotc/1';
let mockGlobalParams: Record<string, string | string[] | undefined> = {};
let mockLocalParams: Record<string, string | string[] | undefined> = {
  sessionId: '1',
};

jest.mock('expo-router', () =>
  require('@/testing/expoRouterMock').createExpoRouterMock({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
  useGlobalSearchParams: () => mockGlobalParams,
  useLocalSearchParams: () => mockLocalParams,
})
);

describe('useLayoutChrome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/challenges/kotc/1';
    mockGlobalParams = {};
    mockLocalParams = { sessionId: '1' };
    Object.defineProperty(window, 'history', {
      configurable: true,
      value: { length: 2 },
    });
  });

  it('isFullscreen is true when fs=1', () => {
    mockGlobalParams = { fs: '1' };
    const { result } = renderHook(() => useLayoutChrome());
    expect(result.current.isFullscreen).toBe(true);
  });

  it('enterFullscreen pushes href with fs=1', () => {
    mockGlobalParams = { ed: '2' };
    mockLocalParams = { sessionId: '1' };
    const { result } = renderHook(() => useLayoutChrome());

    act(() => {
      result.current.enterFullscreen();
    });

    expect(mockPush).toHaveBeenCalledWith(
      '/challenges/kotc/1?ed=2&sessionId=1&fs=1'
    );
  });

  it('exitFullscreen calls router.back when history allows', () => {
    const { result } = renderHook(() => useLayoutChrome());

    act(() => {
      result.current.exitFullscreen();
    });

    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
