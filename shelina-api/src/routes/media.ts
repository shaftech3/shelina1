import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAdmin } from '../middleware/authGuards.js';
import { ApiError } from '../lib/errors.js';
import { storageService, resolveUploadsDirectory } from '../services/storage.js';

export const mediaRouter = Router();
export { resolveUploadsDirectory } from '../services/storage.js';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.ogv': 'video/ogg',
};

export function getMediaMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

const memoryStorage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
]);

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(
        new ApiError(
          `Unsupported media format (${file.mimetype}). Please upload an image (JPG, PNG, WebP, GIF, SVG) or video (MP4, WebM).`,
          400,
        ),
      );
    }
  },
});

/**
 * GET /api/media/config
 * Reports media upload configuration, active storage provider (Cloudinary/Local),
 * and persistence status.
 */
mediaRouter.get('/config', requireAdmin, (_req, res) => {
  const status = storageService.getStatus();
  res.json({
    success: true,
    data: {
      ...status,
      uploadsEnabled: true,
      acceptsUrlReferences: true,
      message: status.persistent
        ? `Persistent ${status.provider.toUpperCase()} cloud media storage is active.`
        : 'Direct media uploads are active (using local fallback directory).',
    },
  });
});

/**
 * POST /api/media/migrate
 * Migration utility: transfers existing local uploads to persistent Cloudinary storage
 * and updates database rows atomically.
 */
mediaRouter.post('/migrate', requireAdmin, async (req, res, next) => {
  try {
    const adminId = (req as unknown as { adminId?: string }).adminId || 'admin';
    const result = await storageService.migrateLocalMediaToCloud(adminId);
    res.json({
      success: true,
      message: `Media migration complete. ${result.migratedCount} item(s) uploaded to persistent storage.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/media
 * Safely deletes a media item from storage.
 */
mediaRouter.delete('/', requireAdmin, async (req, res, next) => {
  try {
    const url = (req.body?.url || req.query?.url) as string | undefined;
    if (!url) {
      throw ApiError.badRequest('Media URL is required for deletion.');
    }
    const success = await storageService.delete(url);
    res.json({ success, message: success ? 'Media deleted.' : 'Media file could not be deleted or was already removed.' });
  } catch (error) {
    next(error);
  }
});

/**
 * Robust handler to serve static fallback media files with CORS, HTTP 206 Range streaming support,
 * accurate MIME types, and aggressive caching.
 */
export function handleServeMediaFile(req: Request, res: Response, next: NextFunction) {
  try {
    const rawVal = req.params.filename ?? req.params[0];
    let rawParam = '';

    if (typeof rawVal === 'string') {
      rawParam = rawVal;
    } else if (Array.isArray(rawVal) && rawVal.length > 0 && typeof rawVal[0] === 'string') {
      rawParam = rawVal[0];
    } else if (typeof req.url === 'string') {
      rawParam = path.basename(req.url.split('?')[0]);
    }

    if (!rawParam || rawParam === 'config' || rawParam === 'multiple' || rawParam === 'migrate') {
      return next();
    }
    const filename = path.basename(rawParam);
    const dir = resolveUploadsDirectory();
    const filePath = path.join(dir, filename);

    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('Media file not found.');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const mimeType = getMediaMimeType(filename);

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', fileSize);
      res.status(200).end();
      return;
    }

    const range = req.headers.range;

    if (range) {
      // Range: bytes=start-end (e.g. bytes=0- or bytes=0-1048575)
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && end >= fileSize) || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        res.status(416).end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
}

/** Direct public media retrieval handler for /api/media/file/:filename */
mediaRouter.get('/file/:filename', handleServeMediaFile);

/** Direct public media retrieval handler for /api/media/:filename */
mediaRouter.get('/:filename', handleServeMediaFile);

/** Single media upload for admin. */
mediaRouter.post('/', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw ApiError.badRequest('No media file was provided for upload.');
    }
    const uploaded = await storageService.upload({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    res.status(201).json({
      success: true,
      data: {
        url: uploaded.url,
        filename: uploaded.filename,
        originalName: req.file.originalname,
        size: uploaded.bytes,
        mimetype: req.file.mimetype,
        type: uploaded.resourceType,
        persistent: uploaded.persistent,
        provider: uploaded.provider,
      },
    });
  } catch (error) {
    next(error);
  }
});

/** Multiple media uploads for gallery. */
mediaRouter.post('/multiple', requireAdmin, upload.array('files', 12), async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      throw ApiError.badRequest('No media files were provided for upload.');
    }

    const data = await Promise.all(
      files.map(async (f) => {
        const uploaded = await storageService.upload({
          buffer: f.buffer,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
        });

        return {
          url: uploaded.url,
          filename: uploaded.filename,
          originalName: f.originalname,
          size: uploaded.bytes,
          mimetype: f.mimetype,
          type: uploaded.resourceType,
          persistent: uploaded.persistent,
          provider: uploaded.provider,
        };
      }),
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});
