import { useActionButtonStatus } from '@/hooks/useActionButtonStatus';
import { act, renderHook } from '@testing-library/react-native';

const mockPlaySuccess = jest.fn(async () => undefined);
const mockPlayError = jest.fn(async () => undefined);

jest.mock('@/lib/actionButtonFeedback', () => ({
  playSuccess: (...args: unknown[]) => mockPlaySuccess(...args),
  playError: (...args: unknown[]) => mockPlayError(...args),
}));

describe('useActionButtonStatus', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs to success and persists without successHoldMs', async () => {
    const { result } = renderHook(() => useActionButtonStatus());

    let release!: () => void;
    const gate = new Promise<void>(r => {
      release = r;
    });

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run(async () => gate);
    });
    expect(result.current.status).toBe('pending');

    await act(async () => {
      release();
      await runPromise;
    });

    expect(result.current.status).toBe('success');
    expect(result.current.errorMessage).toBeNull();
    expect(mockPlaySuccess).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.status).toBe('success');
  });

  it('auto-resets after successHoldMs', async () => {
    const { result } = renderHook(() =>
      useActionButtonStatus({ successHoldMs: 2000 })
    );

    await act(async () => {
      await result.current.run(async () => undefined);
    });
    expect(result.current.status).toBe('success');

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe('idle');
  });

  it('sets error from thrown Error and persists', async () => {
    const { result } = renderHook(() => useActionButtonStatus());

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('Nope');
      });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('Nope');
    expect(mockPlayError).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.status).toBe('error');
  });

  it('sets errorMessage from thrown string', async () => {
    const { result } = renderHook(() => useActionButtonStatus());

    await act(async () => {
      await result.current.run(async () => {
        throw 'string-fail';
      });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('string-fail');
  });

  it('ignores stale resolve when a newer run is in flight', async () => {
    const { result } = renderHook(() =>
      useActionButtonStatus({ auditoryFeedback: true })
    );

    let resolveFirst!: () => void;
    const first = new Promise<void>(r => {
      resolveFirst = r;
    });

    let resolveSecond!: () => void;
    const second = new Promise<void>(r => {
      resolveSecond = r;
    });

    await act(async () => {
      void result.current.run(async () => first);
    });
    expect(result.current.status).toBe('pending');

    await act(async () => {
      void result.current.run(async () => second);
    });

    await act(async () => {
      resolveFirst();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('pending');
    expect(mockPlaySuccess).not.toHaveBeenCalled();

    await act(async () => {
      resolveSecond();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('success');
    expect(mockPlaySuccess).toHaveBeenCalledTimes(1);
  });

  it('auditoryFeedback true plays success and error helpers', async () => {
    const { result } = renderHook(() =>
      useActionButtonStatus({ auditoryFeedback: true })
    );

    await act(async () => {
      await result.current.run(async () => undefined);
    });
    expect(mockPlaySuccess).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('fail');
      });
    });
    expect(mockPlayError).toHaveBeenCalledTimes(1);
  });

  it('resetKey first mount does not reset; change clears status', async () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useActionButtonStatus({ resetKey: key }),
      { initialProps: { key: 'a' } }
    );

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('sticky');
      });
    });
    expect(result.current.status).toBe('error');

    rerender({ key: 'a' });
    expect(result.current.status).toBe('error');

    rerender({ key: 'b' });
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
  });

  it('reset returns to idle and clears errorMessage', async () => {
    const { result } = renderHook(() => useActionButtonStatus());

    await act(async () => {
      await result.current.run(async () => {
        throw new Error('x');
      });
    });
    expect(result.current.status).toBe('error');

    act(() => {
      result.current.reset();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
  });

  it('clears success hold timer on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useActionButtonStatus({ successHoldMs: 2000 })
    );

    await act(async () => {
      await result.current.run(async () => undefined);
    });
    expect(result.current.status).toBe('success');

    unmount();
    act(() => {
      jest.advanceTimersByTime(2000);
    });
  });
});
