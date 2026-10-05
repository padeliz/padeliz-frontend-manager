/**
 * Framed prize media thumb: image/GIF, paused video preview on web, empty gift.
 */

import { resolvePrizeMedia } from '@/utils/event/lotteryMedia';
import { isWebPlatform } from '@/utils/isWebPlatform';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Image, Platform, View } from 'react-native';

export type LotteryPrizeThumbSize = 'sm' | 'md';

const SIZES: Record<LotteryPrizeThumbSize, number> = {
  sm: 32,
  md: 40,
};

type Props = {
  prize?: unknown;
  size?: LotteryPrizeThumbSize;
  testID?: string;
};

function Frame({
  size,
  children,
  testID,
}: {
  size: number;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      className="rounded bg-gray-50 border border-gray-200 items-center justify-center mr-2 overflow-hidden"
      style={{ width: size, height: size, borderRadius: 6, marginRight: 8 }}
    >
      {children}
    </View>
  );
}

function PausedVideoThumb({
  url,
  size,
  testID,
}: {
  url: string;
  size: number;
  testID?: string;
}) {
  const onMeta = useCallback((e: { currentTarget?: HTMLVideoElement }) => {
    const el = e?.currentTarget;
    if (!el) return;
    try {
      if (el.currentTime < 0.001) {
        el.currentTime = 0.001;
      }
    } catch {
      /* ignore seek errors before ready */
    }
  }, []);

  return (
    <Frame size={size} testID={testID}>
      {React.createElement('video', {
        'data-testid': testID ? `${testID}-video` : 'lottery-prize-thumb-video',
        src: url,
        muted: true,
        preload: 'metadata',
        playsInline: true,
        onLoadedMetadata: onMeta,
        onLoadedData: onMeta,
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        },
      })}
    </Frame>
  );
}

export default function LotteryPrizeThumb({
  prize,
  size = 'md',
  testID = 'lottery-prize-thumb',
}: Props) {
  const px = SIZES[size];
  const media = resolvePrizeMedia(prize ?? null);

  if (!media.url) {
    return (
      <Frame size={px} testID={`${testID}-empty`}>
        <Ionicons name="gift-outline" size={size === 'sm' ? 14 : 18} color="#9ca3af" />
      </Frame>
    );
  }

  if (media.isVideo) {
    if (isWebPlatform() || Platform.OS === 'web') {
      return <PausedVideoThumb url={media.url} size={px} testID={testID} />;
    }
    return (
      <Frame size={px} testID={`${testID}-video-placeholder`}>
        <Ionicons
          name="videocam-outline"
          size={size === 'sm' ? 14 : 18}
          color="#9ca3af"
        />
      </Frame>
    );
  }

  return (
    <Frame size={px} testID={testID}>
      <Image
        source={{ uri: media.url }}
        style={{ width: px, height: px }}
        resizeMode="cover"
      />
    </Frame>
  );
}
