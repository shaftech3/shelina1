import type { MediaAsset } from '@/types';
import { ServiceError } from './http';

/**
 * Media service — the seam between the admin forms and file storage.
 *
 * ============================================================================
 * URL REFERENCES ONLY — THERE IS STILL NO BINARY UPLOAD BACKEND
 * ============================================================================
 * Stage 5 moved the catalogue into PostgreSQL, but media is deliberately NOT
 * stored there: a `product_media` row holds a URL, never a blob. No cloud
 * storage provider is configured, and one is not faked. The backend states
 * this plainly — `GET /api/media/config` reports
 * `{ provider: 'none', uploadsEnabled: false, acceptsUrlReferences: true }`
 * and `POST /api/media` answers 501 Not Implemented.
 *
 * So this adapter still offers two honest options:
 *
 *   1. `selectExisting()` — reference a file already served from /public.
 *      This is what the seeded catalogue uses and what persists in the
 *      database, because only the URL needs to survive.
 *
 *   2. `upload()` — wrap a browser File in an object URL for immediate
 *      preview. The URL is per-tab and dies on reload; the method says so in
 *      its return value (`persistent: false`) and the admin UI warns the user.
 *      It is deliberately NOT presented as a saved upload.
 *
 * When a real provider is added, `upload()` becomes a multipart POST to
 * /api/media returning `{ url, width, height }`. Because the product form only
 * ever sees a `MediaAsset`, and the database only ever stores a URL, no form
 * code and no schema change is required at that point.
 * ============================================================================
 */

/** Guard rails so an accidental 200 MB drop cannot lock up the browser. */
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/webm'];

export interface UploadResult extends MediaAsset {
  /**
   * False for development object URLs, which do not survive a page reload.
   * The admin UI surfaces this so nobody believes a file was stored.
   */
  persistent: boolean;
}

/** Object URLs created this session, revoked on logout to avoid leaks. */
const objectUrls = new Set<string>();

function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith('image/')) return Promise.resolve({});
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    // A dimension read failure must not block the upload.
    image.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

export const mediaService = {
  /**
   * Development-only "upload".
   * Produces a previewable object URL. See the file header before changing.
   */
  async upload(file: File, alt = ''): Promise<UploadResult> {
    const isImage = ACCEPTED_IMAGE.includes(file.type);
    const isVideo = ACCEPTED_VIDEO.includes(file.type);

    if (!isImage && !isVideo) {
      throw new ServiceError('Unsupported file type. Use JPG, PNG, WebP, AVIF, MP4 or WebM.', 415);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ServiceError('File is larger than 8 MB.', 413);
    }

    const { width, height } = await readDimensions(file);
    const url = URL.createObjectURL(file);
    objectUrls.add(url);

    return {
      url,
      alt: alt.trim() || file.name.replace(/\.[^.]+$/, ''),
      width,
      height,
      persistent: false,
    };
  },

  /**
   * Reference a file already published under /public.
   * Persistent across reloads because the web server owns the bytes.
   */
  selectExisting(path: string, alt = ''): UploadResult {
    const url = path.trim();
    if (!url) throw new ServiceError('An image path is required.', 400);
    return { url, alt: alt.trim(), persistent: true };
  },

  /** Releases a development object URL. No-op for real paths. */
  release(url: string): void {
    if (objectUrls.has(url)) {
      URL.revokeObjectURL(url);
      objectUrls.delete(url);
    }
  },

  /** Releases every object URL created this session. Called on logout. */
  releaseAll(): void {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
  },

  /** True when a URL is a throwaway development blob. Drives the UI warning. */
  isTemporary(url: string): boolean {
    return url.startsWith('blob:');
  },

  acceptedImageTypes: ACCEPTED_IMAGE,
  acceptedVideoTypes: ACCEPTED_VIDEO,
  maxFileBytes: MAX_FILE_BYTES,
};
