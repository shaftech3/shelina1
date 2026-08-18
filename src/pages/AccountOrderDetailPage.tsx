import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCustomerAccount, useMyOrder, useSeo } from '@/hooks';
import { orderService } from '@/services';
import { Layout } from '@/components/layout';
import { ButtonLink, Container, Icon, Section, Spinner } from '@/components/ui';
import { ErrorState } from '@/components/ui/States';
import { OrderItemsTable, OrderStatusBadge, OrderTotals } from '@/components/order';

/**
 * Customer order detail.
 *
 * Ownership is enforced by the API: this id resolves only if the order belongs
 * to the session that asked for it, and someone else's id returns 404. The
 * route guard here is a UX nicety, not the security boundary.
 */
export function AccountOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, initialising } = useCustomerAccount();
  const { data: order, loading, error, retry } = useMyOrder(id);

  useSeo({
    title: order ? `Order ${order.orderNumber}` : 'Order',
    description: 'Your Shelina order details.',
    path: `/account/orders/${id ?? ''}`,
    noIndex: true,
  });

  useEffect(() => {
    if (!initialising && !isAuthenticated) {
      navigate(`/account/sign-in?redirect=/account/orders/${id ?? ''}`, { replace: true });
    }
  }, [initialising, isAuthenticated, navigate, id]);

  return (
    <Layout>
      <Section>
        <Container className="py-8 md:py-10">
          <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
            <Link to="/account" className="hover:text-ink">
              My account
            </Link>
            <span aria-hidden="true"> / </span>
            <Link to="/account/orders" className="hover:text-ink">
              Orders
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-ink">{order?.orderNumber ?? 'Order'}</span>
          </nav>

          {(initialising || loading) && (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          )}

          {!loading && error && (
            <ErrorState
              title="Order not found"
              description="This order does not exist, or it belongs to a different account."
              onRetry={retry}
              className="mt-8"
            />
          )}

          {!loading && order && (
            <>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-h2">{order.orderNumber}</h1>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="mt-2 text-body-sm text-ink-muted">
                    Placed on{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-PK', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    {' · '}
                    Cash on Delivery ({order.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'})
                  </p>
                </div>

                {/* Plain anchor so the browser handles the download natively
                    on desktop and mobile; the cookie authorises it. */}
                <a
                  href={orderService.invoiceUrl(order.id)}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 text-body-sm font-semibold text-white transition-colors duration-fast hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Icon name="download" size={18} />
                  Download invoice
                </a>
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="surface-card p-5">
                  <h2 className="text-h5 text-ink">Items</h2>
                  <div className="mt-4">
                    <OrderItemsTable items={order.items} />
                  </div>
                </div>

                <aside className="flex flex-col gap-6">
                  <div className="surface-card p-5">
                    <h2 className="text-h5 text-ink">Summary</h2>
                    <OrderTotals
                      className="mt-3"
                      subtotal={order.subtotal}
                      shippingFee={order.shippingFee}
                      grandTotal={order.grandTotal}
                    />
                  </div>

                  <div className="surface-card p-5">
                    <h2 className="text-h5 text-ink">Delivery</h2>
                    <dl className="mt-3 flex flex-col gap-3 text-body-sm">
                      <div>
                        <dt className="text-caption uppercase tracking-wide text-ink-muted">
                          Contact
                        </dt>
                        <dd className="mt-1 text-ink">{order.customerName}</dd>
                        <dd className="text-ink-muted">{order.customerEmail}</dd>
                        <dd className="text-ink-muted">{order.customerPhone}</dd>
                      </div>
                      <div>
                        <dt className="text-caption uppercase tracking-wide text-ink-muted">
                          Address
                        </dt>
                        <dd className="mt-1 whitespace-pre-line text-ink">
                          {order.shippingAddress}
                        </dd>
                        <dd className="text-ink">{order.city}</dd>
                      </div>
                      {order.notes && (
                        <div>
                          <dt className="text-caption uppercase tracking-wide text-ink-muted">
                            Notes
                          </dt>
                          <dd className="mt-1 whitespace-pre-line text-ink">{order.notes}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </aside>
              </div>

              <div className="mt-8">
                <ButtonLink href="/account/orders" variant="ghost">
                  Back to orders
                </ButtonLink>
              </div>
            </>
          )}
        </Container>
      </Section>
    </Layout>
  );
}
