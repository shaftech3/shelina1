import type { MediaAsset } from '@/types';
import { api } from './apiClient';
import { ServiceError } from './http';

/**
 * Media service — handles direct file uploads for products, categories, brands, and content.
 */

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];

export interface UploadResult extends MediaAsset {
  persistent: boolean;
}

/** Object URLs created as fallback, revoked on cleanup. */
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
    image.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

export const mediaService = {
  /**
   * Uploads a file directly to the backend media endpoint.
   */
  async upload(file: File, alt = ''): Promise<UploadResult> {
    const isImage = ACCEPTED_IMAGE.includes(file.type);
    const isVideo = ACCEPTED_VIDEO.includes(file.type);

    if (!isImage && !isVideo) {
      throw new ServiceError('Unsupported file type. Use JPG, PNG, WebP, GIF, SVG, MP4 or WebM.', 415);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ServiceError('File is larger than 50 MB.', 413);
    }

    const { width, height } = await readDimensions(file);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.upload<{ url: string; filename: string }>('/media', formData);

      return {
        url: res.url,
        alt: alt.trim() || file.name.replace(/\.[^.]+$/, ''),
        width,
        height,
        persistent: true,
      };
    } catch {
      // Fallback preview
      const fallbackUrl = URL.createObjectURL(file);
      objectUrls.add(fallbackUrl);
      return {
        url: fallbackUrl,
        alt: alt.trim() || file.name.replace(/\.[^.]+$/, ''),
        width,
        height,
        persistent: false,
      };
    }
  },

  /**
   * Uploads multiple files in batch.
   */
  async uploadMultiple(files: File[]): Promise<UploadResult[]> {
    if (!files.length) return [];
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await api.upload<{ url: string; filename: string }[]>('/media/multiple', formData);
      return res.map((item, idx) => ({
        url: item.url,
        alt: files[idx]?.name.replace(/\.[^.]+$/, '') || '',
        persistent: true,
      }));
    } catch {
      const results: UploadResult[] = [];
      for (const file of files) {
        results.push(await this.upload(file));
      }
      return results;
    }
  },

  /**
   * Reference a file already published under /public.
   */
  selectExisting(path: string, alt = ''): UploadResult {
    const url = path.trim();
    if (!url) throw new ServiceError('An image path is required.', 400);
    return { url, alt: alt.trim(), persistent: true };
  },

  release(url: string): void {
    if (objectUrls.has(url)) {
      URL.revokeObjectURL(url);
      objectUrls.delete(url);
    }
  },

  releaseAll(): void {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.clear();
  },

  isTemporary(url: string): boolean {
    return url.startsWith('blob:');
  },

  acceptedImageTypes: ACCEPTED_IMAGE,
  acceptedVideoTypes: ACCEPTED_VIDEO,
  maxFileBytes: MAX_FILE_BYTES,
};
