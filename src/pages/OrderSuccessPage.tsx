import { useParams } from 'react-router-dom';
import { useMyOrder, useSeo } from '@/hooks';
import { orderService } from '@/services';
import { formatPrice } from '@/lib/format';
import { Layout } from '@/components/layout';
import { ButtonLink, Container, Icon, Section, Spinner } from '@/components/ui';
import { ErrorState } from '@/components/ui/States';

/**
 * Order confirmation.
 *
 * Reached by REDIRECT after checkout, and addressed by order number, so it is
 * safe to reload or bookmark: this page only ever READS an existing order.
 * Refreshing it cannot place a second order, because nothing here posts.
 */
export function OrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data: order, loading, error, retry } = useMyOrder(orderNumber);

  useSeo({
    title: 'Order placed',
    description: 'Your Shelina order has been placed.',
    path: `/order/success/${orderNumber ?? ''}`,
    noIndex: true,
  });

  return (
    <Layout>
      <Section>
        <Container className="py-12 md:py-16">
          {loading && (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          )}

          {!loading && error && (
            <ErrorState
              title="We could not find that order"
              description="It may belong to a different account, or the link may be incomplete."
              onRetry={retry}
            />
          )}

          {!loading && order && (
            <div className="mx-auto max-w-[560px] text-center">
              {/* `reveal`/`is-revealed` is the existing animation utility — it
                  respects prefers-reduced-motion, so no new motion code and no
                  animation library is introduced here. */}
              <div className="reveal is-revealed flex justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/12 text-success-deep">
                  <Icon name="check" size={30} />
                </span>
              </div>

              <h1 className="mt-6 text-h2">Order placed successfully.</h1>
              <p className="mt-3 text-body text-ink-muted">
                Thank you, {order.customerName.split(' ')[0]}. We have emailed nothing yet — your
                confirmation lives right here, and in your account.
              </p>

              <dl className="mt-8 grid gap-3 rounded-editorial bg-cream p-5 text-left sm:grid-cols-2">
                <div>
                  <dt className="text-caption uppercase tracking-wide text-ink-muted">Order number</dt>
                  <dd className="mt-1 text-body font-semibold text-ink">{order.orderNumber}</dd>
                </div>
                <div className="sm:text-right">
                  <dt className="text-caption uppercase tracking-wide text-ink-muted">Total</dt>
                  <dd className="mt-1 text-body font-semibold text-primary-deep">
                    {formatPrice(order.grandTotal)}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption uppercase tracking-wide text-ink-muted">Payment</dt>
                  <dd className="mt-1 text-body-sm text-ink">
                    Cash on Delivery — pay the courier when your order arrives.
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <ButtonLink href={`/account/orders/${order.id}`}>View order</ButtonLink>
                {/* A plain anchor, not fetch: the browser downloads the PDF
                    natively and the session cookie rides along. */}
                <a
                  href={orderService.invoiceUrl(order.id)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border px-5 text-body-sm font-semibold text-ink transition-colors duration-fast hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Icon name="download" size={18} />
                  Download invoice
                </a>
                <ButtonLink href="/shop" variant="ghost">
                  Continue shopping
                </ButtonLink>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </Layout>
  );
}
