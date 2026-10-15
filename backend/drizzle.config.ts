import { defineConfig } from 'drizzle-kit';

// `db:generate` needs no database. `db:migrate` reads backend/.env and uses Neon's direct
// (unpooled) URL, as migrations should not go through the pooler.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env: fall back to variables already exported in the shell.
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  strict: true,
  verbose: true,
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' },
});
