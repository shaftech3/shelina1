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

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { createApp } from './shelina-api/src/app.js';
import { ensureDevDatabaseReady } from './shelina-api/src/lib/devDatabase.js';
import { ensureSchemaMigrations } from './shelina-api/src/lib/ensureSchema.js';
import { bootstrapSingleAdmin } from './shelina-api/src/lib/bootstrapAdmin.js';
import { verifyEmailConfiguration } from './shelina-api/src/services/email.js';
import { verifyStorageConfiguration } from './shelina-api/src/services/storage.js';
import { prisma } from './shelina-api/src/lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = 3000;
  const app = createApp();

  // Vite middleware in development mode, or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start listening on port 3000 immediately
  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[server] Shelina application running on http://0.0.0.0:${PORT}`);

    // Asynchronously bootstrap local database, schema, admin & email in background
    try {
      await ensureDevDatabaseReady();
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
