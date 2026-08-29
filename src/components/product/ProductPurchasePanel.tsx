import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { discountPercent, effectivePrice, formatPrice } from '@/lib/format';
import { Badge, Button, Icon, useToast } from '@/components/ui';
import { useCart } from '@/cart';
import { buildProductWhatsAppUrl } from '@/lib/whatsapp';
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
 * selection, quantity, Add to Cart, and Order via WhatsApp.
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
    if (sizeMissing) {
      setError('Please select your size first.');
      notify({ title: 'Please select your size first.', tone: 'error' });
      return;
    }
    if (colorMissing) {
      setError('Please select your colour first.');
      notify({ title: 'Please select your colour first.', tone: 'error' });
      return;
    }

    setError(null);
    addItem({ product, size, color, quantity });
    openCart();
  };

  const handleWhatsAppOrder = () => {
    if (sizeMissing) {
      setError('Please select your size first.');
      notify({ title: 'Please select your size first.', tone: 'error' });
      return;
    }
    if (colorMissing) {
      setError('Please select your colour first.');
      notify({ title: 'Please select your colour first.', tone: 'error' });
      return;
    }

    setError(null);
    const whatsappUrl = buildProductWhatsAppUrl({
      product,
      size,
      color,
      quantity,
    });
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
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

        <div className="flex flex-col gap-2.5">
          <Button
            size="lg"
            fullWidth
            onClick={handleAdd}
            disabled={soldOut}
            iconRight={!soldOut ? <Icon name="cart" size={18} /> : undefined}
          >
            {soldOut ? 'Sold out' : 'Add to bag'}
          </Button>

          {!soldOut && (
            <button
              type="button"
              onClick={handleWhatsAppOrder}
              aria-label="Order this footwear directly via WhatsApp"
              className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-sm border border-[#25D366]/40 bg-surface px-5 text-button font-medium text-ink shadow-2xs transition-all duration-base hover:border-[#25D366] hover:bg-[#25D366]/8 hover:text-[#128C7E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] active:scale-98"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5 text-[#25D366]"
                aria-hidden="true"
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Order via WhatsApp
            </button>
          )}
        </div>

        <p className="text-caption text-ink-muted">
          Fast Cash on Delivery across Pakistan. Sizes and colours are listed exactly as stocked.
        </p>
      </div>
    </div>
  );
}
