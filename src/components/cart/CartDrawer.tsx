import { formatPrice } from '@/lib/format';
import { Button, ButtonLink, Drawer, Icon } from '@/components/ui';
import { useCart } from '@/cart';
import { CartLine } from './CartLine';

/**
 * Slide-over cart.
 *
 * Built on the Stage 1 Drawer, so focus trapping, Escape handling, the
 * body-scroll lock and the exit animation are all inherited rather than
 * reimplemented.
 */
export function CartDrawer() {
  const { items, totals, isOpen, closeCart, updateQuantity, removeItem } = useCart();

  const isEmpty = items.length === 0;

  /**
   * Adding to the bag opens this drawer instead of raising a success toast,
   * so the drawer itself has to carry the announcement for screen readers.
   */
  const summary = isEmpty
    ? 'Your bag is empty.'
    : `Bag updated. ${totals.count} ${totals.count === 1 ? 'item' : 'items'}, subtotal ${formatPrice(totals.subtotal)}.`;

  return (
    <Drawer
      open={isOpen}
      onClose={closeCart}
      title={totals.count > 0 ? `Your bag (${totals.count})` : 'Your bag'}
      side="right"
      footer={
        isEmpty ? undefined : (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-body-sm text-ink-muted">Subtotal</span>
              <span className="text-body font-semibold text-ink">{formatPrice(totals.subtotal)}</span>
            </div>

            {totals.savings > 0 && (
              <div className="flex items-baseline justify-between text-caption">
                <span className="text-ink-muted">You save</span>
                <span className="font-medium text-secondary-deep">
                  {formatPrice(totals.savings)}
                </span>
              </div>
            )}

            <p className="text-caption text-ink-subtle">
              Delivery and any applicable charges are calculated later.
            </p>

            <div className="flex flex-col gap-2">
              <ButtonLink href="/cart" onClick={closeCart} fullWidth>
                View bag
              </ButtonLink>
              <Button variant="ghost" fullWidth onClick={closeCart}>
                Continue shopping
              </Button>
            </div>
          </div>
        )
      }
    >
      <span aria-live="polite" role="status" className="sr-only">
        {isOpen ? summary : ''}
      </span>

      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-5 py-10 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-cream text-primary-deep">
            <Icon name="cart" size={26} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-display text-h4 text-ink">Your bag is empty</h3>
            <p className="max-w-[24ch] text-body-sm text-ink-muted">
              Nothing here yet — the collection is a good place to start.
            </p>
          </div>
          <ButtonLink href="/shop" onClick={closeCart}>
            Start shopping
          </ButtonLink>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <CartLine
              key={item.key}
              item={item}
              onQuantityChange={updateQuantity}
              onRemove={removeItem}
              onNavigate={closeCart}
            />
          ))}
        </ul>
      )}
    </Drawer>
  );
}
