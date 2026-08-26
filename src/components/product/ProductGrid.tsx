import { cn } from '@/lib/cn';
import type { Product } from '@/types';
import { EmptyState, ErrorState, ProductCardSkeleton, Reveal } from '@/components/ui';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  products: Product[] | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  skeletonCount?: number;
  className?: string;
  /** Number of columns from the `md` breakpoint upward. */
  columns?: 3 | 4;
  emptyMessage?: string;
  /** Eager-load the first cards; only for above-the-fold placements. */
  priority?: boolean;
}

/**
 * Responsive catalog grid.
 * 2 columns on phones (footwear reads well small), 3 on tablet, 3–4 on desktop.
 */
export function ProductGrid({
  products,
  loading = false,
  error = null,
  onRetry,
  skeletonCount = 4,
  className,
  columns = 4,
  emptyMessage = 'No products to show here just yet.',
  priority = false,
}: ProductGridProps) {
  const gridClasses = cn(
    'grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9 md:grid-cols-3 md:gap-y-10 lg:gap-x-6',
    columns === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3',
    className,
  );

  if (error) {
    return (
      <ErrorState
        title="We couldn’t load these products"
        description="Please check your connection and try again."
        onRetry={onRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className={gridClasses} aria-busy="true" aria-live="polite">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return <EmptyState title="Nothing here yet" description={emptyMessage} />;
  }

  return (
    <div className={gridClasses}>
      {products.map((product, index) => (
        <Reveal key={product.id} delay={Math.min(index, 5) * 60}>
          <ProductCard product={product} priority={priority && index < 2} />
        </Reveal>
      ))}
    </div>
  );
}
