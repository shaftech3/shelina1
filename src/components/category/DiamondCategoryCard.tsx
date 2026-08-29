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
 * Premium square category card.
 *
 * Implements a clean, luxury square frame for footwear categories:
 * - Square aspect ratio with rounded corners
 * - Complete footwear image visibility with object-contain (no destructive cropping)
 * - Subtle hover elevation and border accent
 * - Responsive sizing (larger than previous diamond cards)
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
        'group flex flex-col items-center gap-2.5 rounded-2xl p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-transform duration-300 active:scale-98',
        'w-28 sm:w-36 md:w-44 lg:w-48',
        className,
      )}
    >
      {/* Square image container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/80 bg-[#faf8f5] shadow-xs transition-all duration-300 ease-out group-hover:border-primary/50 group-hover:shadow-md group-hover:-translate-y-1">
        {optimizedSrc ? (
          <img
            src={optimizedSrc}
            alt={image.alt || name}
            loading={priority ? 'eager' : 'lazy'}
            decoding={priority ? 'sync' : 'async'}
            className="h-full w-full object-contain p-2.5 sm:p-3.5 transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23f5f0eb"><rect width="200" height="200"/><text x="100" y="105" fill="%238a7e72" font-size="18" font-family="serif" text-anchor="middle">SHELINA</text></svg>';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#faf8f5] text-caption text-ink-muted">
            {name}
          </div>
        )}

        {/* Subtle gradient overlay on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      {/* Label and style count */}
      <div className="flex flex-col items-center text-center px-1">
        <span className="font-sans text-xs sm:text-body-sm font-semibold tracking-tight text-ink transition-colors duration-200 group-hover:text-primary-deep line-clamp-1">
          {name}
        </span>
        {typeof productCount === 'number' && productCount > 0 && (
          <span className="text-[11px] sm:text-xs text-ink-subtle tracking-wider uppercase font-sans mt-0.5">
            {productCount} styles
          </span>
        )}
      </div>
    </SmartLink>
  );
});

/** Backward-compatible export alias */
export const DiamondCategoryCard = SquareCategoryCard;
