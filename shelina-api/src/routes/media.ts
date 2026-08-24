import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { requireAdmin } from '../middleware/authGuards.js';
import { ApiError } from '../lib/errors.js';

export const mediaRouter = Router();

const uploadDir = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
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
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
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
