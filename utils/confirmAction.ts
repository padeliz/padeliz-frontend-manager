/**
 * Cross-platform confirm dialog (web window.confirm / native Alert).
 */

import { Alert } from 'react-native';

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void
) {
  if (typeof window !== 'undefined' && window.confirm) {
    if (window.confirm(message)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm },
    ]);
  }
}
