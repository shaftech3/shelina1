import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { Image, SmartLink } from '@/components/ui';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import type { CartItem } from '@/types';

interface CartLineProps {
  item: CartItem;
  onQuantityChange: (key: string, quantity: number) => void;
  onRemove: (key: string) => void;
  /** `drawer` is the compact side-panel layout; `page` is the roomier one. */
  variant?: 'drawer' | 'page';
  /** Lets the drawer close itself when a product link is followed. */
  onNavigate?: () => void;
}

/**
 * One cart line.
 *
 * The selected size and colour are always shown as text, never implied by a
 * swatch — a cart is the last place to be ambiguous about what was chosen.
 */
export function CartLine({
  item,
  onQuantityChange,
  onRemove,
  variant = 'drawer',
  onNavigate,
}: CartLineProps) {
  const isPage = variant === 'page';
  const lineTotal = item.unitPrice * item.quantity;
  const discounted = item.listPrice > item.unitPrice;

  // Only the parts the product actually has — a product with no colours shows
  // no colour row rather than "Colour: —".
  const variantParts = [
    item.size ? { label: 'Size', value: item.size } : null,
    item.color ? { label: 'Colour', value: item.color } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <li className={cn('flex gap-4', isPage ? 'py-6' : 'py-5')}>
      <SmartLink
        href={`/product/${item.slug}`}
        onClick={onNavigate}
        className={cn(
          'shrink-0 overflow-hidden rounded-md border border-border bg-cream',
          'focus-visible:outline-none focus-visible:shadow-focus',
          isPage ? 'w-24 sm:w-28' : 'w-20',
        )}
        aria-label={item.productName}
      >
        <Image
          src={item.image?.src ?? ''}
          alt={item.image?.alt ?? item.productName}
          ratio="product"
          sizes={isPage ? '112px' : '80px'}
        />
      </SmartLink>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {item.brand && (
              <span className="block text-caption uppercase tracking-[0.12em] text-ink-subtle">
                {item.brand}
              </span>
            )}
            <SmartLink
              href={`/product/${item.slug}`}
              onClick={onNavigate}
              className="rounded-xs text-body-sm font-medium text-ink transition-colors hover:text-primary-deep focus-visible:outline-none focus-visible:text-primary-deep"
            >
              {item.productName}
            </SmartLink>
          </div>

          <span className="shrink-0 text-body-sm font-semibold text-ink">
            {formatPrice(lineTotal)}
          </span>
        </div>

        {variantParts.length > 0 && (
          <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-caption text-ink-muted">
            {variantParts.map((part) => (
              <div key={part.label} className="flex gap-1.5">
                <dt>{part.label}:</dt>
                <dd className="font-medium text-ink">{part.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-wrap items-baseline gap-2 text-caption text-ink-muted">
          <span>{formatPrice(item.unitPrice)} each</span>
          {discounted && (
            <span className="text-ink-subtle line-through">{formatPrice(item.listPrice)}</span>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <QuantityStepper
            value={item.quantity}
            onChange={(quantity) => onQuantityChange(item.key, quantity)}
            max={item.maxQuantity}
            size="sm"
            label={`Quantity for ${item.productName}`}
          />

          <button
            type="button"
            onClick={() => onRemove(item.key)}
            className="rounded-xs text-caption text-ink-muted underline-offset-4 transition-colors hover:text-error hover:underline focus-visible:outline-none focus-visible:shadow-focus"
          >
            Remove
            <span className="sr-only"> {item.productName}</span>
          </button>
        </div>
      </div>
    </li>
  );
}
