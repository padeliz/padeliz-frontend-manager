/**
 * @jest-environment jsdom
 */
import PlayerProfileImagesPanel from '@/components/players/PlayerProfileImagesPanel';
import {
  createTestQueryClient,
  disposeTestQueryClient,
} from '@/testing/createTestQueryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGetPlayer = jest.fn();
const mockGeneratePdfAvatar = jest.fn();

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    getPlayer: (...args: unknown[]) => mockGetPlayer(...args),
    generatePdfAvatar: (...args: unknown[]) => mockGeneratePdfAvatar(...args),
    uploadProfileImage: jest.fn(),
    deleteProfileImage: jest.fn(),
    setProfileImagePdfPrimary: jest.fn(),
  })),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({ showSuccess: jest.fn(), showError: jest.fn() }),
}));

jest.mock('@/components/players/ImageFilesPicker', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: () => <View testID="image-picker" /> };
});

function player(cachedImages: unknown[]) {
  return {
    data: {
      id_player: 42,
      name: 'Ace Player',
      uploaded_profile_images: [
        { id: 1, url: 'https://cdn.example/p1.png', is_pdf_primary: true },
      ],
      cached_pdf_images: cachedImages,
    },
  };
}

describe('PlayerProfileImagesPanel cached PDF section', () => {
  let client: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    client = createTestQueryClient();
  });

  afterEach(async () => {
    await disposeTestQueryClient(client);
  });

  function renderPanel() {
    return render(
      <QueryClientProvider client={client}>
        <PlayerProfileImagesPanel playerId={42} />
      </QueryClientProvider>
    );
  }

  it('renders the cached PDF section below the uploads for both variants', async () => {
    mockGetPlayer.mockResolvedValue(
      player([
        {
          id_cached_pdf_player_image: 1,
          player_is_collecting_points: true,
          url: 'https://cdn.example/true.png',
          updated_at: 1,
        },
      ])
    );
    const { findByTestId, getByTestId } = renderPanel();

    expect(await findByTestId('player-cached-pdf-section')).toBeTruthy();
    expect(getByTestId('player-profile-image-1')).toBeTruthy();
    expect(getByTestId('player-cached-pdf-1-image')).toBeTruthy();
    expect(getByTestId('player-cached-pdf-0-empty')).toBeTruthy();
  });

  it('regenerates a variant through playersApi.generatePdfAvatar and refetches the player', async () => {
    mockGetPlayer.mockResolvedValue(player([]));
    mockGeneratePdfAvatar.mockResolvedValue({
      success: true,
      data: { pdf_avatar_url: 'https://cdn.example/new-false.png' },
    });
    const { findByTestId } = renderPanel();

    fireEvent.press(await findByTestId('player-cached-pdf-0-regenerate'));

    await waitFor(() =>
      expect(mockGeneratePdfAvatar).toHaveBeenCalledWith(42, false)
    );
    await waitFor(() => expect(mockGetPlayer).toHaveBeenCalledTimes(2));
    expect(
      (await findByTestId('player-cached-pdf-0-image')).props.source.uri
    ).toContain('https://cdn.example/new-false.png');
  });
});
