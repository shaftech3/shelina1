import { api } from './apiClient';
import type { AdminCleanupStats } from '@/types';

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

export const adminCleanupService = {
  async getStats(): Promise<AdminCleanupStats> {
    return api.get<AdminCleanupStats>('/admin/cleanup/stats');
  },

  async cleanupOrphans(): Promise<OrphanCleanupResult> {
    return api.post<OrphanCleanupResult>('/admin/cleanup/orphans', {});
  },

  async triggerNexoraSync(): Promise<NexoraSyncResult> {
    return api.post<NexoraSyncResult>('/admin/cleanup/sync', {});
  },
};
