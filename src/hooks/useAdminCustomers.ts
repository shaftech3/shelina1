import { useMemo } from 'react';
import { adminCustomerService } from '@/services';
import type { AdminCustomer, AdminCustomerList, AdminCustomerQuery } from '@/types';
import { useAsync, type AsyncState } from './useAsync';
import { useDataRevision } from './useDataRevision';

export function useAdminCustomers(query: AdminCustomerQuery = {}): AsyncState<AdminCustomerList> {
  const revision = useDataRevision();
  const { search, sort, page, pageSize } = query;

  const resolved = useMemo<AdminCustomerQuery>(
    () => ({ search, sort, page, pageSize }),
    [search, sort, page, pageSize],
  );

  return useAsync(() => adminCustomerService.listAll(resolved), [resolved, revision]);
}

export function useAdminCustomer(id: string | undefined): AsyncState<AdminCustomer & { orders: any[] }> {
  const revision = useDataRevision();
  return useAsync(
    () =>
      id
        ? adminCustomerService.getById(id)
        : Promise.reject(new Error('Customer not found.')),
    [id, revision],
  );
}
