/**
 * Shared expo-router Jest mock. Always include search-param hooks so
 * AppLayout / useLayoutChrome never see undefined exports.
 */

function createExpoRouterMock(overrides = {}) {
  return {
    usePathname: () => '/',
    useGlobalSearchParams: () => ({}),
    useLocalSearchParams: () => ({}),
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }),
    Link: ({ children }) => children,
    Slot: () => null,
    Redirect: () => null,
    ...overrides,
  };
}

module.exports = {
  createExpoRouterMock,
};
