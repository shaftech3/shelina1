import { cn } from '@/lib/cn';
import type { Category } from '@/types';
import { EmptyState, ErrorState, Reveal, Skeleton } from '@/components/ui';
import { CategoryCard } from './CategoryCard';

interface CategoryShowcaseProps {
  categories: Category[] | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
  /**
   * Eager-load the first tiles. Only enable when this section is genuinely
   * above the fold — everything else should stay lazy.
   */
  priority?: boolean;
}

/**
 * Editorial category layout: one tall hero tile paired with a grid of
 * supporting tiles at desktop, collapsing to an even 2-column grid on mobile.
 *
 * Composes the Stage 1 <CategoryCard> rather than reimplementing it.
 */
export function CategoryShowcase({
  categories,
  loading,
  error,
  onRetry,
  className,
  priority = false,
}: CategoryShowcaseProps) {
  if (error) return <ErrorState title="We couldn’t load categories" onRetry={onRetry} />;

  if (loading) {
    return (
      <div className={cn('grid gap-3 sm:gap-4 lg:grid-cols-12', className)} aria-busy="true">
        <Skeleton className="aspect-[4/5] w-full rounded-lg lg:col-span-5 lg:aspect-auto lg:h-full lg:min-h-[520px]" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return <EmptyState title="No categories yet" description="Categories will appear here once published." />;
  }

  const [feature, ...rest] = categories;
  const supporting = rest.slice(0, 4);

  return (
    <div className={cn('grid gap-3 sm:gap-4 lg:grid-cols-12', className)}>
      <Reveal className="lg:col-span-5">
        <CategoryCard
          category={feature}
          variant="feature"
          priority={priority}
          className="h-full [&_img]:lg:min-h-[520px]"
        />
      </Reveal>

      {supporting.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 lg:content-start">
          {supporting.map((category, index) => (
            <Reveal key={category.id} delay={70 + index * 70}>
              <CategoryCard category={category} priority={priority && index < 2} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
