import { memo } from 'react';
import { cn } from '@/lib/cn';
import { normalizeMediaUrl } from '@/lib/media';
import type { Category } from '@/types';
import { SmartLink } from '@/components/ui';

interface DiamondCategoryCardProps {
  category: Category;
  className?: string;
  priority?: boolean;
}

/**
 * Visually distinctive diamond-shaped category card.
 *
 * Implements a luxury diamond aperture (rotated 45deg with counter-rotated image
 * to keep the footwear portrait perfectly upright). Includes smooth entrance,
 * hover elevation, and responsive typography.
 */
export const DiamondCategoryCard = memo(function DiamondCategoryCard({
  category,
  className,
  priority = false,
}: DiamondCategoryCardProps) {
  const { name, image, slug, productCount } = category;
  const imageSrc = normalizeMediaUrl(image?.src);

  return (
    <SmartLink
      href={`/category/${slug}`}
      className={cn(
        'group flex flex-col items-center gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 rounded-xl py-3 px-2 transition-transform duration-300 active:scale-95',
        className,
      )}
    >
      {/* Diamond shape container with layered border and shadow */}
      <div className="relative p-2 sm:p-3">
        {/* Ambient subtle glow on hover */}
        <div className="absolute inset-0 -z-10 rounded-full bg-primary/0 blur-xl transition-colors duration-500 group-hover:bg-primary/20" />

        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 items-center justify-center overflow-hidden rounded-[1.35rem] sm:rounded-[1.75rem] border-2 border-primary/25 bg-cream-dark/40 shadow-sm transition-all duration-500 ease-out rotate-45 group-hover:rotate-45 group-hover:scale-105 group-hover:border-primary group-hover:shadow-md">
          {/* Counter-rotated image container so footwear remains upright */}
          <div className="absolute inset-[-10%] flex items-center justify-center -rotate-45 overflow-hidden">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={image.alt || name}
                loading={priority ? 'eager' : 'lazy'}
                decoding={priority ? 'sync' : 'async'}
                className="h-full w-full object-contain p-2.5 transition-transform duration-700 ease-out group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23ece6de"><rect width="200" height="200"/><text x="100" y="105" fill="%238a7e72" font-size="20" font-family="serif" text-anchor="middle">SHELINA</text></svg>';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-cream text-caption text-ink-muted">
                {name}
              </div>
            )}
          </div>

          {/* Gradient scrim for depth */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/25 via-transparent to-white/10 opacity-60 transition-opacity duration-300 group-hover:opacity-20 pointer-events-none" />
        </div>

        {/* Mini diamond apex accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] text-primary/70 transition-transform duration-300 group-hover:scale-125 group-hover:text-primary">
          ◆
        </div>
      </div>

      {/* Label and style count */}
      <div className="flex flex-col items-center text-center">
        <span className="font-display text-sm sm:text-base font-semibold tracking-wide text-ink transition-colors duration-200 group-hover:text-primary-deep whitespace-nowrap">
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
