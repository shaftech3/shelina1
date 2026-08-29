/**
 * Media URL Normalization, Cloudinary Optimization & Resolution
 *
 * Provides a single, centralized normalization and CDN optimization engine for all
 * images, videos, banners, and brand assets across the Shelina storefront and admin panel.
 *
 * Capabilities:
 * 1. Cloudinary on-the-fly transformations (automatic WebP/AVIF `f_auto`, `q_auto`, responsive `w_`, `c_limit`).
 * 2. Responsive `srcSet` generation for crisp retina displays with zero excess bytes.
 * 3. Video poster generation directly from Cloudinary video frames (`so_0`).
 * 4. Absolute URLs, Blob previews, and local assets resolution.
 * 5. Safe fallback image URLs with zero layout shift (CLS).
 */

/** Placeholder image SVG data URL fallback that renders a styled, elegant placeholder */
export const FALLBACK_IMAGE_URL =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600" fill="%23f7f4ef"><rect width="600" height="600" fill="%23f7f4ef"/><g fill="%238a7e72" font-family="serif" text-anchor="middle"><text x="300" y="280" font-size="42" font-weight="600" letter-spacing="2">SHELINA</text><text x="300" y="325" font-size="16" letter-spacing="4" fill="%23a89e92">FOOTWEAR</text></g><path d="M260 380h80M280 395h40" stroke="%23dcd5cb" stroke-width="2" stroke-linecap="round"/></svg>';

export function getBackendOrigin(): string {
  const customBackend = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  if (customBackend) {
    return customBackend.replace(/\/+$/, '');
  }

  const envApi = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (envApi && (envApi.startsWith('http://') || envApi.startsWith('https://'))) {
    try {
      const url = new URL(envApi);
      return url.origin;
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    // If running on Vercel and no backend API URL was specified, point to Render API server
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://shelina1.onrender.com';
    }
    return window.location.origin;
  }

  return 'https://shelina1.onrender.com';
}

/**
 * Normalizes any media URL to ensure the browser can load it regardless of
 * deployment environment (Vercel vs Render vs Localhost).
 */
export function normalizeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // Fix accidentally doubled URLs (e.g. https://shelina1.onrender.com/https://...)
  if (trimmed.startsWith('https://shelina1.onrender.com/http://') || trimmed.startsWith('https://shelina1.onrender.com/https://')) {
    trimmed = trimmed.replace('https://shelina1.onrender.com/', '');
  }

  // 1. Absolute web URLs, blob URLs, and inline base64/SVG data URIs
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  // 2. Bundled frontend public static assets (/images/..., /videos/...)
  if (trimmed.startsWith('/images/') || trimmed.startsWith('/videos/')) {
    return trimmed;
  }

  // 3. Uploaded backend assets (/uploads/..., /api/uploads/..., /api/media/..., etc.)
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('uploads/') ||
    trimmed.startsWith('/api/uploads/') ||
    trimmed.startsWith('api/uploads/') ||
    trimmed.startsWith('/api/media/') ||
    trimmed.startsWith('api/media/')
  ) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const origin = getBackendOrigin();

    // If on same origin in local development, relative path is clean and safe
    if (typeof window !== 'undefined' && origin === window.location.origin) {
      return cleanPath;
    }

    return `${origin}${cleanPath}`;
  }

  // 4. Standalone media filename (e.g. "product-123.jpg")
  if (!trimmed.startsWith('/') && (isVideoMedia(trimmed) || /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(trimmed))) {
    const origin = getBackendOrigin();
    if (typeof window !== 'undefined' && origin === window.location.origin) {
      return `/uploads/${trimmed}`;
    }
    return `${origin}/uploads/${trimmed}`;
  }

  // 5. Any other leading slash path
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return `/${trimmed}`;
}

/**
 * Checks whether a given media URL is a video.
 */
export function isVideoMedia(url?: string | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.includes('video/') ||
    lower.includes('format=video')
  );
}

/**
 * Checks if a URL is hosted on Cloudinary CDN.
 */
export function isCloudinaryUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: string | number; // 'auto', 'auto:good', 'auto:eco', 80, etc.
  format?: string; // 'auto', 'webp', 'avif', 'jpg'
  crop?: 'limit' | 'fit' | 'fill' | 'scale' | 'thumb';
  dpr?: string | number;
}

/**
 * Transforms a Cloudinary URL to deliver modern WebP/AVIF format with automatic
 * quality optimization and responsive resizing without upscaling or cropping footwear.
 */
export function getOptimizedImageUrl(
  rawUrl?: string | null,
  options: CloudinaryTransformOptions = {},
): string {
  const url = normalizeMediaUrl(rawUrl);
  if (!url) return '';
  if (!isCloudinaryUrl(url)) return url;

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    dpr = 'auto',
  } = options;

  try {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return url;

    const prefix = url.substring(0, uploadIndex + '/upload/'.length);
    let suffix = url.substring(uploadIndex + '/upload/'.length);

    // If existing transformation exists before version (e.g. /upload/w_300,f_auto/v1234/...)
    // Strip old dimension transformations to apply the fresh requested size
    const parts = suffix.split('/');
    if (parts[0] && !parts[0].startsWith('v') && !parts[0].startsWith('shelina') && parts[0].includes('_')) {
      // Remove previous transformation segment
      parts.shift();
      suffix = parts.join('/');
    }

    const transforms: string[] = [];
    if (format) transforms.push(`f_${format}`);
    if (quality) transforms.push(`q_${quality}`);
    if (crop) transforms.push(`c_${crop}`);
    if (width) transforms.push(`w_${Math.round(width)}`);
    if (height) transforms.push(`h_${Math.round(height)}`);
    if (dpr) transforms.push(`dpr_${dpr}`);

    const transformString = transforms.join(',');
    return `${prefix}${transformString}/${suffix}`;
  } catch {
    return url;
  }
}

/**
 * Returns an optimized thumbnail URL suitable for Product Cards, Category Cards,
 * and cart drawer lines (~400-600px width with automatic WebP/AVIF).
 */
export function getOptimizedThumbnailUrl(rawUrl?: string | null, width = 600): string {
  return getOptimizedImageUrl(rawUrl, {
    width,
    quality: 'auto:good',
    format: 'auto',
    crop: 'limit',
  });
}

/**
 * Returns a responsive srcset string for Cloudinary images.
 */
export function getResponsiveImageSrcSet(
  rawUrl?: string | null,
  widths: number[] = [320, 480, 640, 800, 1080, 1400],
): string | undefined {
  const url = normalizeMediaUrl(rawUrl);
  if (!url || !isCloudinaryUrl(url)) return undefined;

  return widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w, quality: 'auto', format: 'auto', crop: 'limit' })} ${w}w`)
    .join(', ');
}

/**
 * Generates an automatic video poster image for Cloudinary video assets.
 * Uses Cloudinary's dynamic `so_0` (snapshot at 0 seconds) transformation.
 */
export function getVideoPosterUrl(videoUrl?: string | null, width = 800): string {
  const url = normalizeMediaUrl(videoUrl);
  if (!url) return '';
  if (!isCloudinaryUrl(url)) return '';

  try {
    const uploadIndex = url.indexOf('/video/upload/');
    if (uploadIndex === -1) return '';

    const prefix = url.substring(0, uploadIndex + '/video/upload/'.length);
    let suffix = url.substring(uploadIndex + '/video/upload/'.length);

    // Change extension to .jpg for poster image
    suffix = suffix.replace(/\.(mp4|webm|mov|m4v|ogv)$/i, '.jpg');

    return `${prefix}so_0,f_auto,q_auto:good,w_${width},c_limit/${suffix}`;
  } catch {
    return '';
  }
}

