import { useSeo } from '@/hooks';
import { formatPrice } from '@/lib/format';
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

                {/* No tax, delivery or coupon engine in this stage, and no
                    invented policy copy about any of them. */}
                <p className="text-caption text-ink-muted">
                  Delivery and any applicable charges are calculated at a later step.
                </p>

                <ButtonLink href="/checkout" fullWidth className="mt-5">
                  Proceed to checkout
                </ButtonLink>

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
