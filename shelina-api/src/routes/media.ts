import { Router } from 'express';
import { requireAdmin } from '../middleware/authGuards.js';
import { ApiError } from '../lib/errors.js';

export const mediaRouter = Router();

/**
 * ============================================================================
 * MEDIA ABSTRACTION — REFERENCE-ONLY BY DESIGN
 * ============================================================================
 *
 * No cloud storage provider is configured in this environment, so this stage
 * does NOT pretend to run one. What exists is the seam a provider drops into.
 *
 * Rules this enforces:
 *   • The database stores URL references only. Binary image/video data is
 *     never written into product rows or any other table.
 *   • Nothing here accepts a file body, so there is no fake "upload" that
 *     silently discards bytes.
 *
 * To connect real storage (S3 / R2 / Cloudinary) later, implement
 * `POST /api/media/sign` to return a provider-signed upload URL, let the
 * browser PUT directly to the provider, then send the resulting public URL
 * back through the normal product/banner save. The ProductMedia table and
 * every consumer already work in terms of URLs, so nothing else changes.
 */

/** Reports how media is currently handled so the admin UI can stay honest. */
mediaRouter.get('/config', requireAdmin, (_req, res) => {
  res.json({
    success: true,
    data: {
      provider: 'none',
      uploadsEnabled: false,
      // The admin may reference anything already published under /public.
      acceptsUrlReferences: true,
      message:
        'No storage provider is configured. Enter a path to a file in the site\u2019s public folder, or connect a provider to enable uploads.',
    },
  });
});

mediaRouter.post('/', requireAdmin, () => {
  throw new ApiError(
    'No media storage provider is configured, so uploads are unavailable. Reference an existing file URL instead.',
    501,
  );
});
