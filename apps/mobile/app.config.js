export default {
  name: 'InternTracker AI',
  slug: 'intern-tracker-ai',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0f0f1a',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'ai.interntracker.app',
    buildNumber: '1',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0f0f1a',
    },
    package: 'ai.interntracker.app',
    versionCode: 1,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
    eas: {
      projectId: 'your-eas-project-id',
    },
  },
};
