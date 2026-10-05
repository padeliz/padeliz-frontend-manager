import LotteryPrizeThumb from '@/components/events/lottery/LotteryPrizeThumb';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

describe('LotteryPrizeThumb', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => originalOs,
    });
  });

  it('renders framed image thumb from Storage url, not bare media_path', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    const { getByTestId, queryByTestId } = render(
      <LotteryPrizeThumb
        prize={{
          media_path: 'prizes/1/media/x.png',
          url: '/storage/prizes/1/media/x.png',
        }}
        size="md"
      />
    );
    expect(queryByTestId('lottery-prize-thumb-empty')).toBeNull();
    const thumb = getByTestId('lottery-prize-thumb');
    const img = thumb.find(
      (n: { props?: { source?: { uri?: string } } }) =>
        n?.props?.source?.uri != null
    );
    expect(img?.props?.source?.uri).toBe(
      'http://localhost:8000/storage/prizes/1/media/x.png'
    );
  });

  it('renders paused video on web for mp4', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'web',
    });
    const { queryByTestId, UNSAFE_getByProps } = render(
      <LotteryPrizeThumb
        prize={{ url: 'https://example.com/prize.mp4' }}
        size="md"
      />
    );
    expect(queryByTestId('lottery-prize-thumb-empty')).toBeNull();
    const video = UNSAFE_getByProps({
      'data-testid': 'lottery-prize-thumb-video',
    });
    expect(video.props.testID).toBeUndefined();
    expect(video.props.src).toBe('https://example.com/prize.mp4');
    expect(video.props.muted).toBe(true);
    expect(video.props.autoPlay).toBeUndefined();
    expect(video.props.preload).toBe('metadata');
  });

  it('uses data-testid on raw video createElement, not testID', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'LotteryPrizeThumb.tsx'),
      'utf8'
    );
    expect(src).toMatch(
      /createElement\(\s*['"]video['"][\s\S]*?['"]data-testid['"]\s*:/
    );
    expect(src).not.toMatch(
      /createElement\(\s*['"]video['"][\s\S]*?\btestID\s*:/
    );
  });

  it('renders gift empty thumb when url is null', () => {
    const { getByTestId } = render(
      <LotteryPrizeThumb prize={{ url: null }} size="md" />
    );
    expect(getByTestId('lottery-prize-thumb-empty')).toBeTruthy();
  });

  it('renders videocam placeholder for video on native', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => 'ios',
    });
    const { getByTestId, queryByTestId } = render(
      <LotteryPrizeThumb
        prize={{ url: 'https://example.com/prize.mp4' }}
        size="sm"
        testID="lottery-rule-prize-thumb"
      />
    );
    expect(queryByTestId('lottery-rule-prize-thumb-empty')).toBeNull();
    expect(getByTestId('lottery-rule-prize-thumb-video-placeholder')).toBeTruthy();
  });
});
