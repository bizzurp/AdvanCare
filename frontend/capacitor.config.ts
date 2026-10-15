import type { CapacitorConfig } from '@capacitor/cli';

// Native shells (iOS / Android) around the same React app. The web build in dist/ is
// bundled into the app, so it opens offline. See .brain/DECISIONS.md ADR-013.
const config: CapacitorConfig = {
  appId: 'ph.advancare.app',
  appName: 'AdvanCare',
  webDir: 'dist',
  backgroundColor: '#F7F9F5',
  ios: {
    contentInset: 'never', // the app's CSS already pads for the notch and home bar (env(safe-area-inset-*))
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#F7F9F5',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT', // dark text on the light app background
      backgroundColor: '#F7F9F5',
      overlaysWebView: true,
    },
  },
};

export default config;
