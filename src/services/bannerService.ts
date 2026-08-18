import type { Banner } from '@/types';
import { api } from './apiClient';
import { ServiceError } from './http';

export const bannerService = {
  /** Public read — the API returns ACTIVE banners only. */
  async list(): Promise<Banner[]> {
    return api.get<Banner[]>('/banners');
  },

  async getById(id: string): Promise<Banner> {
    const banners = await api.get<Banner[]>('/banners?all=true');
    const banner = banners.find((item) => item.id === id);
    if (!banner) throw new ServiceError(`Banner not found: ${id}`, 404);
    return banner;
  },
};
