import { useMemo, useState } from 'react';
import { formatDate, formatPrice } from '@/lib/format';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Input,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useAdminCustomers, useSeo } from '@/hooks';
import { adminCustomerService, ServiceError } from '@/services';
import type { AdminCustomer, AdminCustomerSort } from '@/types';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmCustomerDeleteModal } from '../components/ConfirmCustomerDeleteModal';
import { ConfirmBulkDeleteModal } from '../components/ConfirmBulkDeleteModal';

const SORT_OPTIONS: { value: AdminCustomerSort; label: string }[] = [
  { value: 'newest', label: 'Newest registered' },
  { value: 'oldest', label: 'Oldest registered' },
  { value: 'orders-high', label: 'Most orders' },
  { value: 'spent-high', label: 'Highest spent' },
  { value: 'name-asc', label: 'Name (A to Z)' },
];

export function AdminCustomersPage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AdminCustomerSort>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customerToDelete, setCustomerToDelete] = useState<AdminCustomer | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const { notify } = useToast();

  useSeo({ title: 'Customer Accounts', path: '/admin/customers', noIndex: true });

  const query = useMemo(
    () => ({ search: search.trim() || undefined, sort }),
    [search, sort],
  );

  const { data, loading, error, retry } = useAdminCustomers(query);
  const customers = data?.customers ?? [];
  const isFiltered = Boolean(search.trim());

  function clearFilters() {
    setSearch('');
    setSort('newest');
  }

  const allSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id));
  const someSelected = selectedIds.length > 0;

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customers.map((c) => c.id));
    }
  }

  function handleToggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function handleConfirmDeleteCustomer() {
    if (!customerToDelete) return;
    try {
      await adminCustomerService.delete(customerToDelete.id);
      notify({
        title: 'Customer deleted',
        description: `Customer ${customerToDelete.name} was removed. Past orders were preserved.`,
        tone: 'success',
      });
      setSelectedIds((prev) => prev.filter((id) => id !== customerToDelete.id));
      retry();
    } catch (cause) {
      notify({
        title: 'Could not delete customer',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  async function handleConfirmBulkDelete() {
    if (selectedIds.length === 0) return;
    try {
      const result = await adminCustomerService.bulkDelete(selectedIds);
      notify({
        title: 'Customers deleted',
        description: `Successfully deleted ${result.count} customer account(s). Past orders were preserved.`,
        tone: 'success',
      });
      setSelectedIds([]);
      retry();
    } catch (cause) {
      notify({
        title: 'Could not delete customers',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  const selectedCustomersSummary = customers
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => `${c.name} (${c.email} - ${c.orderCount} orders)`);

  return (
    <AdminLayout
      title="Customers"
      description="View registered customer accounts, review purchase totals, and manage user records."
      actions={
        someSelected ? (
          <div className="flex items-center gap-2">
            <span className="text-body-sm font-medium text-ink-muted">
              {selectedIds.length} selected
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-1.5"
            >
              <Icon name="trash" size={15} />
              Delete Selected ({selectedIds.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="surface-card mb-6 flex flex-col gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Search"
            placeholder="Customer name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Select
            label="Sort by"
            value={sort}
            onChange={(event) => setSort(event.target.value as AdminCustomerSort)}
            options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {customers.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-body-sm font-medium text-primary hover:underline"
            >
              {allSelected ? 'Deselect all' : 'Select all customers'}
            </button>
          )}
        </div>
      </div>

      {someSelected && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50/70 p-3 lg:hidden">
          <span className="text-body-sm font-medium text-red-900">
            {selectedIds.length} customer(s) selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              Delete ({selectedIds.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Could not load customers"
          description="Please check your connection and try again."
          onRetry={retry}
        />
      )}

      {!loading && !error && customers.length === 0 && (
        <EmptyState
          title={isFiltered ? 'No customers match your search' : 'No registered customers yet'}
          description={
            isFiltered
              ? 'Try a different search term.'
              : 'Registered customer accounts will appear here as soon as they sign up.'
          }
        />
      )}

      {!loading && customers.length > 0 && (
        <>
          {/* Mobile: cards */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {customers.map((customer) => {
              const isSelected = selectedIds.includes(customer.id);
              return (
                <li
                  key={customer.id}
                  className={`surface-card p-4 transition-colors ${
                    isSelected ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleOne(customer.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        aria-label={`Select customer ${customer.name}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-body-sm font-semibold text-ink">{customer.name}</h3>
                        <span className="rounded bg-sand px-2 py-0.5 text-caption font-medium text-ink">
                          {customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-caption text-ink-muted">{customer.email}</p>
                      {customer.phone && (
                        <p className="mt-0.5 text-caption text-ink-muted">{customer.phone}</p>
                      )}
                      <p className="mt-0.5 text-caption text-ink-muted">
                        Joined {formatDate(customer.createdAt)}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2">
                        <span className="text-body-sm font-bold text-ink">
                          {formatPrice(customer.totalSpent)}
                        </span>
                        <IconButton
                          label={`Delete customer ${customer.name}`}
                          icon={<Icon name="trash" size={15} />}
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setCustomerToDelete(customer)}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-sand/30">
                  <th scope="col" className="w-12 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      aria-label="Select all customers"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase text-ink-muted">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase text-ink-muted">
                    Contact
                  </th>
                  <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase text-ink-muted">
                    Registered
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-caption font-semibold uppercase text-ink-muted">
                    Orders
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-caption font-semibold uppercase text-ink-muted">
                    Total Spent
                  </th>
                  <th scope="col" className="w-20 px-4 py-3 text-center text-caption font-semibold uppercase text-ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const isSelected = selectedIds.includes(customer.id);
                  return (
                    <tr
                      key={customer.id}
                      className={`border-b border-border transition-colors last:border-0 hover:bg-sand/20 ${
                        isSelected ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleOne(customer.id)}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          aria-label={`Select customer ${customer.name}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-body-sm font-semibold text-ink">{customer.name}</p>
                        <p className="text-caption text-ink-muted">{customer.email}</p>
                      </td>
                      <td className="px-4 py-4 text-body-sm text-ink-muted">
                        {customer.phone || '—'}
                      </td>
                      <td className="px-4 py-4 text-body-sm text-ink-muted">
                        {formatDate(customer.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-block rounded bg-sand px-2 py-0.5 text-caption font-medium text-ink">
                          {customer.orderCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-body-sm font-bold text-ink">
                        {formatPrice(customer.totalSpent)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => setCustomerToDelete(customer)}
                          className="rounded p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                          title="Delete Customer Account"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data && (
            <p className="mt-5 text-caption text-ink-muted">
              Showing {customers.length} of {data.meta.total} registered customers.
            </p>
          )}
        </>
      )}

      <ConfirmCustomerDeleteModal
        open={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleConfirmDeleteCustomer}
        customer={customerToDelete}
      />

      <ConfirmBulkDeleteModal
        open={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
        itemType="customers"
        count={selectedIds.length}
        itemsSummary={selectedCustomersSummary}
      />
    </AdminLayout>
  );
}
