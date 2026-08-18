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
      <div className="relative overflow-hidden rounded-lg border border-border bg-cream">
        <Image
          src={primaryImage?.src ?? ''}
          alt={primaryImage?.alt ?? name}
          ratio="product"
          priority={priority}
          sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
          imgClassName={cn(
            'transition-transform duration-[900ms] ease-elegant motion-safe:group-hover:scale-[1.045]',
            secondaryImage && 'motion-safe:group-hover:opacity-0 motion-safe:group-focus-within:opacity-0',
            soldOut && 'opacity-80',
          )}
        />

        {secondaryImage && (
          /* Positioned wrapper: the Image root owns `relative`, so overlaying
             must happen on a parent rather than by overriding its class. */
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-slow ease-elegant motion-safe:group-hover:opacity-100 motion-safe:group-focus-within:opacity-100">
            <Image
              src={secondaryImage.src}
              alt=""
              ratio="auto"
              className="h-full w-full"
              imgClassName="transition-transform duration-[900ms] ease-elegant motion-safe:group-hover:scale-[1.045]"
            />
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {discount !== null && <Badge tone="secondary">-{discount}%</Badge>}
          {isNew && !discount && <Badge tone="primary">New</Badge>}
          {featured && !isNew && !discount && <Badge tone="dark">Featured</Badge>}
        </div>

        {soldOut && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-surface/92 py-2 text-center text-caption font-medium uppercase tracking-[0.14em] text-ink-muted backdrop-blur-sm">
            Sold out
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-0.5 pt-3.5">
        {/* Reserved single line: keeps every card the same height regardless of
            brand-name length. */}
        <span className="line-clamp-1 min-h-[1.45em] text-caption uppercase tracking-[0.12em] text-ink-subtle">
          {brand}
        </span>

        <h3 className="min-h-[2.75em] font-sans text-body-sm font-medium leading-snug text-ink">
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
            {/* Stretched hit area keeps the whole card clickable and accessible. */}
            <span className="absolute inset-0" aria-hidden />
            <span className="line-clamp-2">{name}</span>
          </SmartLink>
        </h3>

        <div className="flex flex-wrap items-baseline gap-2">
          <span className={cn('text-body-sm font-semibold', discount !== null ? 'text-secondary-deep' : 'text-ink')}>
            {formatPrice(payable)}
          </span>
          {discount !== null && (
            <span className="text-caption text-ink-subtle line-through">{formatPrice(price)}</span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <ColorSwatches colors={colors} />
          <StockLabel status={stockStatus} />
        </div>
      </div>
    </article>
  );
});
