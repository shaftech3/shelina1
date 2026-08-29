import { useNavigate } from 'react-router-dom';
import { formatPrice } from '@/lib/format';
import { buildCartWhatsAppUrl } from '@/lib/whatsapp';
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
  const navigate = useNavigate();
  const { items, totals, isOpen, closeCart, updateQuantity, removeItem } = useCart();

  const isEmpty = items.length === 0;

  const handleWhatsAppOrder = () => {
    if (isEmpty) return;
    const whatsappUrl = buildCartWhatsAppUrl({
      items,
      subtotal: totals.subtotal,
    });
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

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
              Delivery charges and final confirmation are provided at checkout.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  closeCart();
                  navigate('/checkout');
                }}
                fullWidth
                variant="primary"
              >
                Proceed to Checkout
              </Button>
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-[#25D366]/50 bg-surface px-4 text-body-sm font-medium text-ink shadow-2xs transition-all duration-base hover:border-[#25D366] hover:bg-[#25D366]/8 hover:text-[#128C7E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] active:scale-98"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4.5 w-4.5 text-[#25D366]"
                  aria-hidden="true"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                Order via WhatsApp
              </button>
              <Button
                onClick={() => {
                  closeCart();
                  navigate('/cart');
                }}
                fullWidth
                variant="outline"
              >
                View Bag
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
