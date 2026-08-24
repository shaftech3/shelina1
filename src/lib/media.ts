/**
 * Media URL Normalization & Resolution
 *
 * Provides a single, centralized normalization function for all images, videos,
 * banners, and brand assets across the Shelina storefront and admin panel.
 *
 * It seamlessly handles:
 * 1. Absolute URLs (e.g. https://... or http://...) -> unchanged.
 * 2. Blob / Data URLs (blob:... / data:...) -> unchanged (for instant local previews).
 * 3. Backend-relative upload paths (e.g. /uploads/image.jpg or uploads/image.jpg) ->
 *    resolved against the backend API origin (e.g. https://shelina1.onrender.com/uploads/image.jpg).
 * 4. Local frontend assets (/images/..., /videos/...) -> clean relative asset path.
 * 5. Safe fallback image URLs when an asset is missing or invalid.
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
  const trimmed = url.trim();
  if (!trimmed) return '';

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

  // 3. Uploaded backend assets (/uploads/... or uploads/... or /api/uploads/...)
  if (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('uploads/') ||
    trimmed.startsWith('/api/uploads/') ||
    trimmed.startsWith('api/uploads/')
  ) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const origin = getBackendOrigin();

    // If on same origin in local development, relative path is clean and safe
    if (typeof window !== 'undefined' && origin === window.location.origin) {
      return cleanPath;
    }

    return `${origin}${cleanPath}`;
  }

  // 4. Any other leading slash path
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
