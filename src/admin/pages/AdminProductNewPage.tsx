import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb, ErrorState, Skeleton, useToast } from '@/components/ui';
import { useSeo } from '@/hooks';
import { productService, ServiceError, type ProductInput } from '@/services';
import { AdminLayout } from '../components/AdminLayout';
import { ProductForm } from '../components/ProductForm';
import { useAdminBrands, useAdminCategories } from '../hooks/useAdminData';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';

export function AdminProductNewPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [dirty, setDirty] = useState(false);

  const categories = useAdminCategories();
  const brands = useAdminBrands();

  useSeo({ title: 'Add product', path: '/admin/products/new', noIndex: true });
  useUnsavedChangesWarning(dirty);

  async function handleSubmit(input: ProductInput) {
    try {
      const created = await productService.create(input);
      // Clear the guard before navigating, or leaving triggers the warning.
      setDirty(false);
      notify({ title: 'Product created', description: created.name, tone: 'success' });
      navigate('/admin/products');
    } catch (cause) {
      // A failed save must never look like a success (§32).
      notify({
        title: 'Could not create product',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  const loading = categories.loading || brands.loading;
  const failed = categories.error || brands.error;

  return (
    <AdminLayout title="Add product" description="Create a new product for your shop.">
      <Breadcrumb
        items={[
          { label: 'Products', href: '/admin/products' },
          { label: 'Add product' },
        ]}
        className="mb-5"
      />

      {loading && <Skeleton className="h-96 w-full rounded-lg" />}

      {failed && !loading && (
        <ErrorState
          title="Could not load categories and brands"
          description="A product needs a category and a brand before it can be created."
          onRetry={() => {
            categories.retry();
            brands.retry();
          }}
        />
      )}

      {!loading && !failed && (
        <ProductForm
          categories={categories.data ?? []}
          brands={brands.data ?? []}
          onSubmit={handleSubmit}
          onDirtyChange={setDirty}
          submitLabel="Save product"
        />
      )}
    </AdminLayout>
  );
}
