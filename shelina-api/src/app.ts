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
import { mediaRouter } from './routes/media.js';
import { adminOrdersRouter, ordersRouter } from './routes/orders.js';

export function createApp() {
  const app = express();

  // Behind the sandbox proxy; needed for correct client IPs in rate limiting.
  app.set('trust proxy', 1);

  // Sensible security headers. crossOriginResourcePolicy is relaxed because
  // the API is consumed from a different origin than it is served from.
  app.use(
    helmet({
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
        if (env.corsOrigins.includes(origin)) return callback(null, true);

        // In development, allow local dev origin connections
        if (!env.isProduction && (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin))) {
          return callback(null, true);
        }

        // Support wildcard patterns in CORS_ORIGIN (e.g. https://*.vercel.app)
        const matchesWildcard = env.corsOrigins.some((allowed) => {
          if (allowed.includes('*')) {
            const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return regex.test(origin);
          }
          return false;
        });
        if (matchesWildcard) return callback(null, true);

        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

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
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin/orders', adminOrdersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
