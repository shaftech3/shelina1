import { createApp } from './app.js';
import { env } from './lib/env.js';
import { ensureSchemaMigrations } from './lib/ensureSchema.js';
import { bootstrapSingleAdmin } from './lib/bootstrapAdmin.js';
import { verifyEmailConfiguration } from './services/email.js';
import { ensureDevDatabaseReady } from './lib/devDatabase.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

app.listen(env.port, '0.0.0.0', async () => {
  console.log(`[api] Shelina API listening on http://0.0.0.0:${env.port}`);
  console.log(`[api] environment: ${env.NODE_ENV}`);
  console.log(`[api] CORS allowlist: ${env.corsOrigins.join(', ') || '(none configured)'}`);

  // Guarantee development database is online if running locally
  await ensureDevDatabaseReady();

  // Guarantee all database schema tables exist in connected PostgreSQL
  await ensureSchemaMigrations();

  // Populate catalogue if database is empty
  try {
    const productCount = await prisma.product.count();
    if (productCount === 0) {
      console.log('[api] Catalogue empty in connected PostgreSQL. Seeding initial catalogue...');
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
});
