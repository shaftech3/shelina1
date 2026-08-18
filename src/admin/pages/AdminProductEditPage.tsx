import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, Button, ErrorState, Skeleton, useToast } from '@/components/ui';
import { useSeo } from '@/hooks';
import { productService, ServiceError, type ProductInput } from '@/services';
import { AdminLayout } from '../components/AdminLayout';
import { ProductForm } from '../components/ProductForm';
import { useAdminBrands, useAdminCategories, useAdminProduct } from '../hooks/useAdminData';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';

export function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [dirty, setDirty] = useState(false);

  const product = useAdminProduct(id);
  const categories = useAdminCategories();
  const brands = useAdminBrands();

  useSeo({
    title: product.data ? `Edit ${product.data.name}` : 'Edit product',
    path: `/admin/products/${id}/edit`,
    noIndex: true,
  });
  useUnsavedChangesWarning(dirty);

  async function handleSubmit(input: ProductInput) {
    if (!id) return;
    try {
      const saved = await productService.update(id, input);
      setDirty(false);
      notify({ title: 'Changes saved', description: saved.name, tone: 'success' });
      navigate('/admin/products');
    } catch (cause) {
      notify({
        title: 'Could not save changes',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  const loading = product.loading || categories.loading || brands.loading;

  return (
    <AdminLayout
      title={product.data ? product.data.name : 'Edit product'}
      description="Update this product's details, variants and media."
    >
      <Breadcrumb
        items={[{ label: 'Products', href: '/admin/products' }, { label: 'Edit' }]}
        className="mb-5"
      />

      {loading && <Skeleton className="h-96 w-full rounded-lg" />}

      {/* A missing id is a dead end, not a retryable error — offer the way back. */}
      {product.error && !loading && (
        <ErrorState
          title="Product not found"
          description="This product may have been deleted."
          onRetry={undefined}
          className="[&>p]:mb-0"
        />
      )}
      {product.error && !loading && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => navigate('/admin/products')}>
            Back to products
          </Button>
        </div>
      )}

      {!loading && !product.error && product.data && (
        <ProductForm
          product={product.data}
          categories={categories.data ?? []}
          brands={brands.data ?? []}
          onSubmit={handleSubmit}
          onDirtyChange={setDirty}
          submitLabel="Save changes"
        />
      )}
    </AdminLayout>
  );
}
