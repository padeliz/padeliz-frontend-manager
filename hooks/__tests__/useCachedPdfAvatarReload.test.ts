import { PlayersApiService } from '@/services/api/playersApi';
import { useCachedPdfAvatarReload } from '@/hooks/useCachedPdfAvatarReload';
import { act, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@/services/api/playersApi', () => {
  const generatePdfAvatar = jest.fn();
  return {
    PlayersApiService: jest.fn().mockImplementation(() => ({
      generatePdfAvatar,
    })),
    __mockGeneratePdfAvatar: generatePdfAvatar,
  };
});

const {
  __mockGeneratePdfAvatar: mockGeneratePdfAvatar,
} = jest.requireMock('@/services/api/playersApi') as {
  __mockGeneratePdfAvatar: jest.Mock;
};

describe('useCachedPdfAvatarReload', () => {
  beforeEach(() => {
    mockGeneratePdfAvatar.mockReset();
  });

  it('urlFor prefers override over base', async () => {
    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/override.png' },
    });
    const { result } = renderHook(() => useCachedPdfAvatarReload());
    expect(result.current.urlFor(1, 'https://base/a.png')).toBe(
      'https://base/a.png'
    );

    await act(async () => {
      await result.current.reload({
        key: 1,
        playerId: 10,
        collecting: true,
      });
    });

    expect(result.current.urlFor(1, 'https://base/a.png')).toBe(
      'https://cdn.example/override.png'
    );
  });

  it('reload calls generatePdfAvatar and sets override', async () => {
    mockGeneratePdfAvatar.mockResolvedValue({
      data: { pdf_avatar_url: 'https://cdn.example/b.png' },
    });

    const { result } = renderHook(() => useCachedPdfAvatarReload());

    await act(async () => {
      await result.current.reload({
        key: 7,
        playerId: 42,
        collecting: true,
      });
    });

    expect(mockGeneratePdfAvatar).toHaveBeenCalledWith(42, true);
    expect(result.current.urlFor(7, null)).toBe('https://cdn.example/b.png');
    expect(result.current.spinning[7]).toBeUndefined();
  });

  it('reload failure sets errors[key]', async () => {
    mockGeneratePdfAvatar.mockRejectedValue(new Error('avatar boom'));

    const { result } = renderHook(() => useCachedPdfAvatarReload());

    await act(async () => {
      await result.current.reload({
        key: 3,
        playerId: 9,
        collecting: false,
      });
    });

    expect(result.current.errors[3]).toBe('avatar boom');
  });

  it('ignores concurrent reload while spinning', async () => {
    let resolveAvatar!: (value: unknown) => void;
    mockGeneratePdfAvatar.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveAvatar = resolve;
        })
    );

    const { result } = renderHook(() => useCachedPdfAvatarReload());

    act(() => {
      void result.current.reload({ key: 1, playerId: 2, collecting: true });
    });

    await waitFor(() => {
      expect(result.current.spinning[1]).toBe(true);
    });

    await act(async () => {
      await result.current.reload({ key: 1, playerId: 2, collecting: true });
    });

    expect(mockGeneratePdfAvatar).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAvatar({ data: { pdf_avatar_url: 'https://cdn.example/done.png' } });
    });

    await waitFor(() => {
      expect(result.current.urlFor(1, null)).toBe('https://cdn.example/done.png');
    });
  });
});
