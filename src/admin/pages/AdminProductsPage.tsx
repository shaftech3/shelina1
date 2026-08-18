import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Input,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { useSeo } from '@/hooks';
import { productService, ServiceError } from '@/services';
import type { Product, ProductStatus } from '@/types';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useAdminBrands, useAdminCategories, useAdminProducts } from '../hooks/useAdminData';

const STATUS_TONE: Record<ProductStatus, 'success' | 'neutral' | 'warning'> = {
  active: 'success',
  draft: 'warning',
  archived: 'neutral',
};

function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  );
}

export function AdminProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const { notify } = useToast();

  useSeo({ title: 'Products', path: '/admin/products', noIndex: true });

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      categoryId: categoryId || undefined,
      brand: brand || undefined,
      status: (status || undefined) as ProductStatus | undefined,
    }),
    [search, categoryId, brand, status],
  );

  const products = useAdminProducts(query);
  const categories = useAdminCategories();
  const brands = useAdminBrands();

  const categoryName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? '—';

  const isFiltered = Boolean(search.trim() || categoryId || brand || status);

  function clearFilters() {
    setSearch('');
    setCategoryId('');
    setBrand('');
    setStatus('');
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await productService.remove(pendingDelete.id);
      notify({ title: 'Product deleted', description: pendingDelete.name, tone: 'success' });
    } catch (cause) {
      notify({
        title: 'Could not delete product',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  const list = products.data ?? [];

  return (
    <AdminLayout
      title="Products"
      description="Add, edit and remove the products in your shop."
      actions={
        <ButtonLink href="/admin/products/new" iconLeft={<Icon name="plus" size={17} />}>
          Add product
        </ButtonLink>
      }
    >
      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <Input
          label="Search"
          placeholder="Search by name, SKU or brand"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          iconLeft={<Icon name="search" size={17} />}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Category"
            options={[
              { value: '', label: 'All categories' },
              ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          />
          <Select
            label="Brand"
            options={[
              { value: '', label: 'All brands' },
              ...(brands.data ?? []).map((b) => ({ value: b.name, label: b.name })),
            ]}
            value={brand}
            onChange={(event) => setBrand(event.target.value)}
          />
          <Select
            label="Status"
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'archived', label: 'Archived' },
            ]}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
        {isFiltered && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <p aria-live="polite" className="text-caption text-ink-muted">
              {list.length} {list.length === 1 ? 'product' : 'products'} found
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {products.loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {products.error && !products.loading && (
        <ErrorState title="Could not load products" onRetry={products.retry} />
      )}

      {!products.loading && !products.error && list.length === 0 && (
        <EmptyState
          icon="grid"
          title={isFiltered ? 'No products match these filters' : 'No products yet'}
          description={
            isFiltered
              ? 'Try a different search or clear the filters.'
              : 'Add your first product to see it in the shop.'
          }
          action={
            isFiltered ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <ButtonLink href="/admin/products/new" iconLeft={<Icon name="plus" size={17} />}>
                Add product
              </ButtonLink>
            )
          }
        />
      )}

      {!products.loading && !products.error && list.length > 0 && (
        <>
          {/* Desktop: a real table, because this is tabular data. */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface lg:block">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Products, with category, brand, price, stock and status
              </caption>
              <thead>
                <tr className="border-b border-border bg-cream">
                  <th scope="col" className="px-4 py-3 text-label font-medium text-ink-muted">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3 text-label font-medium text-ink-muted">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-label font-medium text-ink-muted">
                    Brand
                  </th>
                  <th scope="col" className="px-4 py-3 text-label font-medium text-ink-muted">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 text-label font-medium text-ink-muted">
                    Stock
                  </th>
                  <th scope="col" className="px-4 py-3 text-label font-medium text-ink-muted">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-label font-medium text-ink-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-cream/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-cream">
                          {product.images[0] ? (
                            <img
                              src={product.images[0].src}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-ink-subtle">
                              <Icon name="image" size={18} />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/admin/products/${product.id}/edit`}
                            className="block truncate text-body-sm font-medium text-ink hover:text-primary-deep focus-visible:outline-none focus-visible:shadow-focus"
                          >
                            {product.name}
                          </Link>
                          {product.sku && (
                            <span className="text-caption text-ink-subtle">{product.sku}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-ink-muted">
                      {categoryName(product.categoryId)}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-ink-muted">{product.brand ?? '—'}</td>
                    <td className="px-4 py-3 text-body-sm text-ink">
                      {product.salePrice ? (
                        <span className="flex flex-col">
                          <span className="font-medium">{formatPrice(product.salePrice)}</span>
                          <span className="text-caption text-ink-subtle line-through">
                            {formatPrice(product.price)}
                          </span>
                        </span>
                      ) : (
                        formatPrice(product.price)
                      )}
                    </td>
                    <td className="px-4 py-3 text-body-sm text-ink-muted">
                      {product.stockCount ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status ?? 'active'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          aria-label={`Edit ${product.name}`}
                          className={cn(
                            'inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted',
                            'transition-colors hover:bg-cream hover:text-ink focus-visible:outline-none focus-visible:shadow-focus',
                          )}
                        >
                          <Icon name="edit" size={17} />
                        </Link>
                        <IconButton
                          label={`Delete ${product.name}`}
                          icon={<Icon name="trash" size={17} />}
                          size="sm"
                          onClick={() => setPendingDelete(product)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards. A horizontally scrolling 7-column table at 320px
              would be unusable. */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {list.map((product) => (
              <li key={product.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-cream">
                    {product.images[0] ? (
                      <img
                        src={product.images[0].src}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-subtle">
                        <Icon name="image" size={20} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="text-body-sm font-medium text-ink hover:text-primary-deep focus-visible:outline-none focus-visible:shadow-focus"
                      >
                        {product.name}
                      </Link>
                      <StatusBadge status={product.status ?? 'active'} />
                    </div>

                    <p className="mt-0.5 text-caption text-ink-subtle">
                      {categoryName(product.categoryId)}
                      {product.brand ? ` · ${product.brand}` : ''}
                    </p>

                    <p className="mt-1 text-body-sm text-ink">
                      {product.salePrice ? (
                        <>
                          <span className="font-medium">{formatPrice(product.salePrice)}</span>{' '}
                          <span className="text-caption text-ink-subtle line-through">
                            {formatPrice(product.price)}
                          </span>
                        </>
                      ) : (
                        formatPrice(product.price)
                      )}
                      {product.stockCount != null && (
                        <span className="text-caption text-ink-subtle"> · {product.stockCount} in stock</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <ButtonLink
                    href={`/admin/products/${product.id}/edit`}
                    variant="outline"
                    size="sm"
                    iconLeft={<Icon name="edit" size={15} />}
                  >
                    Edit
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Icon name="trash" size={15} />}
                    onClick={() => setPendingDelete(product)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this product?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed from your shop. This cannot be undone.`
            : undefined
        }
      />
    </AdminLayout>
  );
}
