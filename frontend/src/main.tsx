import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
// Inter is bundled (not loaded from Google Fonts) so text renders correctly offline.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import App from './App';
import { AppStateProvider } from './state/AppState';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </StrictMode>,
);

if (Capacitor.isNativePlatform()) {
  // Native app (iOS/Android): files are bundled into the app, so no service worker is needed.
  void (async () => {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([import('@capacitor/status-bar'), import('@capacitor/splash-screen')]);
    await StatusBar.setStyle({ style: Style.Light }).catch(() => undefined); // dark text on the light background
    await SplashScreen.hide().catch(() => undefined);
  })();
} else if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // App-shell caching for low-bandwidth use (web/PWA production builds only).
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
