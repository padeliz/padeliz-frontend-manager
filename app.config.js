/**
 * Dynamic Expo config: router origin tracks EXPO_PUBLIC_BASE_URL so OAuth,
 * share links, and Expo Router share one public web origin per environment.
 */
function normalizeBaseUrl(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) {
    throw new Error(
      'EXPO_PUBLIC_BASE_URL is not set. Set it in .env.local (e.g. http://localhost:8083).'
    );
  }
  return trimmed.replace(/\/+$/, '');
}

const origin = normalizeBaseUrl(process.env.EXPO_PUBLIC_BASE_URL);

module.exports = {
  expo: {
    name: 'Padeliz Manager',
    slug: 'padeliz-manager',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'padeliz-manager',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.padeliz.manager',
      usesAppleSignIn: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.padeliz.manager',
    },
    web: {
      bundler: 'metro',
      output: 'server',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      [
        'expo-router',
        {
          origin,
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      'expo-secure-store',
      'expo-apple-authentication',
      'expo-font',
      'expo-web-browser',
      'expo-audio',
    ],
    experiments: {
      typedRoutes: true,
    },
    owner: 'padeliz',
    extra: {
      router: {
        origin,
      },
      eas: {
        projectId: 'a6ab7b60-0498-49f4-84d6-f8d9089592ce',
      },
      expoConfig: {},
    },
  },
};
