/* global jest */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
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
