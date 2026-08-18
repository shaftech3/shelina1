import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPrice } from '@/lib/format';
import { Button, ErrorState, Icon, Select, Skeleton, useToast } from '@/components/ui';
import { useAdminOrder, useSeo } from '@/hooks';
import { orderService, ServiceError } from '@/services';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types';
import { OrderItemsTable, OrderStatusBadge, OrderTotals } from '@/components/order';
import { AdminLayout } from '../components/AdminLayout';

/**
 * Admin order detail.
 *
 * Shows the full order and lets an admin advance its status. The list of legal
 * next statuses comes from the SERVER (`allowedTransitions`), so this page
 * cannot offer a move the backend would reject — and the backend re-checks it
 * regardless.
 */
export function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, loading, error, retry } = useAdminOrder(id);
  const { notify } = useToast();

  const [nextStatus, setNextStatus] = useState<OrderStatus | ''>('');
  const [saving, setSaving] = useState(false);

  useSeo({
    title: order ? `Order ${order.orderNumber}` : 'Order',
    path: `/admin/orders/${id ?? ''}`,
    noIndex: true,
  });

  const transitions = order?.allowedTransitions ?? [];

  async function handleStatusChange() {
    if (!order || !nextStatus || saving) return;

    setSaving(true);
    try {
      const updated = await orderService.updateStatus(order.id, nextStatus);
      notify({
        title: `Order ${ORDER_STATUS_LABELS[updated.status].toLowerCase()}`,
        description:
          updated.status === 'CANCELLED'
            ? 'The reserved stock has been returned to the catalogue.'
            : `${updated.orderNumber} is now ${ORDER_STATUS_LABELS[updated.status]}.`,
        tone: 'success',
      });
      setNextStatus('');
      retry();
    } catch (cause) {
      notify({
        title: 'Could not update the order',
        description:
          cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title={order ? order.orderNumber : 'Order'}
      description={order ? `Placed ${new Date(order.createdAt).toLocaleString('en-PK')}` : undefined}
      actions={
        order ? (
          <a
            href={orderService.invoiceUrl(order.id)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-body-sm font-semibold text-ink transition-colors duration-fast hover:bg-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon name="download" size={16} />
            Invoice
          </a>
        ) : undefined
      }
    >
      <p className="mb-5 text-caption text-ink-muted">
        <Link to="/admin/orders" className="hover:text-ink">
          ← Back to orders
        </Link>
      </p>

      {loading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {!loading && error && (
        <ErrorState
          title="Order not found"
          description="This order does not exist or could not be loaded."
          onRetry={retry}
        />
      )}

      {!loading && order && (
        <div className="flex flex-col gap-6">
          {/* ── Status ─────────────────────────────────────────────── */}
          <section className="surface-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-h5 text-ink">Status</h2>
                <div className="mt-2 flex items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  <span className="text-caption text-ink-muted">
                    Payment: {order.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid'} (Cash on Delivery)
                  </span>
                </div>
              </div>

              {transitions.length > 0 ? (
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
                  <Select
                    label="Move to"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as OrderStatus | '')}
                    wrapperClassName="sm:w-56"
                    options={[
                      { value: '', label: 'Choose a status…' },
                      ...transitions.map((value) => ({
                        value,
                        label: ORDER_STATUS_LABELS[value],
                      })),
                    ]}
                  />
                  <Button
                    onClick={() => void handleStatusChange()}
                    disabled={!nextStatus || saving}
                    loading={saving}
                  >
                    Update status
                  </Button>
                </div>
              ) : (
                <p className="text-caption text-ink-muted">
                  A {ORDER_STATUS_LABELS[order.status].toLowerCase()} order is final.
                </p>
              )}
            </div>

            {nextStatus === 'CANCELLED' && (
              <p className="mt-4 rounded-md bg-warning/10 p-3 text-caption text-warning-deep">
                Cancelling returns every item in this order to stock. This happens once and cannot
                be undone.
              </p>
            )}
          </section>

          {/* ── Customer & shipping ────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="surface-card p-5">
              <h2 className="text-h5 text-ink">Customer</h2>
              <dl className="mt-3 flex flex-col gap-2 text-body-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-ink-muted">Name</dt>
                  <dd className="text-ink">{order.customerName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-ink-muted">Email</dt>
                  <dd className="break-all text-ink">{order.customerEmail}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-ink-muted">Phone</dt>
                  <dd className="text-ink">{order.customerPhone}</dd>
                </div>
              </dl>
            </section>

            <section className="surface-card p-5">
              <h2 className="text-h5 text-ink">Shipping</h2>
              <dl className="mt-3 flex flex-col gap-2 text-body-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-ink-muted">Address</dt>
                  <dd className="whitespace-pre-line text-ink">{order.shippingAddress}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-ink-muted">City</dt>
                  <dd className="text-ink">{order.city}</dd>
                </div>
                {order.notes && (
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-ink-muted">Notes</dt>
                    <dd className="whitespace-pre-line text-ink">{order.notes}</dd>
                  </div>
                )}
              </dl>
            </section>
          </div>

          {/* ── Items ──────────────────────────────────────────────── */}
          <section className="surface-card p-5">
            <h2 className="text-h5 text-ink">Items</h2>
            <p className="mt-1 text-caption text-ink-muted">
              Recorded as purchased — later catalogue edits do not change these values.
            </p>
            <div className="mt-4">
              <OrderItemsTable items={order.items} />
            </div>

            <div className="mt-6 flex justify-end">
              <OrderTotals
                className="w-full max-w-[280px]"
                subtotal={order.subtotal}
                shippingFee={order.shippingFee}
                grandTotal={order.grandTotal}
              />
            </div>
          </section>

          <p className="text-caption text-ink-muted">
            Order total {formatPrice(order.grandTotal)} · {order.itemCount}{' '}
            {order.itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
      )}
    </AdminLayout>
  );
}
