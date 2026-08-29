import { useSeo } from '@/hooks';
import { formatPrice } from '@/lib/format';
import { buildCartWhatsAppUrl } from '@/lib/whatsapp';
import { Layout } from '@/components/layout';
import { Button, ButtonLink, Container, Divider, Icon, Section, useToast } from '@/components/ui';
import { CartLine } from '@/components/cart/CartLine';
import { useCart } from '@/cart';

export function CartPage() {
  useSeo({
    title: 'Your bag',
    description: 'Review the items in your Shelina bag.',
    path: '/cart',
    noIndex: true,
  });

  const { items, totals, updateQuantity, removeItem, clear } = useCart();
  const { notify } = useToast();

  const handleWhatsAppOrder = () => {
    if (items.length === 0) return;
    const whatsappUrl = buildCartWhatsAppUrl({
      items,
      subtotal: totals.subtotal,
    });
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (items.length === 0) {
    return (
      <Layout>
        <Section>
          <Container>
            <h1 className="sr-only">Your bag</h1>
            <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-12 text-center">
              <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-cream text-primary-deep">
                <Icon name="cart" size={32} />
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="font-display text-h2 text-ink">Your bag is empty</h2>
                <p className="text-body text-ink-muted">
                  Once you add a pair it will appear here, with the size and colour you picked.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/shop">Continue shopping</ButtonLink>
                <ButtonLink href="/new-arrivals" variant="outline">
                  See new arrivals
                </ButtonLink>
              </div>
            </div>
          </Container>
        </Section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Section spacing="tight">
        <Container>
          <div className="flex flex-col gap-2">
            <span className="eyebrow text-primary-deep">Your selection</span>
            <h1 className="font-display text-h1 text-ink">Your bag</h1>
            <p className="text-body text-ink-muted">
              {totals.count} {totals.count === 1 ? 'item' : 'items'} across {totals.lineCount}{' '}
              {totals.lineCount === 1 ? 'line' : 'lines'}.
            </p>
          </div>
        </Container>
      </Section>

      <Section spacing="tight" className="pt-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
            <div>
              <ul className="divide-y divide-border border-y border-border">
                {items.map((item) => (
                  <CartLine
                    key={item.key}
                    item={item}
                    onQuantityChange={updateQuantity}
                    onRemove={removeItem}
                    variant="page"
                  />
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <ButtonLink href="/shop" variant="ghost">
                  Continue shopping
                </ButtonLink>
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    notify({ title: 'Bag cleared', tone: 'info' });
                  }}
                  className="rounded-xs text-caption text-ink-muted underline-offset-4 transition-colors hover:text-error hover:underline focus-visible:outline-none focus-visible:shadow-focus"
                >
                  Clear bag
                </button>
              </div>
            </div>

            <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:h-fit">
              <div className="rounded-lg border border-border bg-cream p-6">
                <h2 className="font-display text-h4 text-ink">Summary</h2>

                <dl className="mt-5 flex flex-col gap-3 text-body-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-muted">Subtotal</dt>
                    <dd className="font-semibold text-ink">{formatPrice(totals.subtotal)}</dd>
                  </div>

                  {totals.savings > 0 && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-ink-muted">You save</dt>
                      <dd className="font-medium text-secondary-deep">
                        {formatPrice(totals.savings)}
                      </dd>
                    </div>
                  )}
                </dl>

                <Divider className="my-5" />

                <p className="text-caption text-ink-muted">
                  Delivery charges and final confirmation are provided at checkout or via WhatsApp.
                </p>

                <div className="mt-5 flex flex-col gap-2.5">
                  <ButtonLink href="/checkout" fullWidth>
                    Proceed to Checkout
                  </ButtonLink>

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
                </div>

                <Button
                  variant="ghost"
                  fullWidth
                  className="mt-2 lg:hidden"
                  onClick={() => window.history.back()}
                >
                  Back
                </Button>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </Layout>
  );
}
