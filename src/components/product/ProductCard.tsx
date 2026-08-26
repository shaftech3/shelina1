import { memo } from 'react';
import { cn } from '@/lib/cn';
import { discountPercent, effectivePrice, formatPrice } from '@/lib/format';
import type { Product } from '@/types';
import { Badge, Image, SmartLink } from '@/components/ui';
import { ColorSwatches } from './ColorSwatches';
import { StockLabel } from './StockLabel';

export interface ProductCardProps {
  product: Product;
  /** Priority applies to above-the-fold cards only. */
  priority?: boolean;
  className?: string;
  /**
   * Navigation seam. Stage 1 renders a link to the product route; the actual
   * PDP arrives in a later stage.
   */
  onSelect?: (product: Product) => void;
}

/**
 * Premium footwear product card.
 *
 * Stage 1 is visual-only: no add-to-cart, wishlist or quick-view behaviour.
 * The markup and props are already shaped so those actions can be slotted in
 * without restructuring the component.
 */
export const ProductCard = memo(function ProductCard({
  product,
  priority = false,
  className,
  onSelect,
}: ProductCardProps) {
  const { name, brand, images, price, salePrice, colors, stockStatus, featured, isNew, slug } = product;

  const discount = discountPercent(price, salePrice);
  const payable = effectivePrice(price, salePrice);
  const primaryImage = images[0];
  const secondaryImage = images[1];
  const soldOut = stockStatus === 'out-of-stock';

  return (
    <article className={cn('group relative flex flex-col', className)}>
      {/* Product Image Frame: Aspect ratio locked with 100% full contain (no cropping) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-md sm:rounded-lg border border-border/70 bg-[#faf8f5] transition-all duration-300 group-hover:border-border-strong group-hover:shadow-sm">
        {/* Primary Product Image */}
        <Image
          src={primaryImage?.src ?? ''}
          alt={primaryImage?.alt ?? name}
          ratio="auto"
          objectFit="contain"
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="h-full w-full bg-transparent"
          imgClassName={cn(
            'p-2 sm:p-3 transition-all duration-500 ease-out motion-safe:group-hover:scale-[1.03]',
            secondaryImage && 'motion-safe:group-hover:opacity-0 motion-safe:group-focus-within:opacity-0',
            soldOut && 'opacity-75 grayscale-[20%]',
          )}
        />

        {/* Secondary Image on Desktop Hover (if available) */}
        {secondaryImage && (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out motion-safe:group-hover:opacity-100 motion-safe:group-focus-within:opacity-100">
            <Image
              src={secondaryImage.src}
              alt={secondaryImage.alt || `${name} - alternate angle`}
              ratio="auto"
              objectFit="contain"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="h-full w-full bg-transparent"
              imgClassName="p-2 sm:p-3 transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
            />
          </div>
        )}

        {/* Badges */}
        <div className="pointer-events-none absolute left-2 top-2 sm:left-2.5 sm:top-2.5 flex flex-col items-start gap-1 z-10">
          {discount !== null && (
            <Badge tone="secondary" className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold shadow-2xs">
              -{discount}%
            </Badge>
          )}
          {isNew && !discount && (
            <Badge tone="primary" className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold shadow-2xs">
              New
            </Badge>
          )}
          {featured && !isNew && !discount && (
            <Badge tone="dark" className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold shadow-2xs">
              Featured
            </Badge>
          )}
        </div>

        {/* Sold out overlay */}
        {soldOut && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-surface/92 py-1.5 text-center text-[10px] sm:text-caption font-semibold uppercase tracking-[0.14em] text-ink-muted backdrop-blur-xs">
            Sold out
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="flex flex-1 flex-col gap-1 px-0.5 pt-2.5 sm:pt-3">
        {brand && (
          <span className="line-clamp-1 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.14em] text-ink-subtle">
            {brand}
          </span>
        )}

        <h3 className="line-clamp-2 min-h-[2.4em] font-sans text-xs sm:text-body-sm font-medium leading-snug text-ink">
          <SmartLink
            href={`/product/${slug}`}
            onClick={(event) => {
              if (onSelect) {
                event.preventDefault();
                onSelect(product);
              }
            }}
            className="rounded-xs transition-colors duration-fast hover:text-primary-deep focus-visible:outline-none focus-visible:text-primary-deep"
          >
            {/* Stretched hit area */}
            <span className="absolute inset-0" aria-hidden />
            {name}
          </SmartLink>
        </h3>

        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
          <span className={cn('text-xs sm:text-body-sm font-semibold', discount !== null ? 'text-secondary-deep' : 'text-ink')}>
            {formatPrice(payable)}
          </span>
          {discount !== null && (
            <span className="text-[10px] sm:text-caption text-ink-subtle line-through">
              {formatPrice(price)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
          <ColorSwatches colors={colors} />
          <StockLabel status={stockStatus} />
        </div>
      </div>
    </article>
  );
});
