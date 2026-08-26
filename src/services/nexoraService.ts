import { api } from './apiClient';

export interface NexoraApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdBy?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
}

export interface NexoraAuditLog {
  id: string;
  action: string;
  apiKeyId?: string | null;
  actorId?: string | null;
  actorType: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NexoraIntegrationData {
  connected: boolean;
  activeKey: NexoraApiKey | null;
  history: NexoraApiKey[];
  auditLogs: NexoraAuditLog[];
  store: {
    id: string;
    name: string;
    currency: string;
    timezone: string;
    apiVersion: string;
    stats: {
      products: number;
      orders: number;
      customers: number;
    };
  };
}

export interface GenerateKeyResult {
  apiKey: NexoraApiKey;
  secretKey: string; // The one-time visible full secret key
}

export interface NexoraTestResult {
  success: boolean;
  connected: boolean;
  message: string;
  activeKeyPrefix?: string;
  capabilities?: string[];
  stats?: {
    products: number;
    orders: number;
    customers: number;
  };
}

export const nexoraService = {
  /**
   * Fetches the current NEXORA integration state, active key, and audit trail.
   */
  async getIntegrationData(): Promise<NexoraIntegrationData> {
    const res = await api.get<{ success: boolean; data: NexoraIntegrationData }>('/admin/integrations/nexora');
    return (res as any).data || res;
  },

  /**
   * Generates a new NEXORA API key. The secret key is only returned ONCE.
   */
  async generateKey(permissions?: string[], name?: string): Promise<GenerateKeyResult> {
    const res = await api.post<{ success: boolean; data: GenerateKeyResult }>('/admin/integrations/nexora/keys', {
      permissions,
      name,
    });
    return (res as any).data || res;
  },

  /**
   * Revokes an existing API key immediately.
   */
  async revokeKey(id: string): Promise<NexoraApiKey> {
    const res = await api.post<{ success: boolean; data: NexoraApiKey }>(
      `/admin/integrations/nexora/keys/${encodeURIComponent(id)}/revoke`,
    );
    return (res as any).data || res;
  },

  /**
   * Revokes the current key and generates a replacement key in a single atomic step.
   */
  async regenerateKey(id: string): Promise<GenerateKeyResult> {
    const res = await api.post<{ success: boolean; data: GenerateKeyResult }>(
      `/admin/integrations/nexora/keys/${encodeURIComponent(id)}/regenerate`,
    );
    return (res as any).data || res;
  },

  /**
   * Tests the connection with NEXORA and validates syncing capabilities.
   */
  async testConnection(): Promise<NexoraTestResult> {
    try {
      const res = await api.post<NexoraTestResult>('/admin/integrations/nexora/test');
      const resolved = (((res as any)?.data || res) || {}) as Partial<NexoraTestResult>;
      return {
        success: resolved.success !== false,
        connected: Boolean(resolved.connected),
        message: resolved.message || (resolved.connected ? 'NEXORA integration connection test successful!' : 'Connection test inactive'),
        activeKeyPrefix: resolved.activeKeyPrefix,
        capabilities: resolved.capabilities || [],
        stats: resolved.stats,
      };
    } catch (error) {
      return {
        success: false,
        connected: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  },
};
