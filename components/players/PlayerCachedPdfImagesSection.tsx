/**
 * Cached PDF avatars of a player: one slot per `is_collecting_points` variant
 * (both always shown) with a Regenerate control each.
 */

import { useCachedPdfAvatarReload } from '@/hooks/useCachedPdfAvatarReload';
import { ApiCachedPdfPlayerImage } from '@/types/api/entities';
import React, { useCallback } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

type Variant = {
  /** Stable numeric key for the reload hook (1 = collecting, 0 = not). */
  key: 1 | 0;
  collecting: boolean;
  label: string;
};

const VARIANTS: Variant[] = [
  { key: 1, collecting: true, label: 'Collecting points' },
  { key: 0, collecting: false, label: 'Not collecting points' },
];

const IMAGE_SIZE = 96;

type Props = {
  playerId: number;
  images?: ApiCachedPdfPlayerImage[] | null;
  /** Called after a successful regenerate (e.g. to refetch the player). */
  onRegenerated?: () => void | Promise<void>;
};

/** The storage path is reused on regenerate, so bust the cache with the row version. */
function versionedUrl(
  url: string | null | undefined,
  version: number | null | undefined
): string | null {
  if (!url) return null;
  if (version == null) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

export default function PlayerCachedPdfImagesSection({
  playerId,
  images,
  onRegenerated,
}: Props) {
  const { spinning, errors, urlFor, reload } = useCachedPdfAvatarReload();

  const regenerate = useCallback(
    async (variant: Variant) => {
      await reload({
        key: variant.key,
        playerId,
        collecting: variant.collecting,
      });
      await onRegenerated?.();
    },
    [onRegenerated, playerId, reload]
  );

  return (
    <View className="mt-6" testID="player-cached-pdf-section">
      <Text className="text-base font-medium text-gray-900 mb-2">
        Cached PDF avatars
      </Text>
      <Text className="text-sm text-gray-600 mb-3">
        Circular avatars generated from the PDF source image, one per
        collecting-points variant.
      </Text>

      <View className="flex-row flex-wrap gap-4">
        {VARIANTS.map(variant => {
          const row = (images ?? []).find(
            image =>
              Boolean(image.player_is_collecting_points) === variant.collecting
          );
          // A just-regenerated URL wins until the refetched row catches up.
          const url = versionedUrl(
            urlFor(variant.key, row?.url),
            row?.updated_at
          );
          const isSpinning = Boolean(spinning[variant.key]);
          const error = errors[variant.key];
          const testId = `player-cached-pdf-${variant.key}`;

          return (
            <View
              key={variant.key}
              testID={testId}
              className="border border-gray-200 rounded-lg p-3 items-center bg-white"
              style={{ minWidth: 140 }}
            >
              <Text className="text-xs font-medium text-gray-700 mb-2">
                {variant.label}
              </Text>
              {url ? (
                <Image
                  testID={`${testId}-image`}
                  source={{ uri: url }}
                  style={{
                    width: IMAGE_SIZE,
                    height: IMAGE_SIZE,
                    borderRadius: IMAGE_SIZE / 2,
                  }}
                />
              ) : (
                <View
                  testID={`${testId}-empty`}
                  className="items-center justify-center bg-gray-100"
                  style={{
                    width: IMAGE_SIZE,
                    height: IMAGE_SIZE,
                    borderRadius: IMAGE_SIZE / 2,
                  }}
                >
                  <Text className="text-xs text-gray-500">Not generated</Text>
                </View>
              )}
              <Pressable
                testID={`${testId}-regenerate`}
                disabled={isSpinning}
                accessibilityState={{ disabled: isSpinning }}
                onPress={() => void regenerate(variant)}
                className="mt-2 px-2 py-1 rounded bg-gray-100 flex-row items-center"
                style={{ opacity: isSpinning ? 0.6 : 1 }}
              >
                {isSpinning ? <ActivityIndicator size="small" /> : null}
                <Text className="text-xs font-medium text-gray-700">
                  {isSpinning
                    ? 'Regenerating…'
                    : url
                      ? 'Regenerate'
                      : 'Generate'}
                </Text>
              </Pressable>
              {error ? (
                <Text
                  testID={`${testId}-error`}
                  className="text-[10px] text-red-600 text-center mt-1 max-w-[140px]"
                >
                  {error}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
