import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  __resetActionButtonFeedbackForTests,
  playError,
  playSuccess,
} from '@/lib/actionButtonFeedback';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

describe('actionButtonFeedback', () => {
  const getItem = AsyncStorage.getItem as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetActionButtonFeedbackForTests();
    getItem.mockResolvedValue(null);
    (Platform as { OS: string }).OS = 'ios';
  });

  it('pref unset defaults ON and attempts sound + haptic', async () => {
    await playSuccess();
    expect(setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false })
    );
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('pref false skips sound and haptic', async () => {
    getItem.mockResolvedValue('false');
    await playError();
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('sound throw still attempts haptic on native', async () => {
    (createAudioPlayer as jest.Mock).mockImplementationOnce(() => {
      throw new Error('audio boom');
    });
    await expect(playSuccess()).resolves.toBeUndefined();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
  });

  it('haptic throw does not throw out', async () => {
    (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(
      new Error('haptic boom')
    );
    await expect(playError()).resolves.toBeUndefined();
  });

  it('web skips haptic', async () => {
    (Platform as { OS: string }).OS = 'web';
    await playSuccess();
    expect(createAudioPlayer).toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});
