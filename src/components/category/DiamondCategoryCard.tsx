import { memo } from 'react';
import { cn } from '@/lib/cn';
import { getOptimizedThumbnailUrl, normalizeMediaUrl } from '@/lib/media';
import type { Category } from '@/types';
import { SmartLink } from '@/components/ui';

interface CategoryCardProps {
  category: Category;
  className?: string;
  priority?: boolean;
}

/**
 * Premium compact square category card.
 *
 * Implements a clean, refined square frame for footwear categories:
 * - Controlled compact dimensions suited for a navigation showcase
 * - Complete footwear image visibility with object-contain (no destructive cropping)
 * - Subtle hover elevation and border accent
 * - Responsive sizing and clean typography
 */
export const SquareCategoryCard = memo(function SquareCategoryCard({
  category,
  className,
  priority = false,
}: CategoryCardProps) {
  const { name, image, slug, productCount } = category;
  const imageSrc = normalizeMediaUrl(image?.src);
  const optimizedSrc = imageSrc ? getOptimizedThumbnailUrl(imageSrc, 400) : '';

  return (
    <SmartLink
      href={`/category/${slug}`}
      className={cn(
        'group flex flex-col items-center gap-1.5 sm:gap-2 rounded-xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-300 motion-safe:[@media(hover:hover)]:hover:-translate-y-1 active:scale-98',
        'w-[82px] xs:w-[96px] sm:w-[110px] md:w-[124px] lg:w-[134px]',
        className,
      )}
    >
      {/* Square image container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/70 bg-[#faf8f5] shadow-2xs transition-all duration-300 ease-out motion-safe:[@media(hover:hover)]:group-hover:border-primary/50 motion-safe:[@media(hover:hover)]:group-hover:shadow-xs">
        {optimizedSrc ? (
          <img
            src={optimizedSrc}
            alt={image.alt || name}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            className="h-full w-full object-contain p-2 sm:p-2.5 transition-transform duration-500 ease-out motion-safe:[@media(hover:hover)]:group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23f5f0eb"><rect width="200" height="200"/><text x="100" y="105" fill="%238a7e72" font-size="18" font-family="serif" text-anchor="middle">SHELINA</text></svg>';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#faf8f5] text-[11px] text-ink-muted">
            {name}
          </div>
        )}

        {/* Subtle gradient overlay on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-deep/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 motion-safe:[@media(hover:hover)]:group-hover:opacity-100" />
      </div>

      {/* Label and style count */}
      <div className="flex flex-col items-center text-center px-0.5 w-full">
        <span className="font-sans text-[11px] sm:text-xs font-medium tracking-tight text-ink transition-colors duration-200 motion-safe:[@media(hover:hover)]:group-hover:text-primary-deep line-clamp-1">
          {name}
        </span>
        {typeof productCount === 'number' && productCount > 0 && (
          <span className="text-[9px] sm:text-[10px] text-ink-subtle tracking-wider uppercase font-sans mt-0.5">
            {productCount} styles
          </span>
        )}
      </div>
    </SmartLink>
  );
});

/** Backward-compatible export alias */
export const DiamondCategoryCard = SquareCategoryCard;
