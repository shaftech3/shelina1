import { api } from './apiClient';

export interface StoreSettingsData {
  id?: string;
  storeName: string;
  defaultDeliveryFee: number;
  freeShippingThreshold: number;
  codEnabled: boolean;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  deliveryNote: string;
  updatedAt?: string;
}

export const settingsService = {
  /**
   * Retrieves public/admin store settings (delivery fees, contact, thresholds).
   */
  async getSettings(): Promise<StoreSettingsData> {
    return api.get<StoreSettingsData>('/settings');
  },

  /**
   * Updates store settings (Admin only).
   */
  async updateSettings(settings: Partial<StoreSettingsData>): Promise<StoreSettingsData> {
    return api.put<StoreSettingsData>('/settings', settings);
  },
};
