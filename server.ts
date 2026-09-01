// Sanitize CLOUDINARY_URL early if present in the environment
if (process.env.CLOUDINARY_URL) {
  let cleaned = process.env.CLOUDINARY_URL.trim().replace(/^["']|["']$/g, '').trim();
  if (cleaned.startsWith('CLOUDINARY_URL=')) {
    cleaned = cleaned.substring('CLOUDINARY_URL='.length).trim().replace(/^["']|["']$/g, '').trim();
  }
  if (cleaned.startsWith('cloudinary://')) {
    process.env.CLOUDINARY_URL = cleaned;
  } else {
    delete process.env.CLOUDINARY_URL;
  }
}

import { createApp } from './shelina-api/src/app.js';
import { env } from './shelina-api/src/lib/env.js';
import { ensureSchemaMigrations } from './shelina-api/src/lib/ensureSchema.js';
import { bootstrapSingleAdmin } from './shelina-api/src/lib/bootstrapAdmin.js';
import { verifyEmailConfiguration } from './shelina-api/src/services/email.js';
import { verifyStorageConfiguration } from './shelina-api/src/services/storage.js';
import { prisma } from './shelina-api/src/lib/prisma.js';

async function startServer() {
  const PORT = Number(process.env.PORT || env.port || 3000);
  const isProduction = process.env.NODE_ENV === 'production' || env.isProduction;
  const app = createApp();

  // In development mode only (AI Studio / local dev), mount Vite middleware for preview
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('[server] Vite middleware notice:', viteErr instanceof Error ? viteErr.message : viteErr);
    }
  }

  // Start listening on port 3000 (or PORT env) bound to 0.0.0.0
  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[server] Shelina API running on http://0.0.0.0:${PORT}`);
    console.log(`[server] Mode: ${isProduction ? 'production (API-only)' : 'development'}`);
    console.log(`[server] CORS Origins: ${env.corsOrigins.join(', ')}`);

    // In development only, if using a local database URL, ensure local dev DB
    if (!isProduction) {
      const isLocalDb = env.databaseUrl.includes('127.0.0.1') || env.databaseUrl.includes('localhost');
      if (isLocalDb) {
        try {
          const { ensureDevDatabaseReady } = await import('./shelina-api/src/lib/devDatabase.js');
          await ensureDevDatabaseReady();
        } catch (dbErr) {
          console.warn('[server] Local dev database notice:', dbErr instanceof Error ? dbErr.message : dbErr);
        }
      }
    }

    // Asynchronously bootstrap schema, admin, email & storage in background
    try {
      await ensureSchemaMigrations();

      // Seed initial content if needed
      try {
        const productCount = await prisma.product.count();
        const homepageCount = await prisma.homepage.count();
        const seoCount = await prisma.seoSettings.count();
        if (productCount === 0 || homepageCount === 0 || seoCount === 0) {
          console.log('[server] Seeding initial database content...');
          const seedModule = await import('./shelina-api/prisma/seed.js');
          if (typeof seedModule.seedDatabase === 'function') {
            await seedModule.seedDatabase();
          }
        }
      } catch (seedErr) {
        console.warn('[server] Database seed note:', seedErr instanceof Error ? seedErr.message : seedErr);
      }

      await bootstrapSingleAdmin();
      await verifyEmailConfiguration();
      await verifyStorageConfiguration();
      console.log('[server] Database and services initialized successfully.');
    } catch (initErr) {
      console.warn('[server] Background initialization notice:', initErr instanceof Error ? initErr.message : initErr);
    }
  });

  server.on('error', (err) => {
    console.error('[server] Server error:', err);
  });
}

startServer().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
