import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/authGuards.js';
import { ApiError } from '../lib/errors.js';

export const mediaRouter = Router();

/**
 * Resolves the directory where uploaded media files are stored.
 * Checks persistent storage environment variables first for production platforms
 * like Render persistent disks (e.g. UPLOADS_DIR=/var/data/uploads), then falls
 * back to workspace uploads directories.
 */
export function resolveUploadsDirectory(): string {
  // 1. Explicit persistent directory path via environment variables
  const envDir = (process.env.UPLOADS_DIR || process.env.MEDIA_STORAGE_PATH || '').trim();
  if (envDir) {
    if (!fs.existsSync(envDir)) {
      try {
        fs.mkdirSync(envDir, { recursive: true });
      } catch {
        // ignore and fallback
      }
    }
    if (fs.existsSync(envDir)) {
      return envDir;
    }
  }

  // 2. Standard Render persistent disk mount paths
  const persistentCandidates = ['/var/data/uploads', '/data/uploads'];
  for (const candidate of persistentCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // 3. Application workspace directories
  const candidates = [
    path.resolve(process.cwd(), 'public/uploads'),
    path.resolve(process.cwd(), '../public/uploads'),
    path.resolve(process.cwd(), 'shelina-api/public/uploads'),
    '/tmp/shelina-uploads',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const defaultDir = path.resolve(process.cwd(), 'public/uploads');
  fs.mkdirSync(defaultDir, { recursive: true });
  return defaultDir;
}

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = resolveUploadsDirectory();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40);
    cb(null, `${cleanName || 'media'}-${uniqueSuffix}${ext}`);
  },
});

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
  storage,
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

/** Reports media upload configuration. */
mediaRouter.get('/config', requireAdmin, (_req, res) => {
  res.json({
    success: true,
    data: {
      provider: 'local',
      uploadsEnabled: true,
      acceptsUrlReferences: true,
      maxFileSizeMb: 50,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'],
      message: 'Direct media uploads are active and ready.',
    },
  });
});

/**
 * Robust handler to serve static media files with CORS, HTTP 206 Range streaming support,
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

    if (!rawParam || rawParam === 'config' || rawParam === 'multiple') {
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
mediaRouter.post('/', requireAdmin, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      throw ApiError.badRequest('No media file was provided for upload.');
    }
    const isVideo = req.file.mimetype.startsWith('video/');
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
      success: true,
      data: {
        url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        type: isVideo ? 'video' : 'image',
      },
    });
  } catch (error) {
    next(error);
  }
});

/** Multiple media uploads for gallery. */
mediaRouter.post('/multiple', requireAdmin, upload.array('files', 12), (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    if (files.length === 0) {
      throw ApiError.badRequest('No media files were provided for upload.');
    }
    const data = files.map((f) => ({
      url: `/uploads/${f.filename}`,
      filename: f.filename,
      originalName: f.originalname,
      size: f.size,
      mimetype: f.mimetype,
      type: f.mimetype.startsWith('video/') ? 'video' : 'image',
    }));
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

