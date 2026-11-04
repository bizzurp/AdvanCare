import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/main.css';
import './styles/motion.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Fade the preloader out once the app, fonts and first images are ready.
const MIN_VISIBLE_MS = 800; // long enough to read as intentional, not a flicker
const MAX_WAIT_MS = 4000; // never hold the page hostage on a slow image

function hidePreloader() {
  const el = document.getElementById('ac-preloader');
  if (!el || el.classList.contains('is-done')) return;
  el.classList.add('is-done');
  document.documentElement.classList.remove('ac-loading');
  window.dispatchEvent(new Event('ac:preloader-done'));
  window.setTimeout(() => el.remove(), 600);
}

const pageLoaded = new Promise<void>((resolve) => {
  if (document.readyState === 'complete') resolve();
  else window.addEventListener('load', () => resolve(), { once: true });
});
const fontsReady = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
const minDelay = new Promise<void>((resolve) =>
  window.setTimeout(resolve, Math.max(0, MIN_VISIBLE_MS - performance.now()))
);

Promise.race([
  Promise.all([pageLoaded, fontsReady, minDelay]),
  new Promise<void>((resolve) => window.setTimeout(resolve, MAX_WAIT_MS)),
]).then(hidePreloader);
