import { cn } from '@/lib/cn';
import type { Brand } from '@/types';
import { EmptyState, ErrorState, Icon, Image, Reveal, Skeleton, SmartLink } from '@/components/ui';

interface BrandShowcaseProps {
  brands: Brand[] | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Brand lines showcase.
 *
 * Brands come from brandService; the admin will manage them in a later stage.
 * `logo` is optional on the Brand type, so this falls back to an initial
 * monogram when no image is supplied.
 */
export function BrandShowcase({ brands, loading, error, onRetry, className }: BrandShowcaseProps) {
  const grid = cn('grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4', className);

  if (error) return <ErrorState title="We couldn’t load brands" onRetry={onRetry} />;

  if (loading) {
    return (
      <div className={grid} aria-busy="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-lg sm:h-48" />
        ))}
      </div>
    );
  }

  if (!brands || brands.length === 0) {
    return <EmptyState title="No brands yet" description="Brand lines will appear here once published." />;
  }

  return (
    <div className={grid}>
      {brands.map((brand, index) => (
        <Reveal key={brand.id} delay={Math.min(index, 4) * 65}>
          <SmartLink
            href={`/shop?brand=${encodeURIComponent(brand.name)}`}
            className={cn(
              'group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface',
              'transition-[box-shadow,border-color,transform] duration-base ease-elegant',
              'motion-safe:hover:-translate-y-1 hover:border-border-strong hover:shadow-md',
              'focus-visible:outline-none focus-visible:shadow-focus',
            )}
          >
            {brand.logo ? (
              <Image
                src={brand.logo.src}
                alt={brand.logo.alt}
                ratio="banner"
                objectFit="contain"
                sizes="(max-width: 1023px) 50vw, 24vw"
                imgClassName="p-3 transition-transform duration-[700ms] ease-elegant motion-safe:group-hover:scale-[1.05]"
              />
            ) : (
              <span
                aria-hidden
                className="flex aspect-[16/9] items-center justify-center bg-cream font-display text-h2 text-primary-deep"
              >
                {brand.name.charAt(0)}
              </span>
            )}

            <span className="flex flex-1 flex-col gap-1 p-4">
              <span className="flex items-center gap-1.5 text-body-sm font-medium text-ink">
                {brand.name}
                <Icon
                  name="arrow-right"
                  size={15}
                  className="text-ink-subtle transition-transform duration-base ease-elegant motion-safe:group-hover:translate-x-1"
                />
              </span>
              {brand.description && (
                <span className="text-caption leading-relaxed text-ink-muted">{brand.description}</span>
              )}
            </span>
          </SmartLink>
        </Reveal>
      ))}
    </div>
  );
}
