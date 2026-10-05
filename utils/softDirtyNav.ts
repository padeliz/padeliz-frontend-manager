/**
 * Confirm leave/discard when page chrome is dirty.
 */

import { formatUnixDateTime24h } from '@/components/events/eventLotteryUtils';
import { Alert, Platform } from 'react-native';

export function confirmDiscardDirty(
  message = 'You have unsaved changes. Discard and continue?'
): Promise<boolean> {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise(resolve => {
    Alert.alert('Unsaved changes', message, [
      { text: 'Stay', style: 'cancel', onPress: () => resolve(false) },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** Format unix seconds for Finalized chrome (24h clock). */
export function formatFinalizedAt(unixSeconds: number): string {
  return formatUnixDateTime24h(unixSeconds);
}
