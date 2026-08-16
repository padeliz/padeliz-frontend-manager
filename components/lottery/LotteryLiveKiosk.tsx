/**
 * Full-screen MiniTour-style lottery live kiosk (edition-scoped).
 */

import { resolveBoardAsset } from '@/components/editions/editionLotteryUtils';
import { queryKeys } from '@/lib/queryClient';
import { EditionLotteriesApiService } from '@/services/api/editionLotteriesApi';
import { EditionsApiService } from '@/services/api/editionsApi';
import { lotteryLiveApi } from '@/services/api/lotteryLiveApi';
import { LotteryLiveState, LotteryLucky } from '@/types/api/edition';
import {
  resolvePrizeMedia,
  shouldAutoAnnounce,
} from '@/utils/edition/lotteryMedia';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const lotteriesApi = new EditionLotteriesApiService();
const editionsApi = new EditionsApiService();

type Props = {
  editionId: number;
};

function getFirstTextSize(text: string, hasImage: boolean): number {
  const size = 100 - text.length * (hasImage ? 1.1 : 0.9);
  return Math.max(20, Math.floor(size));
}

function getSecondTextSize(firstText: string, secondText: string): number {
  const size = Math.min(
    getFirstTextSize(firstText, false),
    100 - secondText.length * 1.2
  );
  return Math.max(28, Math.floor(size * 0.9));
}

function formatCountdown(totalSeconds: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  return { days, hours, minutes, seconds };
}

function formatCountdownText(countdown: {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}): string {
  const days =
    countdown.days > 0 ? `${String(countdown.days).padStart(2, '0')}:` : '';
  const hours =
    countdown.hours > 0 || countdown.days > 0
      ? `${String(countdown.hours).padStart(2, '0')}:`
      : '';
  return `${days}${hours}${String(countdown.minutes).padStart(2, '0')}:${String(
    countdown.seconds
  ).padStart(2, '0')}`;
}

function playerInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PrizeBlock({ prize }: { prize: LotteryLucky['prize'] }) {
  if (!prize) return null;
  const media = resolvePrizeMedia(prize);
  const template = String(prize.template || 'IMAGE_MIDDLE').toUpperCase();
  const hasImage = !!media.url;
  const box1 = String(prize.box_1_text || '');
  const box2 = String(prize.box_2_text || '');

  const mediaEl =
    media.url &&
    (media.isVideo && Platform.OS === 'web'
      ? React.createElement('video', {
          testID: 'lottery-live-prize-media',
          src: media.url,
          autoPlay: true,
          loop: true,
          muted: true,
          playsInline: true,
          style: {
            maxHeight: '35vh',
            width: '90%',
            objectFit: 'contain',
          },
        })
      : Platform.OS === 'web'
        ? React.createElement('img', {
            testID: 'lottery-live-prize-media',
            src: media.url,
            alt: '',
            style: {
              maxHeight: '35vh',
              width: '90%',
              objectFit: 'contain',
            },
          })
        : (
            <Image
              testID="lottery-live-prize-media"
              source={{ uri: media.url }}
              style={{
                maxHeight: 280,
                width: '90%',
                resizeMode: 'contain',
                alignSelf: 'center',
              }}
            />
          ));

  const box1El = box1 ? (
    <View
      style={{
        backgroundColor: prize.box_1_bg_color || '#111',
        padding: 12,
        borderRadius: 8,
        alignSelf: 'center',
      }}
    >
      <Text
        style={{
          color: prize.box_1_text_color || '#fff',
          fontSize: getFirstTextSize(box1, hasImage),
          fontFamily: 'CormorantGaramond, serif',
          textAlign: 'center',
        }}
      >
        {box1}
      </Text>
    </View>
  ) : null;

  const box2El = box2 ? (
    <View
      style={{
        backgroundColor: prize.box_2_bg_color || '#222',
        padding: 12,
        borderRadius: 8,
        alignSelf: 'center',
        marginTop: 12,
      }}
    >
      <Text
        style={{
          color: prize.box_2_text_color || '#fff',
          fontSize: getSecondTextSize(box1, box2),
          fontFamily: 'CormorantGaramond, serif',
          textAlign: 'center',
        }}
      >
        {box2}
      </Text>
    </View>
  ) : null;

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      {template === 'IMAGE_TOP' && mediaEl}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {template === 'IMAGE_LEFT' && mediaEl}
        {box1El}
        {template === 'IMAGE_RIGHT' && mediaEl}
      </View>
      {template === 'IMAGE_MIDDLE' && mediaEl}
      {box2El}
      {template === 'IMAGE_BOTTOM' && mediaEl}
      {!['IMAGE_LEFT', 'IMAGE_RIGHT', 'IMAGE_TOP', 'IMAGE_MIDDLE', 'IMAGE_BOTTOM'].includes(
        template
      ) && (
        <>
          {mediaEl}
          {box1El}
          {box2El}
        </>
      )}
    </View>
  );
}

function LuckyAvatar({
  lucky,
  large,
}: {
  lucky: LotteryLucky;
  large?: boolean;
}) {
  const color = lucky.division?.color || '#4b5563';
  const avatar = lucky.player?.avatar_url;
  const size = large ? 180 : 96;
  return (
    <View style={{ alignItems: 'center' }}>
      {lucky.division?.division_title ? (
        <Text
          style={{
            backgroundColor: color,
            color: '#fff',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 8,
            fontSize: large ? 18 : 14,
          }}
        >
          {lucky.division.division_title}
        </Text>
      ) : null}
      <View
        style={{
          width: size + 10,
          height: size + 10,
          borderRadius: (size + 10) / 2,
          borderWidth: 3,
          borderColor: color,
          backgroundColor: color,
          padding: 5,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
            }}
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: '#111',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: large ? 48 : 28 }}>
              {playerInitials(lucky.player?.name)}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          color: '#fff',
          marginTop: 8,
          fontSize: large ? 28 : 16,
          fontFamily: 'Nunito, sans-serif',
        }}
      >
        {lucky.player?.name || '—'}
      </Text>
      {large && lucky.division?.court ? (
        <Text
          style={{
            backgroundColor: '#fff',
            color: '#000',
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 10,
            overflow: 'hidden',
            fontSize: 18,
          }}
        >
          {lucky.division.court}
        </Text>
      ) : null}
    </View>
  );
}

function InProgressLayout({
  lucky,
  showTimer,
  timerText,
  finalized,
}: {
  lucky: LotteryLucky;
  showTimer: boolean;
  timerText: string;
  finalized: boolean;
}) {
  const isWeb = Platform.OS === 'web';
  return (
    <View
      testID="lottery-live-in-progress"
      style={{
        flexDirection: isWeb ? ('row' as any) : 'column',
        flexWrap: isWeb ? 'nowrap' : 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        paddingHorizontal: 16,
        width: '100%',
      }}
    >
      <View
        style={{
          flex: 1,
          minWidth: 260,
          maxWidth: 560,
          alignItems: 'center',
        }}
      >
        {Number(lucky.prize_quantity) > 1 ? (
          <Text style={styles.qty}>
            {lucky.prize_index ?? 1} / {lucky.prize_quantity}
          </Text>
        ) : null}
        <PrizeBlock prize={lucky.prize} />
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 260,
          maxWidth: 560,
          alignItems: 'center',
          gap: 16,
        }}
      >
        {showTimer ? (
          <Text
            testID="lottery-live-timer"
            style={styles.timer}
            numberOfLines={1}
          >
            {timerText}
          </Text>
        ) : (
          <>
            <LuckyAvatar lucky={lucky} large />
            {finalized ? (
              <Text style={styles.readOnly}>Edition finalized — view only</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

export default function LotteryLiveKiosk({ editionId }: Props) {
  const [live, setLive] = useState<LotteryLiveState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const announcedIds = useRef<Set<number>>(new Set());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const editionQuery = useQuery({
    queryKey: queryKeys.edition(editionId),
    queryFn: async () => {
      const res = await editionsApi.getEdition(editionId);
      return res.data;
    },
    enabled: Number.isFinite(editionId),
  });
  const finalized = !!(editionQuery.data as any)?.finalized_at;

  const lotteryIdQuery = useQuery({
    queryKey: queryKeys.editionLotteries(editionId),
    queryFn: async () => {
      const res = await lotteriesApi.getLotteries({
        per_page: 20,
        filters: { edition_id: editionId },
      });
      return res.data || [];
    },
    enabled: Number.isFinite(editionId),
  });
  const lotteryId = lotteryIdQuery.data?.[0]?.id_lottery ?? null;

  const refreshLive = useCallback(async () => {
    if (!lotteryId) return;
    try {
      const res = await lotteryLiveApi.live(lotteryId);
      let data = res.data;
      const lucky = data.lucky;
      if (
        !finalized &&
        lucky?.id_lucky != null &&
        shouldAutoAnnounce(lucky) &&
        !announcedIds.current.has(lucky.id_lucky)
      ) {
        announcedIds.current.add(lucky.id_lucky);
        try {
          const announced = await lotteryLiveApi.announce(
            lotteryId,
            lucky.id_lucky
          );
          data = announced.data;
        } catch (e: any) {
          announcedIds.current.delete(lucky.id_lucky);
          setError(e?.message || 'Auto-announce failed');
        }
      }
      setLive(data);
      setSecondsLeft(Number(data.lucky?.seconds_left ?? 0));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Live poll failed');
    }
  }, [finalized, lotteryId]);

  useEffect(() => {
    void refreshLive();
  }, [refreshLive]);

  const lotteryFinished =
    live != null &&
    (live.status === 'finished' || live.lucky == null);

  useEffect(() => {
    if (!lotteryId || lotteryFinished) return;
    const id = setInterval(() => void refreshLive(), 2500);
    return () => clearInterval(id);
  }, [lotteryId, lotteryFinished, refreshLive]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!live?.lucky || live.status === 'finished') return;
    tickRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 0) return 0;
        const next = prev - 1;
        if (next <= 0) {
          void refreshLive();
        }
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [live?.lucky?.id_lucky, live?.status, refreshLive]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'lottery-live-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Nunito:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap';
    document.head.appendChild(link);
  }, []);

  const bgUrl = resolveBoardAsset(live?.background);
  const logoUrl = resolveBoardAsset(live?.logo);
  const editionName =
    live?.edition?.name || (editionQuery.data as any)?.name || `Edition ${editionId}`;
  const lucky = live?.lucky;
  const showTimer = !!lucky && secondsLeft > 0;
  const showReveal = !!lucky && secondsLeft <= 0;
  const finished = live?.status === 'finished' || (!lucky && !!live);
  const inProgress = showTimer || showReveal;

  const countdown = useMemo(() => formatCountdown(secondsLeft), [secondsLeft]);
  const timerText = useMemo(() => formatCountdownText(countdown), [countdown]);

  const content = (
    <View style={styles.overlay}>
      <View testID="lottery-live-header" style={styles.header}>
        {logoUrl ? (
          <Image
            source={{ uri: logoUrl }}
            style={{ width: '60%', maxWidth: 480, height: 80, resizeMode: 'contain' }}
          />
        ) : (
          <Text style={styles.logoFallback}>ARSH Padel MiniTour</Text>
        )}
        <Text testID="lottery-live-edition-title" style={styles.editionTitle}>
          {editionName} Lottery
        </Text>
      </View>

      <View style={styles.body}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!live && (lotteryIdQuery.isLoading || !lotteryId) ? (
          <ActivityIndicator color="#fff" />
        ) : finished && !lucky ? (
          <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 16,
              }}
            >
              {(live?.accepted || []).map(a => (
                <LuckyAvatar key={a.id_lucky} lucky={a} />
              ))}
            </View>
            <Text style={styles.finishedText}>
              Congratulations to the lucky ones!
            </Text>
            {live?.next_edition?.name ? (
              <Text style={styles.finishedText}>
                See you at the next edition: {live.next_edition.name}
                {live.next_edition.date
                  ? ` on ${live.next_edition.date}`
                  : ''}{' '}
                💚
              </Text>
            ) : (
              <Text style={styles.finishedText}>
                See you at the next edition 💚
              </Text>
            )}
          </View>
        ) : inProgress && lucky ? (
          <InProgressLayout
            lucky={lucky}
            showTimer={showTimer}
            timerText={timerText}
            finalized={finalized}
          />
        ) : (
          <ActivityIndicator color="#fff" />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {bgUrl ? (
        <ImageBackground source={{ uri: bgUrl }} style={styles.root} resizeMode="cover">
          {content}
        </ImageBackground>
      ) : (
        <View style={[styles.root, { backgroundColor: '#111' }]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: '100%' as any },
  overlay: {
    flex: 1,
    backgroundColor: '#00000090',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 24,
  },
  header: { alignItems: 'center', marginBottom: 24, width: '100%' },
  body: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallback: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'OpenSans, sans-serif',
  },
  editionTitle: {
    color: '#fff',
    fontSize: 22,
    marginTop: 8,
    fontFamily: 'OpenSans, sans-serif',
    textAlign: 'center',
  },
  timer: {
    color: '#fff',
    fontSize: Platform.OS === 'web' ? 72 : 48,
    fontFamily: 'Nunito, sans-serif',
    fontWeight: '700',
    maxWidth: '100%',
    textAlign: 'center',
  },
  qty: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 24,
    fontFamily: 'CormorantGaramond, serif',
  },
  finishedText: {
    color: '#fff',
    fontSize: 28,
    textAlign: 'center',
    fontFamily: 'Nunito, sans-serif',
  },
  readOnly: { color: '#fbbf24', marginTop: 8 },
  error: {
    color: '#fecaca',
    backgroundColor: '#7f1d1d',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
});
