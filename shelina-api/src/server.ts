import { createApp } from './app.js';
import { env } from './lib/env.js';
import { ensureSchemaMigrations } from './lib/ensureSchema.js';
import { bootstrapSingleAdmin } from './lib/bootstrapAdmin.js';
import { verifyEmailConfiguration } from './services/email.js';
import { verifyStorageConfiguration } from './services/storage.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

app.listen(env.port, '0.0.0.0', async () => {
  console.log(`[api] Shelina API listening on http://0.0.0.0:${env.port}`);
  console.log(`[api] environment: ${env.NODE_ENV}`);
  console.log(`[api] CORS allowlist: ${env.corsOrigins.join(', ') || '(none configured)'}`);

  // Guarantee development database is online ONLY if running locally in dev
  if (!env.isProduction && (env.databaseUrl.includes('127.0.0.1') || env.databaseUrl.includes('localhost'))) {
    try {
      const { ensureDevDatabaseReady } = await import('./lib/devDatabase.js');
      await ensureDevDatabaseReady();
    } catch (dbErr) {
      console.warn('[api] Local dev database notice:', dbErr instanceof Error ? dbErr.message : dbErr);
    }
  }

  // Guarantee all database schema tables exist in connected PostgreSQL
  await ensureSchemaMigrations();

  // Populate catalogue and content if database is empty
  try {
    const productCount = await prisma.product.count();
    const homepageCount = await prisma.homepage.count();
    const seoCount = await prisma.seoSettings.count();
    if (productCount === 0 || homepageCount === 0 || seoCount === 0) {
      console.log('[api] Initial content empty in connected PostgreSQL. Seeding initial catalogue and settings...');
      const seedModule = await import('../prisma/seed.js');
      if (typeof seedModule.seedDatabase === 'function') {
        await seedModule.seedDatabase();
      }
    }
  } catch (err) {
    console.warn('[api] Database initialization/seed note:', err instanceof Error ? err.message : err);
  }

  // Guarantee single admin account synchronization on startup
  await bootstrapSingleAdmin();

  // Validate Brevo SMTP readiness
  await verifyEmailConfiguration();

  // Validate permanent media storage configuration
  await verifyStorageConfiguration();
});
