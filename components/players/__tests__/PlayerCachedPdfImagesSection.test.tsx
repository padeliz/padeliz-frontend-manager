/**
 * @jest-environment jsdom
 */
import PlayerCachedPdfImagesSection from '@/components/players/PlayerCachedPdfImagesSection';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockGeneratePdfAvatar = jest.fn();

jest.mock('@/services/api/playersApi', () => ({
  PlayersApiService: jest.fn().mockImplementation(() => ({
    generatePdfAvatar: (...args: unknown[]) => mockGeneratePdfAvatar(...args),
  })),
}));

const bothImages = [
  {
    id_cached_pdf_player_image: 1,
    player_is_collecting_points: true,
    url: 'https://cdn.example/true.png',
    updated_at: 100,
  },
  {
    id_cached_pdf_player_image: 2,
    player_is_collecting_points: false,
    url: 'https://cdn.example/false.png',
    updated_at: 200,
  },
];

describe('PlayerCachedPdfImagesSection', () => {
  beforeEach(() => {
    mockGeneratePdfAvatar.mockReset();
  });

  it('lists both is_collecting_points variants with their cached image', () => {
    const { getByTestId, getByText } = render(
      <PlayerCachedPdfImagesSection playerId={42} images={bothImages} />
    );

    expect(getByText('Collecting points')).toBeTruthy();
    expect(getByText('Not collecting points')).toBeTruthy();
    expect(getByTestId('player-cached-pdf-1-image').props.source.uri).toBe(
      'https://cdn.example/true.png?v=100'
    );
    expect(getByTestId('player-cached-pdf-0-image').props.source.uri).toBe(
      'https://cdn.example/false.png?v=200'
    );
    expect(getByTestId('player-cached-pdf-1-regenerate')).toBeTruthy();
    expect(getByTestId('player-cached-pdf-0-regenerate')).toBeTruthy();
  });

  it('still shows a slot with a Generate control for a missing variant', () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <PlayerCachedPdfImagesSection playerId={42} images={[bothImages[0]]} />
    );

    expect(getByTestId('player-cached-pdf-1-image')).toBeTruthy();
    expect(queryByTestId('player-cached-pdf-0-image')).toBeNull();
    expect(getByTestId('player-cached-pdf-0-empty')).toBeTruthy();
    expect(getByText('Generate')).toBeTruthy();
  });

  it('renders both empty slots when nothing is cached yet', () => {
    const { getByTestId } = render(<PlayerCachedPdfImagesSection playerId={42} />);

    expect(getByTestId('player-cached-pdf-1-empty')).toBeTruthy();
    expect(getByTestId('player-cached-pdf-0-empty')).toBeTruthy();
  });

  it.each([
    ['1', true],
    ['0', false],
  ])(
    'regenerates variant %s with is_collecting_points=%s and updates the image',
    async (key, collecting) => {
      mockGeneratePdfAvatar.mockResolvedValue({
        success: true,
        data: { pdf_avatar_url: 'https://cdn.example/fresh.png' },
      });
      const onRegenerated = jest.fn();
      const { getByTestId } = render(
        <PlayerCachedPdfImagesSection
          playerId={42}
          images={bothImages}
          onRegenerated={onRegenerated}
        />
      );

      fireEvent.press(getByTestId(`player-cached-pdf-${key}-regenerate`));

      await waitFor(() => expect(onRegenerated).toHaveBeenCalledTimes(1));
      expect(mockGeneratePdfAvatar).toHaveBeenCalledTimes(1);
      expect(mockGeneratePdfAvatar).toHaveBeenCalledWith(42, collecting);
      expect(
        getByTestId(`player-cached-pdf-${key}-image`).props.source.uri
      ).toContain('https://cdn.example/fresh.png');
    }
  );

  it('shows the error from a failed regenerate and keeps the old image', async () => {
    mockGeneratePdfAvatar.mockRejectedValue(new Error('No source photo'));
    const { getByTestId, findByTestId } = render(
      <PlayerCachedPdfImagesSection playerId={42} images={bothImages} />
    );

    fireEvent.press(getByTestId('player-cached-pdf-1-regenerate'));

    const error = await findByTestId('player-cached-pdf-1-error');
    expect(error).toHaveTextContent('No source photo');
    expect(getByTestId('player-cached-pdf-1-image').props.source.uri).toBe(
      'https://cdn.example/true.png?v=100'
    );
  });
});
