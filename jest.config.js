/** @type {import('jest').Config} */
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
  // Must exceed RNTL asyncUtilTimeout (5s in jest.setup.js) under parallel workers.
  testTimeout: 15000,
  // Polyfill before jest-expo preset setup (expo winter needs FormData)
  setupFiles: [
    '<rootDir>/jest.polyfills.js',
    ...((expoPreset.setupFiles || []).filter(
      f => !String(f).includes('jest.polyfills')
    ) || []),
  ],
  setupFilesAfterEnv: [
    ...((expoPreset.setupFilesAfterEnv || [])),
    '<rootDir>/jest.setup.js',
  ],
  moduleNameMapper: {
    ...(expoPreset.moduleNameMapper || {}),
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(wav)$': '<rootDir>/testing/fileMock.js',
    '^react-native-webview$': '<rootDir>/testing/reactNativeWebViewMock.js',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
