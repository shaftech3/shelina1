import type { MediaAsset } from '@/types';
import { api } from './apiClient';
import { ServiceError } from './http';

/**
 * Media service — handles direct file uploads for products, categories, brands, and content.
 */

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
const ACCEPTED_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];

export interface UploadResult extends MediaAsset {
  persistent: boolean;
  filename?: string;
  provider?: string;
}

export interface StorageConfigResponse {
  provider: 'cloudinary' | 'local';
  persistent: boolean;
  isConfigured: boolean;
  cloudName?: string;
  uploadsDir?: string;
  maxFileSizeMb: number;
  acceptedTypes: string[];
  uploadsEnabled: boolean;
  message?: string;
}

export interface MediaMigrationResult {
  totalScanned: number;
  migratedCount: number;
  failedCount: number;
  skippedCount: number;
  details: { table: string; id: string; oldUrl: string; newUrl?: string; error?: string }[];
}

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
   * Throws a descriptive ServiceError if upload fails so caller can display the error
   * rather than saving an unpersisted blob URL.
   */
  async upload(file: File, alt = ''): Promise<UploadResult> {
    const isImage = ACCEPTED_IMAGE.includes(file.type) || file.type.startsWith('image/');
    const isVideo = ACCEPTED_VIDEO.includes(file.type) || file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      throw new ServiceError('Unsupported file type. Please upload a JPG, PNG, WebP, GIF, SVG or MP4/WebM video.', 415);
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new ServiceError('File is larger than 50 MB.', 413);
    }

    const { width, height } = await readDimensions(file);

    const formData = new FormData();
    formData.append('file', file);

    const res = await api.upload<{
      url: string;
      filename: string;
      persistent?: boolean;
      provider?: string;
      width?: number;
      height?: number;
    }>('/media', formData);

    return {
      url: res.url,
      alt: alt.trim() || file.name.replace(/\.[^.]+$/, ''),
      width: res.width ?? width,
      height: res.height ?? height,
      filename: res.filename,
      persistent: res.persistent ?? true,
      provider: res.provider,
    };
  },

  /**
   * Uploads multiple files in batch.
   */
  async uploadMultiple(files: File[]): Promise<UploadResult[]> {
    if (!files.length) return [];
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    const res = await api.upload<
      {
        url: string;
        filename: string;
        persistent?: boolean;
        provider?: string;
        width?: number;
        height?: number;
      }[]
    >('/media/multiple', formData);

    return res.map((item, idx) => ({
      url: item.url,
      alt: files[idx]?.name.replace(/\.[^.]+$/, '') || '',
      width: item.width,
      height: item.height,
      filename: item.filename,
      persistent: item.persistent ?? true,
      provider: item.provider,
    }));
  },

  /**
   * Checks the storage subsystem status.
   */
  async getConfig(): Promise<StorageConfigResponse> {
    return api.get<StorageConfigResponse>('/media/config');
  },

  /**
   * Triggers media migration to persistent cloud storage.
   */
  async migrateMedia(): Promise<MediaMigrationResult> {
    return api.post<MediaMigrationResult>('/media/migrate');
  },

  /**
   * Reference a static asset already in public directory.
   */
  selectExisting(path: string, alt = ''): UploadResult {
    const url = path.trim();
    if (!url) throw new ServiceError('An image path is required.', 400);
    return { url, alt: alt.trim(), persistent: true };
  },

  release(_url: string): void {
    // No-op for persistent URLs
  },

  releaseAll(): void {
    // No-op
  },

  isTemporary(url: string): boolean {
    return url.startsWith('blob:');
  },

  acceptedImageTypes: ACCEPTED_IMAGE,
  acceptedVideoTypes: ACCEPTED_VIDEO,
  maxFileBytes: MAX_FILE_BYTES,
};
