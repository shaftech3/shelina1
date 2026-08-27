import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { discountPercent, effectivePrice, formatPrice } from '@/lib/format';
import { Badge, Button, Icon, useToast } from '@/components/ui';
import { useCart } from '@/cart';
import type { Product } from '@/types';
import { ColorSelector } from './ColorSelector';
import { QuantityStepper } from './QuantityStepper';
import { SizeSelector } from './SizeSelector';
import { StockLabel } from './StockLabel';

interface ProductPurchasePanelProps {
  product: Product;
  className?: string;
}

/**
 * Everything on the right-hand side of the product page: price, variant
 * selection, quantity and Add to Cart.
 *
 * The requirement rules encoded here:
 *  - A size is required only if the product declares sizes.
 *  - A colour is required only if the product declares colours.
 *  - A product with neither adds to cart immediately.
 * All three fall out of the data — there is no per-product special-casing.
 */
export function ProductPurchasePanel({ product, className }: ProductPurchasePanelProps) {
  const { addItem, openCart } = useCart();
  const { notify } = useToast();
  const errorId = useId();

  const hasSizes = product.sizes.length > 0;
  const hasColors = product.colors.length > 0;

  // A single available option is still an explicit choice, but pre-selecting it
  // removes a pointless click without weakening the validation rule below.
  const soleSize = hasSizes && product.sizes.filter((s) => s.available).length === 1
    ? (product.sizes.find((s) => s.available)?.value ?? null)
    : null;
  const soleColor = hasColors && product.colors.filter((c) => c.available).length === 1
    ? (product.colors.find((c) => c.available)?.name ?? null)
    : null;

  const [size, setSize] = useState<string | null>(soleSize);
  const [color, setColor] = useState<string | null>(soleColor);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const soldOut = product.stockStatus === 'out-of-stock';
  const payable = effectivePrice(product.price, product.salePrice);
  const discount = discountPercent(product.price, product.salePrice);

  const sizeMissing = hasSizes && !size;
  const colorMissing = hasColors && !color;

  const handleAdd = () => {
    // Size is checked first so the message matches the first control the
    // customer would reach reading top to bottom.
    if (sizeMissing) {
      setError('Please select a size.');
      notify({ title: 'Please select a size.', tone: 'error' });
      return;
    }
    if (colorMissing) {
      setError('Please select a colour.');
      notify({ title: 'Please select a colour.', tone: 'error' });
      return;
    }

    setError(null);
    addItem({ product, size, color, quantity });

    // The drawer opening IS the success feedback — it shows the line, the
    // chosen variant and the new subtotal. A success toast on top of it would
    // duplicate that and cover the panel, so toasts are reserved for errors.
    openCart();
  };

  return (
    <div className={cn('flex w-full min-w-0 max-w-full flex-col gap-7 overflow-hidden', className)}>
      <div className="flex w-full min-w-0 max-w-full flex-col gap-3">
        {product.brand && (
          <span className="eyebrow text-primary-deep">{product.brand}</span>
        )}

        <h1 className="font-display text-h2 text-ink break-words">{product.name}</h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={cn('text-h4 font-semibold', discount !== null ? 'text-secondary-deep' : 'text-ink')}>
            {formatPrice(payable)}
          </span>
          {discount !== null && (
            <>
              <span className="text-body text-ink-subtle line-through">{formatPrice(product.price)}</span>
              <Badge tone="secondary">-{discount}%</Badge>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StockLabel status={product.stockStatus} />
          {product.sku && (
            <span className="text-caption text-ink-subtle break-all">SKU: {product.sku}</span>
          )}
        </div>

        {product.shortDescription && (
          <p className="max-w-prose text-body text-ink-muted break-words">{product.shortDescription}</p>
        )}
      </div>

      {/* Only rendered when this product actually declares options. */}
      {hasColors && (
        <ColorSelector
          colors={product.colors}
          selected={color}
          onSelect={(value) => {
            setColor(value);
            setError(null);
          }}
          invalid={Boolean(error) && colorMissing}
          errorId={errorId}
        />
      )}

      {hasSizes && (
        <SizeSelector
          sizes={product.sizes}
          selected={size}
          onSelect={(value) => {
            setSize(value);
            setError(null);
          }}
          invalid={Boolean(error) && sizeMissing}
          errorId={errorId}
        />
      )}

      <QuantityStepper
        value={quantity}
        onChange={setQuantity}
        max={product.stockCount}
        label="Quantity"
      />

      <div className="flex flex-col gap-3">
        {/* Live region: the toast is transient, this persists next to the
            control that failed. */}
        {/* No role="alert" here: the toast already announces this text, and two
            live regions would double-announce. The group references this node
            via aria-errormessage, so it is still programmatically associated. */}
        <p
          id={errorId}
          className={cn(
            'flex items-center gap-2 text-body-sm text-error',
            error ? 'block' : 'hidden',
          )}
        >
          {error && <Icon name="alert" size={16} className="shrink-0" />}
          {error}
        </p>

        <Button
          size="lg"
          fullWidth
          onClick={handleAdd}
          disabled={soldOut}
          iconRight={!soldOut ? <Icon name="cart" size={18} /> : undefined}
        >
          {soldOut ? 'Sold out' : 'Add to bag'}
        </Button>

        <p className="text-caption text-ink-muted">
          Sizes and colours are listed exactly as stocked for this style.
        </p>
      </div>
    </div>
  );
}
