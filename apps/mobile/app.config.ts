import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'wallp',
  slug: 'wallp',
  scheme: 'wallp',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  android: {
    package: 'com.sahilsensei.wallp',
    permissions: ['android.permission.SET_WALLPAPER'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-mono.png',
      backgroundColor: '#0B0B0C',
    },
  },
  ios: { bundleIdentifier: 'com.sahilsensei.wallp' },
  web: { bundler: 'metro', name: 'wallp. — A little less ordinary' },
  plugins: [
    './plugins/withShortCmakePaths',
    './plugins/withBundleCli',
    'expo-dev-client',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        backgroundColor: '#FFFFFF',
        dark: { image: './assets/splash-icon-dark.png', backgroundColor: '#000000' },
      },
    ],
    'expo-font',
    'expo-asset',
    'expo-secure-store',
    [
      'expo-media-library',
      {
        photosPermission: 'Allow wallp. to save your chosen artwork.',
        savePhotosPermission: 'Allow wallp. to save wallpapers to your library.',
        granularPermissions: ['photo'],
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          process.env.GOOGLE_IOS_URL_SCHEME ||
          'com.googleusercontent.apps.wallp-configure-before-ios-build',
      },
    ],
  ],
};
export default config;
