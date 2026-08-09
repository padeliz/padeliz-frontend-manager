/* global jest */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

try {
  require('react-native-gesture-handler/jestSetup');
} catch {
  // Optional; not always needed for these suites.
}
