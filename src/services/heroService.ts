import type { HeroSlide } from '@/types';
import { api } from './apiClient';

interface ApiHomepage {
  hero: HeroSlide;
}

export const heroService = {
  async list(): Promise<HeroSlide[]> {
    const data = await api.get<ApiHomepage>('/homepage');
    return [data.hero];
  },
};
