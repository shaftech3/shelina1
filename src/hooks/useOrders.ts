import { useMemo } from 'react';
import { orderService } from '@/services';
import type { AdminOrderQuery, Order, OrderList } from '@/types';
import { useAsync, type AsyncState } from './useAsync';
import { useCustomerAccount } from './useCustomerAccount';
import { useDataRevision } from './useDataRevision';

/**
 * Order access hooks.
 *
 * Same shape as the catalogue hooks: components never call `orderService`
 * directly, and every hook takes part in the shared revision signal so a
 * mutation elsewhere (a status change, a cancellation) refreshes the view.
 */

/**
 * The signed-in customer's own order history.
 *
 * Deferred until the session has been restored: firing it while the cookie is
 * still unverified produces a guaranteed 401 on every page load for signed-out
 * visitors, who are redirected to sign-in a moment later anyway.
 */
export function useMyOrders(page = 1, pageSize = 20): AsyncState<OrderList> {
  const revision = useDataRevision();
  const { isAuthenticated, initialising } = useCustomerAccount();
  return useAsync(
    () => orderService.listMine(page, pageSize),
    [page, pageSize, revision],
    !initialising && isAuthenticated,
  );
}

/** One of the signed-in customer's or guest's orders, by id or order number. */
export function useMyOrder(idOrNumber: string | undefined): AsyncState<Order> {
  const revision = useDataRevision();
  const { initialising } = useCustomerAccount();
  return useAsync(
    () =>
      idOrNumber
        ? orderService.getMine(idOrNumber)
        : Promise.reject(new Error('Order not found.')),
    [idOrNumber, revision],
    !initialising && Boolean(idOrNumber),
  );
}

/** Admin: every order, with search, status filter, sorting and pagination. */
export function useAdminOrders(query: AdminOrderQuery = {}): AsyncState<OrderList> {
  const revision = useDataRevision();
  const { search, status, sort, page, pageSize } = query;

  // Rebuilt from primitives so an inline object literal cannot re-fire the
  // request on every render.
  const resolved = useMemo<AdminOrderQuery>(
    () => ({ search, status, sort, page, pageSize }),
    [search, status, sort, page, pageSize],
  );

  return useAsync(() => orderService.listAll(resolved), [resolved, revision]);
}

/** Admin: any order by id or order number. */
export function useAdminOrder(idOrNumber: string | undefined): AsyncState<Order> {
  const revision = useDataRevision();
  return useAsync(
    () =>
      idOrNumber
        ? orderService.getAny(idOrNumber)
        : Promise.reject(new Error('Order not found.')),
    [idOrNumber, revision],
  );
}
