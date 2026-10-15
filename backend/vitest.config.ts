import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

try {
  process.loadEnvFile('.env');
} catch {
  // No .env: fall back to variables already exported in the shell.
}

// Tests run inside workerd via Miniflare. The health "database ok" test runs only when
// DATABASE_URL is set (backend/.env or the shell); it is skipped otherwise.
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      // Never touch real Cloudflare resources from tests (wrangler.toml marks R2 remote for dev).
      remoteBindings: false,
      miniflare: {
        bindings: {
          TEST_HAS_DATABASE: process.env.DATABASE_URL ? 'true' : 'false',
          ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
          // Dummy credentials: presigning is local HMAC work, nothing is sent to R2.
          R2_ACCOUNT_ID: 'testaccount',
          R2_ACCESS_KEY_ID: 'test-access-key',
          R2_SECRET_ACCESS_KEY: 'test-secret-key',
          // Test-only key (32 bytes of 0x01..0x20); never a real environment's key.
          STAFF_ENCRYPTION_KEY: 'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA=',
        },
      },
    }),
  ],
  resolve: {
    // pg require()s these, but the workerd test runner's require() shim resolves them to
    // their ESM builds and fails. Point it at the CommonJS builds (bundling is unaffected).
    alias: {
      'pg-protocol': local('./node_modules/pg-protocol/dist/index.js'),
      'pg-cloudflare': local('./node_modules/pg-cloudflare/dist/index.js'),
    },
  },
  test: {
    // After a clean client.end(), workerd rejects the driver's pending socket read with
    // "This socket has been closed." inside pg-cloudflare, where it cannot be caught.
    // Ignore exactly that; every other unhandled error still fails the run.
    onUnhandledError: (error) => (error.message === 'This socket has been closed.' ? false : undefined),
  },
});
