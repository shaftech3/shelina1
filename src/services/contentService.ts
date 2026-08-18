import type { EditorialFeature, TrustValue } from '@/types';
import { mockTrustValues } from '@/data/mock/editorial';
import { api } from './apiClient';

interface ApiHomepage {
  editorial: EditorialFeature | null;
}

export const contentService = {
  async getEditorial(): Promise<EditorialFeature> {
    const data = await api.get<ApiHomepage>('/homepage');
    return data.editorial as EditorialFeature;
  },

  /**
   * Trust values are fixed presentational copy, not admin-managed content, so
   * they are not a database entity. Stage 4 excluded them from the admin panel
   * and Stage 5 does not add a table for something nobody can edit.
   */
  async listTrustValues(): Promise<TrustValue[]> {
    return mockTrustValues;
  },
};
