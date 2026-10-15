import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API is proxied, so the staff session cookie is first-party to the
// admin origin. Deployed, Pages' _worker.js (or Vercel's rewrite) proxies /api;
// keep VITE_API_BASE_URL empty so the production cookie also stays first-party.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    strictPort: true,
    proxy: { '/api': { target: process.env.ADMIN_API_PROXY ?? 'http://localhost:8787' } },
  },
});
