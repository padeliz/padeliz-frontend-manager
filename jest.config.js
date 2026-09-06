/** @type {import('jest').Config} */
const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...expoPreset,
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
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
};
