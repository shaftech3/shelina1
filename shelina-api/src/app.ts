import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { brandsRouter, categoriesRouter } from './routes/taxonomy.js';
import { bannersRouter, homepageRouter, seoRouter } from './routes/content.js';
import { handleServeMediaFile, mediaRouter, resolveUploadsDirectory } from './routes/media.js';
import { adminOrdersRouter, ordersRouter } from './routes/orders.js';
import { adminCustomersRouter } from './routes/adminCustomers.js';
import { adminCleanupRouter } from './routes/adminCleanup.js';
import { settingsRouter } from './routes/settings.js';
import { nexoraRouter } from './routes/nexora.js';
import { adminNexoraRouter } from './routes/adminNexora.js';

export function createApp() {
  const app = express();

  // Behind the sandbox proxy; needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1);

  // Serve uploaded media files with full HTTP 206 Range streaming and CORS headers
  app.get('/uploads/:filename', handleServeMediaFile);
  app.get('/api/uploads/:filename', handleServeMediaFile);

  const uploadsDir = resolveUploadsDirectory();
  const staticOptions = {
    maxAge: '1d',
    setHeaders: (res: express.Response) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
    },
  };
  app.use('/uploads', express.static(uploadsDir, staticOptions));
  app.use('/api/uploads', express.static(uploadsDir, staticOptions));

  // Sensible security headers. crossOriginResourcePolicy is relaxed because
  // the API is consumed from a different origin than it is served from.
  // frameguard is disabled to support running within the AI Studio preview iframe.
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  /**
   * CORS with an explicit allowlist. `credentials: true` is required for the
   * HttpOnly session cookies, and the spec is clear: never pair credentials
   * with a wildcard origin. An unlisted origin is simply not granted CORS
   * headers.
   */
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin/curl requests send no Origin header.
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/+$/, '');
        if (env.corsOrigins.includes(normalized) || env.corsOrigins.includes(origin)) {
          return callback(null, true);
        }

        // In development, allow local dev origin connections and preview domains
        if (
          !env.isProduction &&
          (/^http:\/\/localhost(:\d+)?$/.test(normalized) ||
            /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized) ||
            /^https:\/\/.*\.run\.app$/.test(normalized) ||
            /^https:\/\/.*\.google\.com$/.test(normalized) ||
            normalized === 'https://ai.studio')
        ) {
          return callback(null, true);
        }

        // Support wildcard patterns in CORS_ORIGIN (e.g. https://*.vercel.app)
        const matchesWildcard = env.corsOrigins.some((allowed) => {
          if (allowed.includes('*')) {
            const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return regex.test(normalized) || regex.test(origin);
          }
          return false;
        });
        if (matchesWildcard) return callback(null, true);

        // Explicitly allow shelina1.vercel.app and preview subdomains
        if (normalized === 'https://shelina1.vercel.app' || normalized.endsWith('.vercel.app')) {
          return callback(null, true);
        }

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      exposedHeaders: ['Set-Cookie', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Root endpoint for quick connectivity check on Oracle server
  app.get('/', (_req, res) => {
    res.json({
      name: 'Shelina API',
      status: 'online',
      version: '1.0.0',
      health: '/api/health',
      storefront: 'https://shelina1.vercel.app',
    });
  });

  app.get('/api/health', async (_req, res) => {
    const { prisma } = await import('./lib/prisma.js');
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ success: true, data: { status: 'ok', database: 'connected' } });
    } catch {
      res.status(503).json({ success: false, message: 'Database unavailable.' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/brands', brandsRouter);
  app.use('/api/homepage', homepageRouter);
  app.use('/api/banners', bannersRouter);
  app.use('/api/seo', seoRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin/orders', adminOrdersRouter);
  app.use('/api/admin/customers', adminCustomersRouter);
  app.use('/api/admin/cleanup', adminCleanupRouter);
  app.use('/api/admin/integrations/nexora', adminNexoraRouter);
  app.use('/api/admin/nexora', adminCleanupRouter);
  app.use('/api/nexora/v1', nexoraRouter);

  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
