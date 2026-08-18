import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '@/lib/format';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Select,
  Skeleton,
} from '@/components/ui';
import { useAdminOrders, useSeo } from '@/hooks';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderSort, type OrderStatus } from '@/types';
import { OrderStatusBadge } from '@/components/order';
import { AdminLayout } from '../components/AdminLayout';

/**
 * Admin order management.
 *
 * Intentionally a lightweight list — search, filter, sort — and NOT an
 * analytics dashboard. Searching and sorting happen in SQL, so the browser
 * never downloads the whole order history to filter it locally.
 */
const SORT_OPTIONS: { value: OrderSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'total-high', label: 'Highest total' },
  { value: 'total-low', label: 'Lowest total' },
];

export function AdminOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [sort, setSort] = useState<OrderSort>('newest');

  useSeo({ title: 'Orders', path: '/admin/orders', noIndex: true });

  const query = useMemo(
    () => ({ search: search.trim() || undefined, status: status || undefined, sort }),
    [search, status, sort],
  );

  const { data, loading, error, retry } = useAdminOrders(query);
  const orders = data?.orders ?? [];
  const isFiltered = Boolean(search.trim() || status);

  function clearFilters() {
    setSearch('');
    setStatus('');
    setSort('newest');
  }

  return (
    <AdminLayout title="Orders" description="Search, review and progress customer orders.">
      <div className="surface-card mb-6 flex flex-col gap-4 p-4">
        <Input
          label="Search"
          placeholder="Order number, name, email or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus | '')}
            options={[
              { value: '', label: 'All statuses' },
              ...ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] })),
            ]}
          />

          <Select
            label="Sort by"
            value={sort}
            onChange={(event) => setSort(event.target.value as OrderSort)}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </div>

        {isFiltered && (
          <div>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Could not load orders"
          description="Please check your connection and try again."
          onRetry={retry}
        />
      )}

      {!loading && !error && orders.length === 0 && (
        <EmptyState
          title={isFiltered ? 'No orders match those filters' : 'No orders yet'}
          description={
            isFiltered
              ? 'Try a different search term or status.'
              : 'Customer orders will appear here as soon as they are placed.'
          }
        />
      )}

      {!loading && orders.length > 0 && (
        <>
          {/* Mobile: cards. Desktop: table. Same data, no horizontal scroll. */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {orders.map((order) => (
              <li key={order.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="text-body-sm font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="mt-1 truncate text-caption text-ink-muted">
                      {order.customerName} · {order.customerEmail}
                    </p>
                    <p className="mt-1 text-caption text-ink-muted">
                      {new Date(order.createdAt).toLocaleDateString('en-PK')} · {order.itemCount}{' '}
                      {order.itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <OrderStatusBadge status={order.status} size="sm" />
                    <p className="text-body-sm font-semibold text-ink">
                      {formatPrice(order.grandTotal)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="pb-3 text-caption font-semibold uppercase text-ink-muted">
                    Order
                  </th>
                  <th scope="col" className="pb-3 text-caption font-semibold uppercase text-ink-muted">
                    Customer
                  </th>
                  <th scope="col" className="pb-3 text-caption font-semibold uppercase text-ink-muted">
                    Date
                  </th>
                  <th scope="col" className="pb-3 text-caption font-semibold uppercase text-ink-muted">
                    Items
                  </th>
                  <th scope="col" className="pb-3 text-caption font-semibold uppercase text-ink-muted">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="pb-3 text-right text-caption font-semibold uppercase text-ink-muted"
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="py-4 pr-4">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="text-body-sm font-semibold text-ink underline-offset-4 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-body-sm text-ink">{order.customerName}</p>
                      <p className="text-caption text-ink-muted">{order.customerEmail}</p>
                      <p className="text-caption text-ink-muted">{order.customerPhone}</p>
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-ink-muted">
                      {new Date(order.createdAt).toLocaleDateString('en-PK')}
                    </td>
                    <td className="py-4 pr-4 text-body-sm text-ink-muted">{order.itemCount}</td>
                    <td className="py-4 pr-4">
                      <OrderStatusBadge status={order.status} size="sm" />
                    </td>
                    <td className="py-4 text-right text-body-sm font-semibold text-ink">
                      {formatPrice(order.grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data && (
            <p className="mt-5 text-caption text-ink-muted">
              Showing {orders.length} of {data.meta.total} orders.
            </p>
          )}
        </>
      )}
    </AdminLayout>
  );
}
