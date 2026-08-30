import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

export interface StorageUploadResult {
  url: string;
  publicId?: string;
  filename: string;
  format?: string;
  bytes: number;
  width?: number;
  height?: number;
  resourceType: 'image' | 'video' | 'raw';
  provider: 'cloudinary' | 'local';
  persistent: boolean;
}

export interface StorageStatus {
  provider: 'cloudinary' | 'local';
  persistent: boolean;
  isConfigured: boolean;
  cloudinaryConfigured: boolean;
  cloudNameConfigured: boolean;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  cloudName?: string;
  uploadsDir?: string;
  maxFileSizeMb: number;
  acceptedTypes: string[];
  uploadsEnabled: boolean;
  message?: string;
}

export interface MediaDiagnosticItem {
  id: string;
  table: string;
  field: string;
  url: string;
  status: 'permanent_cloud' | 'static_asset' | 'legacy_local' | 'missing' | 'other';
  resourceType?: 'image' | 'video';
  migratable: boolean;
  notes?: string;
}

export interface MediaDiagnosticsReport {
  totalMedia: number;
  permanentCloudinary: number;
  staticAssets: number;
  legacyLocal: number;
  missingOrBroken: number;
  migrationCandidates: number;
  storage: StorageStatus;
  items: MediaDiagnosticItem[];
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryConfigResult {
  configured: boolean;
  cloudNameConfigured: boolean;
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  cloudName?: string;
  source: 'url' | 'individual' | 'none';
}

function cleanEnvVal(val?: string | null): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Parses a standard Cloudinary URL into its constituent parts.
 * Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
 */
function parseCloudinaryUrl(urlStr: string): CloudinaryCredentials | null {
  try {
    const cleaned = cleanEnvVal(urlStr);
    if (!cleaned) return null;

    if (cleaned.startsWith('cloudinary://')) {
      const parsed = new URL(cleaned);
      const apiKey = decodeURIComponent(parsed.username || '');
      const apiSecret = decodeURIComponent(parsed.password || '');
      const cloudName = decodeURIComponent(parsed.hostname || '');
      if (cloudName && apiKey && apiSecret) {
        return { cloudName, apiKey, apiSecret };
      }
    }

    const match = cleaned.match(/cloudinary:\/\/([^:]+):([^@]+)@([^\s/?#]+)/);
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3],
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Resolves the directory where local fallback media files are stored.
 */
export function resolveUploadsDirectory(): string {
  // 1. Explicit persistent directory path via environment variables
  const envDir = cleanEnvVal(process.env.UPLOADS_DIR || process.env.MEDIA_STORAGE_PATH);
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

/**
 * Checks whether the app is currently running in a production or Render deployment.
 */
function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.RENDER) ||
    Boolean(process.env.IS_RENDER) ||
    Boolean(process.env.RENDER_SERVICE_ID)
  );
}

/**
 * Comprehensive Cloudinary credentials inspection and setup.
 * Supports CLOUDINARY_URL and individual environment variables without leaking secrets.
 */
function getCloudinaryConfig(): CloudinaryConfigResult {
  const rawUrl = cleanEnvVal(process.env.CLOUDINARY_URL);
  const parsedFromUrl: CloudinaryCredentials | null = rawUrl ? parseCloudinaryUrl(rawUrl) : null;

  const rawCloudName = cleanEnvVal(
    process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.CLOUDINARY_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME,
  );
  const rawApiKey = cleanEnvVal(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_KEY);
  const rawApiSecret = cleanEnvVal(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_SECRET);

  if (parsedFromUrl) {
    cloudinary.config({
      cloud_name: parsedFromUrl.cloudName,
      api_key: parsedFromUrl.apiKey,
      api_secret: parsedFromUrl.apiSecret,
      secure: true,
    });
    return {
      configured: true,
      cloudNameConfigured: true,
      apiKeyConfigured: true,
      apiSecretConfigured: true,
      cloudName: parsedFromUrl.cloudName,
      source: 'url',
    };
  }

  if (rawCloudName && rawApiKey && rawApiSecret) {
    cloudinary.config({
      cloud_name: rawCloudName,
      api_key: rawApiKey,
      api_secret: rawApiSecret,
      secure: true,
    });
    return {
      configured: true,
      cloudNameConfigured: true,
      apiKeyConfigured: true,
      apiSecretConfigured: true,
      cloudName: rawCloudName,
      source: 'individual',
    };
  }

  return {
    configured: false,
    cloudNameConfigured: Boolean(rawCloudName),
    apiKeyConfigured: Boolean(rawApiKey),
    apiSecretConfigured: Boolean(rawApiSecret),
    cloudName: rawCloudName || undefined,
    source: 'none',
  };
}

/**
 * Startup validation logger for server boot.
 */
export async function verifyStorageConfiguration(): Promise<void> {
  const status = storageService.getStatus();
  if (status.cloudinaryConfigured) {
    console.log(`[storage] Cloudinary media storage: CONFIGURED & ACTIVE (cloud: ${status.cloudName})`);
  } else if (isProductionEnvironment()) {
    console.warn(
      `[storage] WARNING: Cloudinary media storage is NOT configured in production.\n` +
        `[storage] Cloud name configured: ${status.cloudNameConfigured ? 'YES' : 'NO'}\n` +
        `[storage] API key configured: ${status.apiKeyConfigured ? 'YES' : 'NO'}\n` +
        `[storage] API secret configured: ${status.apiSecretConfigured ? 'YES' : 'NO'}\n` +
        `[storage] Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to your environment variables on Render.`,
    );
  } else {
    console.log('[storage] Local media storage active for development (uploads will be stored in public/uploads).');
  }
}

export const storageService = {
  /**
   * Returns current storage subsystem status and configuration.
   * Safe for client reporting (never exposes API secret or credentials).
   */
  getStatus(): StorageStatus {
    const cloud = getCloudinaryConfig();
    const isCloudinary = cloud.configured;
    const isProd = isProductionEnvironment();

    let message = '';
    if (isCloudinary) {
      message = `Permanent Cloudinary cloud media storage is ACTIVE and verified (Cloud: ${cloud.cloudName || 'custom'}).`;
    } else if (isProd) {
      if (cloud.cloudNameConfigured && (!cloud.apiKeyConfigured || !cloud.apiSecretConfigured)) {
        message =
          'Cloudinary is partially configured: CLOUDINARY_CLOUD_NAME is present, but CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is missing. Please set all three environment variables on Render.';
      } else {
        message =
          'Permanent media storage is not configured on this server. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to your environment variables on Render to ensure uploaded media is stored permanently.';
      }
    } else {
      message = 'Direct media uploads are active in local development mode (using local filesystem).';
    }

    return {
      provider: isCloudinary ? 'cloudinary' : 'local',
      persistent: isCloudinary || Boolean(process.env.UPLOADS_DIR),
      isConfigured: isCloudinary,
      cloudinaryConfigured: isCloudinary,
      cloudNameConfigured: cloud.cloudNameConfigured,
      apiKeyConfigured: cloud.apiKeyConfigured,
      apiSecretConfigured: cloud.apiSecretConfigured,
      cloudName: cloud.cloudName,
      uploadsDir: isCloudinary ? undefined : resolveUploadsDirectory(),
      maxFileSizeMb: 50,
      uploadsEnabled: isCloudinary || !isProd,
      message,
      acceptedTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'image/avif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
      ],
    };
  },

  /**
   * Uploads a file buffer to persistent storage (Cloudinary).
   * In production, fails explicitly if Cloudinary is not configured, preventing ephemeral data loss.
   */
  async upload(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }): Promise<StorageUploadResult> {
    const isVideo =
      file.mimetype.startsWith('video/') ||
      /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.originalname);
    const resourceType: 'image' | 'video' | 'raw' = isVideo ? 'video' : 'image';
    const cloud = getCloudinaryConfig();
    const isProd = isProductionEnvironment();

    if (cloud.configured) {
      return new Promise<StorageUploadResult>((resolve, reject) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path
          .basename(file.originalname, ext)
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .slice(0, 40);
        const subfolder = isVideo ? 'videos' : 'media';
        const publicId = `${Date.now()}_${base || 'asset'}`;

        let finished = false;
        const timer = setTimeout(() => {
          if (!finished) {
            finished = true;
            reject(
              new ApiError(
                'Media upload timed out after 60 seconds. Please check your network connection or try a smaller file.',
                408,
              ),
            );
          }
        }, 60000);

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            resource_type: resourceType,
            folder: `Shelina/${subfolder}`,
            overwrite: false,
            use_filename: true,
            unique_filename: true,
          },
          (error, result: UploadApiResponse | undefined) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);

            if (error || !result) {
              console.error('[Storage] Cloudinary upload error:', error);
              const errMsg = error?.message || 'Upload failed';
              const isAuthError =
                errMsg.toLowerCase().includes('must supply api_key') ||
                errMsg.toLowerCase().includes('invalid api_key') ||
                errMsg.toLowerCase().includes('signature') ||
                errMsg.toLowerCase().includes('unauthorized');

              if (isAuthError) {
                return reject(
                  new ApiError(
                    'Cloudinary authentication failed. Please verify CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET on Render.',
                    401,
                  ),
                );
              }

              return reject(
                new ApiError(
                  `Failed to upload file to Cloudinary: ${errMsg}`,
                  400,
                ),
              );
            }

            resolve({
              url: result.secure_url || result.url,
              publicId: result.public_id,
              filename: `${result.public_id}.${result.format || (isVideo ? 'mp4' : 'jpg')}`,
              format: result.format,
              bytes: result.bytes || file.size,
              width: result.width,
              height: result.height,
              resourceType,
              provider: 'cloudinary',
              persistent: true,
            });
          },
        );

        uploadStream.end(file.buffer);
      });
    }

    // In production on Render, NEVER silently save to ephemeral container disk
    if (isProd) {
      const status = storageService.getStatus();
      throw new ApiError(
        status.message ||
          'Permanent media storage is not configured on this server. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to your environment variables on Render to ensure uploaded media is stored permanently.',
        400,
      );
    }

    // Local Disk Fallback (allowed ONLY in local development)
    const dir = resolveUploadsDirectory();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname).toLowerCase() || (isVideo ? '.mp4' : '.jpg');
    const cleanName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40);
    const filename = `${cleanName || 'media'}-${uniqueSuffix}${ext}`;
    const filePath = path.join(dir, filename);

    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/uploads/${filename}`,
      filename,
      bytes: file.size,
      resourceType,
      provider: 'local',
      persistent: false,
    };
  },

  /**
   * Safely deletes an asset from storage.
   */
  async delete(urlOrPublicId: string): Promise<boolean> {
    if (!urlOrPublicId) return false;

    const isCloudinary =
      urlOrPublicId.includes('cloudinary.com') || urlOrPublicId.startsWith('shelina/');
    const cloud = getCloudinaryConfig();

    if (isCloudinary && cloud.configured) {
      try {
        let publicId = urlOrPublicId;
        if (urlOrPublicId.includes('cloudinary.com')) {
          const parts = urlOrPublicId.split('/upload/');
          if (parts[1]) {
            const pathWithoutVersion = parts[1].replace(/^v\d+\//, '');
            publicId = pathWithoutVersion.replace(/\.[^/.]+$/, '');
          }
        }
        const isVideo =
          urlOrPublicId.includes('/video/') ||
          urlOrPublicId.endsWith('.mp4') ||
          urlOrPublicId.endsWith('.webm');
        await cloudinary.uploader.destroy(publicId, {
          resource_type: isVideo ? 'video' : 'image',
        });
        return true;
      } catch (err) {
        console.warn('[Storage] Could not delete from Cloudinary:', err);
        return false;
      }
    }

    // Local file deletion
    try {
      const filename = path.basename(urlOrPublicId);
      const dir = resolveUploadsDirectory();
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (err) {
      console.warn('[Storage] Could not delete local file:', err);
    }
    return false;
  },

  /**
   * Scans all database tables containing media references and returns a comprehensive diagnostic report.
   */
  async scanMediaDiagnostics(): Promise<MediaDiagnosticsReport> {
    const status = storageService.getStatus();
    const items: MediaDiagnosticItem[] = [];
    const dir = resolveUploadsDirectory();

    function evaluateUrl(
      id: string,
      table: string,
      field: string,
      rawUrl?: string | null,
      resourceType: 'image' | 'video' = 'image',
    ) {
      if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
        items.push({
          id,
          table,
          field,
          url: '',
          status: 'missing',
          resourceType,
          migratable: false,
          notes: 'Empty or null media reference',
        });
        return;
      }

      const url = rawUrl.trim();
      if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
        items.push({
          id,
          table,
          field,
          url,
          status: 'permanent_cloud',
          resourceType,
          migratable: false,
          notes: 'Secure permanent Cloudinary storage',
        });
      } else if (url.startsWith('/images/') || url.startsWith('/videos/')) {
        items.push({
          id,
          table,
          field,
          url,
          status: 'static_asset',
          resourceType,
          migratable: false,
          notes: 'Frontend bundled static asset',
        });
      } else if (
        url.startsWith('/uploads/') ||
        url.startsWith('uploads/') ||
        url.includes('/api/media/') ||
        url.includes('onrender.com/uploads')
      ) {
        const filename = path.basename(url.split('?')[0]);
        const existsLocally = fs.existsSync(path.join(dir, filename));
        items.push({
          id,
          table,
          field,
          url,
          status: existsLocally ? 'legacy_local' : 'missing',
          resourceType,
          migratable: true,
          notes: existsLocally
            ? 'Local disk file (needs migration to Cloudinary)'
            : 'Ephemeral local file (may be missing if Render restarted)',
        });
      } else {
        items.push({
          id,
          table,
          field,
          url,
          status: 'other',
          resourceType,
          migratable: url.startsWith('http'),
          notes: 'External or custom URL',
        });
      }
    }

    // 1. ProductMedia
    const productMedia = await prisma.productMedia.findMany();
    for (const pm of productMedia) {
      evaluateUrl(pm.id, 'ProductMedia', 'url', pm.url, pm.type as 'image' | 'video');
      if (pm.poster) {
        evaluateUrl(pm.id, 'ProductMedia', 'poster', pm.poster, 'image');
      }
    }

    // 2. Categories
    const categories = await prisma.category.findMany();
    for (const cat of categories) {
      if (cat.image) {
        evaluateUrl(cat.id, 'Category', 'image', cat.image, 'image');
      }
    }

    // 3. Brands
    const brands = await prisma.brand.findMany();
    for (const brand of brands) {
      if (brand.logo) {
        evaluateUrl(brand.id, 'Brand', 'logo', brand.logo, 'image');
      }
    }

    // 4. Homepage
    const homepages = await prisma.homepage.findMany();
    for (const hp of homepages) {
      if (hp.image) evaluateUrl(hp.id, 'Homepage', 'image', hp.image, 'image');
      if (hp.secondaryImage) evaluateUrl(hp.id, 'Homepage', 'secondaryImage', hp.secondaryImage, 'image');
      if (hp.editorialImage) evaluateUrl(hp.id, 'Homepage', 'editorialImage', hp.editorialImage, 'image');
    }

    // 5. Banners
    const banners = await prisma.banner.findMany();
    for (const banner of banners) {
      if (banner.image) evaluateUrl(banner.id, 'Banner', 'image', banner.image, 'image');
    }

    // 6. SeoSettings
    const seoList = await prisma.seoSettings.findMany();
    for (const seo of seoList) {
      if (seo.defaultImage) evaluateUrl(seo.id, 'SeoSettings', 'defaultImage', seo.defaultImage, 'image');
      if (seo.ogImage) evaluateUrl(seo.id, 'SeoSettings', 'ogImage', seo.ogImage, 'image');
      if (seo.twitterImage) evaluateUrl(seo.id, 'SeoSettings', 'twitterImage', seo.twitterImage, 'image');
    }

    const totalMedia = items.length;
    const permanentCloudinary = items.filter((i) => i.status === 'permanent_cloud').length;
    const staticAssets = items.filter((i) => i.status === 'static_asset').length;
    const legacyLocal = items.filter((i) => i.status === 'legacy_local').length;
    const missingOrBroken = items.filter((i) => i.status === 'missing').length;
    const migrationCandidates = items.filter((i) => i.migratable).length;

    return {
      totalMedia,
      permanentCloudinary,
      staticAssets,
      legacyLocal,
      missingOrBroken,
      migrationCandidates,
      storage: status,
      items,
    };
  },

  /**
   * Migrates existing local uploads to persistent Cloudinary storage.
   * Scans database tables and uploads any local files, updating URLs safely and idempotently.
   */
  async migrateLocalMediaToCloud(actorId = 'system'): Promise<{
    totalScanned: number;
    migratedCount: number;
    failedCount: number;
    skippedCount: number;
    details: { table: string; id: string; oldUrl: string; newUrl?: string; error?: string }[];
  }> {
    const cloud = getCloudinaryConfig();
    if (!cloud.configured) {
      throw new Error(
        'Persistent cloud storage (Cloudinary) is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET (or CLOUDINARY_URL) in environment variables first.',
      );
    }

    const details: { table: string; id: string; oldUrl: string; newUrl?: string; error?: string }[] = [];
    let totalScanned = 0;
    let migratedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    const dir = resolveUploadsDirectory();

    async function uploadLocalOrRemote(mediaUrl: string, type: 'image' | 'video' = 'image'): Promise<string | null> {
      let buffer: Buffer | null = null;
      const filename = path.basename(mediaUrl.split('?')[0]);

      // Check if file exists on local filesystem
      const localPath = path.join(dir, filename);
      if (fs.existsSync(localPath)) {
        try {
          buffer = fs.readFileSync(localPath);
        } catch {
          // ignore
        }
      }

      // If not on local filesystem, try fetching from remote Render URL
      if (!buffer) {
        let fetchUrl = mediaUrl;
        if (mediaUrl.startsWith('/uploads/') || mediaUrl.startsWith('uploads/')) {
          fetchUrl = `https://shelina1.onrender.com/${mediaUrl.replace(/^\/+/, '')}`;
        }
        if (fetchUrl.startsWith('http://') || fetchUrl.startsWith('https://')) {
          try {
            const resp = await fetch(fetchUrl);
            if (resp.ok) {
              const arrayBuf = await resp.arrayBuffer();
              buffer = Buffer.from(arrayBuf);
            }
          } catch {
            // ignore
          }
        }
      }

      if (!buffer) return null;

      const isVideo = type === 'video' || filename.endsWith('.mp4') || filename.endsWith('.webm');
      const mimetype = isVideo ? 'video/mp4' : 'image/jpeg';
      const uploaded = await storageService.upload({
        buffer,
        originalname: filename,
        mimetype,
        size: buffer.length,
      });

      return uploaded.url;
    }

    // 1. ProductMedia
    const productMediaList = await prisma.productMedia.findMany();
    for (const pm of productMediaList) {
      totalScanned++;
      if (
        pm.url &&
        !pm.url.includes('cloudinary.com') &&
        !pm.url.startsWith('/images/') &&
        !pm.url.startsWith('/videos/') &&
        (pm.url.includes('/uploads/') || pm.url.startsWith('uploads/') || pm.url.includes('onrender.com/uploads'))
      ) {
        try {
          const newUrl = await uploadLocalOrRemote(pm.url, pm.type as 'image' | 'video');
          if (newUrl) {
            await prisma.productMedia.update({
              where: { id: pm.id },
              data: { url: newUrl },
            });
            migratedCount++;
            details.push({ table: 'ProductMedia', id: pm.id, oldUrl: pm.url, newUrl });
          } else {
            failedCount++;
            details.push({ table: 'ProductMedia', id: pm.id, oldUrl: pm.url, error: 'File data not accessible' });
          }
        } catch (err: any) {
          failedCount++;
          details.push({ table: 'ProductMedia', id: pm.id, oldUrl: pm.url, error: err?.message });
        }
      } else {
        skippedCount++;
      }
    }

    // 2. Categories
    const categories = await prisma.category.findMany();
    for (const cat of categories) {
      if (
        cat.image &&
        !cat.image.includes('cloudinary.com') &&
        !cat.image.startsWith('/images/') &&
        (cat.image.includes('/uploads/') || cat.image.startsWith('uploads/') || cat.image.includes('onrender.com/uploads'))
      ) {
        totalScanned++;
        try {
          const newUrl = await uploadLocalOrRemote(cat.image, 'image');
          if (newUrl) {
            await prisma.category.update({ where: { id: cat.id }, data: { image: newUrl } });
            migratedCount++;
            details.push({ table: 'Category', id: cat.id, oldUrl: cat.image, newUrl });
          } else {
            failedCount++;
            details.push({ table: 'Category', id: cat.id, oldUrl: cat.image, error: 'File data not accessible' });
          }
        } catch (err: any) {
          failedCount++;
          details.push({ table: 'Category', id: cat.id, oldUrl: cat.image, error: err?.message });
        }
      }
    }

    // 3. Brands
    const brands = await prisma.brand.findMany();
    for (const brand of brands) {
      if (
        brand.logo &&
        !brand.logo.includes('cloudinary.com') &&
        !brand.logo.startsWith('/images/') &&
        (brand.logo.includes('/uploads/') || brand.logo.startsWith('uploads/') || brand.logo.includes('onrender.com/uploads'))
      ) {
        totalScanned++;
        try {
          const newUrl = await uploadLocalOrRemote(brand.logo, 'image');
          if (newUrl) {
            await prisma.brand.update({ where: { id: brand.id }, data: { logo: newUrl } });
            migratedCount++;
            details.push({ table: 'Brand', id: brand.id, oldUrl: brand.logo, newUrl });
          } else {
            failedCount++;
            details.push({ table: 'Brand', id: brand.id, oldUrl: brand.logo, error: 'File data not accessible' });
          }
        } catch (err: any) {
          failedCount++;
          details.push({ table: 'Brand', id: brand.id, oldUrl: brand.logo, error: err?.message });
        }
      }
    }

    // 4. Homepage
    const homepages = await prisma.homepage.findMany();
    for (const hp of homepages) {
      const updates: Record<string, string> = {};
      for (const field of ['image', 'secondaryImage', 'editorialImage'] as const) {
        const val = hp[field];
        if (
          val &&
          !val.includes('cloudinary.com') &&
          !val.startsWith('/images/') &&
          (val.includes('/uploads/') || val.startsWith('uploads/') || val.includes('onrender.com/uploads'))
        ) {
          totalScanned++;
          try {
            const newUrl = await uploadLocalOrRemote(val, 'image');
            if (newUrl) {
              updates[field] = newUrl;
              migratedCount++;
              details.push({ table: 'Homepage', id: hp.id, oldUrl: val, newUrl });
            }
          } catch (err: any) {
            failedCount++;
            details.push({ table: 'Homepage', id: hp.id, oldUrl: val, error: err?.message });
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        await prisma.homepage.update({ where: { id: hp.id }, data: updates });
      }
    }

    // 5. Banners
    const banners = await prisma.banner.findMany();
    for (const banner of banners) {
      if (
        banner.image &&
        !banner.image.includes('cloudinary.com') &&
        !banner.image.startsWith('/images/') &&
        (banner.image.includes('/uploads/') || banner.image.startsWith('uploads/') || banner.image.includes('onrender.com/uploads'))
      ) {
        totalScanned++;
        try {
          const newUrl = await uploadLocalOrRemote(banner.image, 'image');
          if (newUrl) {
            await prisma.banner.update({ where: { id: banner.id }, data: { image: newUrl } });
            migratedCount++;
            details.push({ table: 'Banner', id: banner.id, oldUrl: banner.image, newUrl });
          } else {
            failedCount++;
            details.push({ table: 'Banner', id: banner.id, oldUrl: banner.image, error: 'File data not accessible' });
          }
        } catch (err: any) {
          failedCount++;
          details.push({ table: 'Banner', id: banner.id, oldUrl: banner.image, error: err?.message });
        }
      }
    }

    // 6. SeoSettings
    const seoList = await prisma.seoSettings.findMany();
    for (const seo of seoList) {
      const updates: Record<string, string> = {};
      for (const field of ['defaultImage', 'ogImage', 'twitterImage'] as const) {
        const val = seo[field];
        if (
          val &&
          !val.includes('cloudinary.com') &&
          !val.startsWith('/images/') &&
          (val.includes('/uploads/') || val.startsWith('uploads/') || val.includes('onrender.com/uploads'))
        ) {
          totalScanned++;
          try {
            const newUrl = await uploadLocalOrRemote(val, 'image');
            if (newUrl) {
              updates[field] = newUrl;
              migratedCount++;
              details.push({ table: 'SeoSettings', id: seo.id, oldUrl: val, newUrl });
            }
          } catch (err: any) {
            failedCount++;
            details.push({ table: 'SeoSettings', id: seo.id, oldUrl: val, error: err?.message });
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        await prisma.seoSettings.update({ where: { id: seo.id }, data: updates });
      }
    }

    // Record audit log
    await prisma.auditLog
      .create({
        data: {
          action: 'MEDIA_MIGRATION',
          actorId,
          actorType: 'admin',
          metadata: {
            totalScanned,
            migratedCount,
            failedCount,
            skippedCount,
            timestamp: new Date().toISOString(),
          },
        },
      })
      .catch(() => null);

    return {
      totalScanned,
      migratedCount,
      failedCount,
      skippedCount,
      details,
    };
  },
};
