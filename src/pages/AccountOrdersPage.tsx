import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAccount, useMyOrders, useSeo } from '@/hooks';
import { formatPrice } from '@/lib/format';
import { Layout } from '@/components/layout';
import { ButtonLink, Container, Section, Spinner } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { OrderStatusBadge } from '@/components/order';

/**
 * My Orders — the customer's own order history.
 *
 * Deliberately a simple list, not a dashboard. The API scopes results to the
 * session cookie, so there is no customer id in the URL to tamper with.
 */
export function AccountOrdersPage() {
  const navigate = useNavigate();
  const { isAuthenticated, initialising } = useCustomerAccount();
  const { data, loading, error, retry } = useMyOrders();

  useSeo({
    title: 'My orders',
    description: 'Your Shelina order history.',
    path: '/account/orders',
    noIndex: true,
  });

  useEffect(() => {
    if (!initialising && !isAuthenticated) {
      navigate('/account/sign-in?redirect=/account/orders', { replace: true });
    }
  }, [initialising, isAuthenticated, navigate]);

  const orders = data?.orders ?? [];

  return (
    <Layout>
      <Section>
        <Container className="py-8 md:py-10">
          <nav aria-label="Breadcrumb" className="text-caption text-ink-muted">
            <Link to="/account" className="hover:text-ink">
              My account
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-ink">Orders</span>
          </nav>

          <h1 className="mt-3 text-h2">My orders</h1>
          <p className="mt-2 text-body-sm text-ink-muted">
            Every order you have placed with Shelina.
          </p>

          {(initialising || loading) && (
            <div className="flex justify-center py-14">
              <Spinner />
            </div>
          )}

          {!loading && error && (
            <ErrorState
              title="Could not load your orders"
              description="Please check your connection and try again."
              onRetry={retry}
              className="mt-8"
            />
          )}

          {!loading && !error && orders.length === 0 && (
            <EmptyState
              title="No orders yet"
              description="When you place an order it will appear here with its invoice."
              className="mt-8"
            />
          )}

          {!loading && !error && orders.length === 0 && (
            <div className="mt-5 flex justify-center">
              <ButtonLink href="/shop">Start shopping</ButtonLink>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <ul className="mt-7 flex flex-col gap-4">
              {orders.map((order) => (
                <li key={order.id} className="surface-card p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body font-semibold text-ink">{order.orderNumber}</p>
                        <OrderStatusBadge status={order.status} size="sm" />
                      </div>
                      <p className="mt-1 text-caption text-ink-muted">
                        {new Date(order.createdAt).toLocaleDateString('en-PK', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {' · '}
                        {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="text-body font-semibold text-primary-deep">
                        {formatPrice(order.grandTotal)}
                      </p>
                      <ButtonLink href={`/account/orders/${order.id}`} size="sm" variant="outline">
                        View order
                      </ButtonLink>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data && data.meta.pageCount > 1 && (
            <p className="mt-6 text-center text-caption text-ink-muted">
              Showing {orders.length} of {data.meta.total} orders.
            </p>
          )}
        </Container>
      </Section>
    </Layout>
  );
}
