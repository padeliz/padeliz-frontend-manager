/**
 * Mutation outcome feedback: short sound + native haptic.
 * Preference (default ON) gates both. Failures never throw to callers.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const AUDITORY_FEEDBACK_PREF_KEY = 'actionButton.auditoryFeedback';

type AudioPlayerLike = {
  play: () => void;
  seekTo: (seconds: number) => Promise<void> | void;
};

let audioModeReady: Promise<void> | null = null;
let successPlayer: AudioPlayerLike | null = null;
let errorPlayer: AudioPlayerLike | null = null;

async function isFeedbackEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(AUDITORY_FEEDBACK_PREF_KEY);
    if (raw == null) return true;
    return raw !== 'false' && raw !== '0';
  } catch {
    return true;
  }
}

async function ensureAudioMode(): Promise<void> {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({
      playsInSilentMode: false,
    }).catch(() => {
      // Soft-fail: playback may still work with defaults.
    });
  }
  await audioModeReady;
}

function getSuccessPlayer(): AudioPlayerLike {
  if (!successPlayer) {
    successPlayer = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/assets/sounds/action-success.wav')
    ) as AudioPlayerLike;
  }
  return successPlayer;
}

function getErrorPlayer(): AudioPlayerLike {
  if (!errorPlayer) {
    errorPlayer = createAudioPlayer(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/assets/sounds/action-error.wav')
    ) as AudioPlayerLike;
  }
  return errorPlayer;
}

async function playSound(kind: 'success' | 'error'): Promise<void> {
  await ensureAudioMode();
  const player = kind === 'success' ? getSuccessPlayer() : getErrorPlayer();
  try {
    await Promise.resolve(player.seekTo(0));
  } catch {
    // ignore seek failures
  }
  player.play();
}

async function playHaptic(kind: 'success' | 'error'): Promise<void> {
  if (Platform.OS === 'web') return;
  if (kind === 'success') {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

async function playOutcome(kind: 'success' | 'error'): Promise<void> {
  try {
    if (!(await isFeedbackEnabled())) return;
  } catch {
    return;
  }

  try {
    await playSound(kind);
  } catch {
    // quiet no-op
  }

  try {
    await playHaptic(kind);
  } catch {
    // quiet no-op
  }
}

export async function playSuccess(): Promise<void> {
  await playOutcome('success');
}

export async function playError(): Promise<void> {
  await playOutcome('error');
}

/** Test-only: clear cached players / audio mode promise. */
export function __resetActionButtonFeedbackForTests(): void {
  audioModeReady = null;
  successPlayer = null;
  errorPlayer = null;
}
