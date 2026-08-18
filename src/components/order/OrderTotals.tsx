import { formatPrice } from '@/lib/format';

/**
 * Subtotal / shipping / grand total.
 *
 * These are the values the SERVER calculated and stored on the order. Nothing
 * is recomputed in the browser, so what a customer sees is exactly what was
 * charged.
 */
interface OrderTotalsProps {
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  className?: string;
}

export function OrderTotals({ subtotal, shippingFee, grandTotal, className }: OrderTotalsProps) {
  return (
    <dl className={className}>
      <div className="flex items-center justify-between py-1.5">
        <dt className="text-body-sm text-ink-muted">Subtotal</dt>
        <dd className="text-body-sm text-ink">{formatPrice(subtotal)}</dd>
      </div>

      <div className="flex items-center justify-between py-1.5">
        <dt className="text-body-sm text-ink-muted">Shipping</dt>
        <dd className="text-body-sm text-ink">
          {shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}
        </dd>
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
        <dt className="text-body font-semibold text-ink">Grand total</dt>
        <dd className="text-h5 font-semibold text-primary-deep">{formatPrice(grandTotal)}</dd>
      </div>
    </dl>
  );
}
