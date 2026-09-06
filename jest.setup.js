/* global jest */

jest.mock('expo-router', () =>
  require('./testing/expoRouterMock').createExpoRouterMock()
);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    seekTo: jest.fn(async () => undefined),
  })),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
    Warning: 'warning',
  },
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: callback => {
      React.useEffect(() => callback(), [callback]);
    },
  };
});

try {
  require('react-native-gesture-handler/jestSetup');
} catch {
  // Optional; not always needed for these suites.
}
