import { api } from './apiClient';
import type { AdminCleanupStats, MediaDiagnosticsReport } from '@/types';

export interface OrphanCleanupResult {
  orphanedMediaRemoved: number;
  timestamp: string;
}

export interface NexoraSyncResult {
  connected: boolean;
  keyPrefix: string | null;
  permissions: string[];
  timestamp: string;
  counts: {
    products: number;
    orders: number;
    customers: number;
  };
}

export interface MediaMigrationResult {
  totalScanned: number;
  migratedCount: number;
  failedCount: number;
  skippedCount: number;
  details: {
    table: string;
    id: string;
    oldUrl: string;
    newUrl?: string;
    error?: string;
  }[];
}

export const adminCleanupService = {
  async getStats(): Promise<AdminCleanupStats> {
    return api.get<AdminCleanupStats>('/admin/cleanup/stats');
  },

  async getMediaDiagnostics(): Promise<MediaDiagnosticsReport> {
    return api.get<MediaDiagnosticsReport>('/admin/cleanup/media-diagnostics');
  },

  async cleanupOrphans(): Promise<OrphanCleanupResult> {
    return api.post<OrphanCleanupResult>('/admin/cleanup/orphans', {});
  },

  async triggerNexoraSync(): Promise<NexoraSyncResult> {
    return api.post<NexoraSyncResult>('/admin/cleanup/sync', {});
  },

  async migrateMedia(): Promise<MediaMigrationResult> {
    return api.post<MediaMigrationResult>('/admin/cleanup/migrate-media', {});
  },
};

