import { api, toQuery } from './apiClient';
import type {
  AdminCustomer,
  AdminCustomerList,
  AdminCustomerListMeta,
  AdminCustomerQuery,
} from '@/types';

async function fetchCustomerList(path: string): Promise<AdminCustomerList> {
  const body = await api.raw<AdminCustomer[]>(path);
  const customers = body.data ?? [];
  const meta: AdminCustomerListMeta = body.meta ?? {
    total: customers.length,
    page: 1,
    pageSize: customers.length,
    pageCount: 1,
  };
  return { customers, meta };
}

export const adminCustomerService = {
  async listAll(query: AdminCustomerQuery = {}): Promise<AdminCustomerList> {
    return fetchCustomerList(
      `/admin/customers${toQuery({
        search: query.search || undefined,
        sort: query.sort,
        page: query.page,
        pageSize: query.pageSize,
      })}`,
    );
  },

  async getById(id: string): Promise<AdminCustomer & { orders: any[] }> {
    return api.get<AdminCustomer & { orders: any[] }>(`/admin/customers/${encodeURIComponent(id)}`);
  },

  async delete(id: string): Promise<{ id: string; name: string; email: string }> {
    return api.delete<{ id: string; name: string; email: string }>(
      `/admin/customers/${encodeURIComponent(id)}`,
    );
  },

  async bulkDelete(ids: string[]): Promise<{ count: number; deletedIds: string[] }> {
    return api.post<{ count: number; deletedIds: string[] }>('/admin/customers/bulk-delete', { ids });
  },
};
