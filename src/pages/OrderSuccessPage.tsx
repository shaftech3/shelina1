import { useParams } from 'react-router-dom';
import { useMyOrder, useSeo } from '@/hooks';
import { orderService } from '@/services';
import { formatPrice } from '@/lib/format';
import { OFFICIAL_WHATSAPP_NUMBER, STORE_CONFIG } from '@/lib/constants';
import { Layout } from '@/components/layout';
import { ButtonLink, Container, Icon, Section, Spinner } from '@/components/ui';
import { ErrorState } from '@/components/ui/States';

export function OrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data: order, loading, error, retry } = useMyOrder(orderNumber);

  useSeo({
    title: order ? `Order Confirmed #${order.orderNumber}` : 'Order Confirmation',
    description: 'Your Shelina order has been placed successfully.',
    path: `/order/success/${orderNumber ?? ''}`,
    noIndex: true,
  });

  const whatsappMessage = encodeURIComponent(
    `Hi Shelina, I have a question regarding my order #${order?.orderNumber || orderNumber}.`,
  );
  const whatsappUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${whatsappMessage}`;

  const emailSubject = encodeURIComponent(`Question regarding order #${order?.orderNumber || orderNumber}`);
  const emailUrl = `mailto:${STORE_CONFIG.supportEmail}?subject=${emailSubject}`;

  return (
    <Layout>
      <Section>
        <Container className="py-10 md:py-16">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Spinner />
              <p className="mt-4 text-body-sm text-ink-muted">Loading your order confirmation...</p>
            </div>
          )}

          {!loading && error && (
            <div className="mx-auto max-w-xl">
              <ErrorState
                title="We could not load that order"
                description="The order link may be incomplete, or the order was placed under a different session."
                onRetry={retry}
              />
              <div className="mt-6 text-center">
                <ButtonLink href="/shop" variant="primary">
                  Continue Shopping
                </ButtonLink>
              </div>
            </div>
          )}

          {!loading && order && (
            <div className="mx-auto max-w-3xl">
              {/* Success Header */}
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success-deep">
                  <Icon name="check" size={32} />
                </div>
                <span className="mt-4 inline-block rounded-full bg-primary-deep/10 px-3 py-1 text-caption font-semibold text-primary-deep uppercase tracking-wider">
                  Order {order.status}
                </span>
                <h1 className="mt-2 text-h2 font-serif text-ink">Thank You for Your Order!</h1>
                <p className="mt-2 text-body text-ink-muted">
                  Your order has been received and is now being processed. Our team will contact you shortly to confirm your order.
                </p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-cream px-4 py-2 text-body-sm font-semibold text-ink">
                  <span>Order Reference:</span>
                  <span className="font-mono text-primary-deep">{order.orderNumber}</span>
                </div>
              </div>

              {/* Order Info Grid */}
              <div className="mt-10 grid gap-6 md:grid-cols-2">
                {/* Customer & Delivery Details */}
                <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm">
                  <h2 className="text-h5 font-serif text-ink border-b border-border pb-3 flex items-center gap-2">
                    <Icon name="user" size={18} className="text-primary-deep" />
                    Delivery Details
                  </h2>
                  <div className="mt-4 space-y-3 text-body-sm">
                    <div>
                      <p className="text-caption text-ink-muted uppercase">Customer Name</p>
                      <p className="font-medium text-ink">{order.customerName}</p>
                    </div>
                    <div>
                      <p className="text-caption text-ink-muted uppercase">Phone Number</p>
                      <p className="font-medium text-ink">{order.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-caption text-ink-muted uppercase">Email</p>
                      <p className="font-medium text-ink">{order.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-caption text-ink-muted uppercase">Delivery Address</p>
                      <p className="font-medium text-ink">
                        {order.streetAddress ? (
                          <>
                            {order.streetAddress}
                            {order.area ? `, ${order.area}` : ''}
                            <br />
                            {order.city}
                            {order.province ? `, ${order.province}` : ''}
                          </>
                        ) : (
                          order.shippingAddress
                        )}
                      </p>
                    </div>
                    {order.notes && (
                      <div className="rounded bg-cream/70 p-3 text-caption text-ink-muted">
                        <strong className="text-ink">Order Notes:</strong> {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment & Status Details */}
                <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm">
                  <h2 className="text-h5 font-serif text-ink border-b border-border pb-3 flex items-center gap-2">
                    <Icon name="truck" size={18} className="text-primary-deep" />
                    Payment & Shipping
                  </h2>
                  <div className="mt-4 space-y-4 text-body-sm">
                    <div>
                      <p className="text-caption text-ink-muted uppercase">Payment Method</p>
                      <div className="mt-1 flex items-center gap-2 font-medium text-ink">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20 text-success-deep text-xs font-bold">
                          ✓
                        </span>
                        Cash on Delivery (COD)
                      </div>
                      <p className="mt-1 text-caption text-ink-muted">
                        Pay cash directly to the courier upon arrival at your doorstep.
                      </p>
                    </div>

                    <div>
                      <p className="text-caption text-ink-muted uppercase">Payment Status</p>
                      <span className="mt-1 inline-block rounded bg-amber-500/10 px-2.5 py-0.5 text-caption font-medium text-amber-700">
                        {order.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid (Due on Delivery)'}
                      </span>
                    </div>

                    <div>
                      <p className="text-caption text-ink-muted uppercase">Estimated Delivery</p>
                      <p className="font-medium text-ink">3–5 Business Days across Pakistan</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="mt-8 rounded-editorial border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-h5 font-serif text-ink border-b border-border pb-3">
                  Ordered Items ({order.items.length})
                </h2>

                <ul className="mt-4 divide-y divide-border/60">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="h-18 w-16 shrink-0 rounded-md border border-border/60 bg-[#faf8f5] object-contain p-1"
                        />
                      ) : (
                        <div className="h-18 w-16 shrink-0 rounded-md border border-border/60 bg-[#faf8f5] flex items-center justify-center text-ink-subtle">
                          <Icon name="cart" size={20} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-body font-medium text-ink">{item.productName}</h3>
                        <p className="mt-0.5 text-caption text-ink-muted">
                          {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
                            .filter(Boolean)
                            .join(' · ') || 'Standard variant'}
                        </p>
                        <p className="mt-0.5 text-caption text-ink-muted">
                          {formatPrice(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-body font-semibold text-ink">{formatPrice(item.lineTotal)}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Price Breakdown */}
                <div className="mt-6 border-t border-border pt-4">
                  <dl className="space-y-2 text-body-sm">
                    <div className="flex justify-between text-ink-muted">
                      <dt>Subtotal</dt>
                      <dd className="font-medium text-ink">{formatPrice(order.subtotal)}</dd>
                    </div>
                    <div className="flex justify-between text-ink-muted">
                      <dt>Delivery Charges</dt>
                      <dd className="font-medium text-ink">
                        {order.shippingFee === 0 ? (
                          <span className="font-semibold text-success-deep">FREE</span>
                        ) : (
                          formatPrice(order.shippingFee)
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-body font-semibold text-ink">
                      <dt>Total Amount Due (COD)</dt>
                      <dd className="text-h4 font-serif font-bold text-primary-deep">
                        {formatPrice(order.grandTotal)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Action and Support Buttons */}
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-body-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                  >
                    <Icon name="external" size={16} />
                    WhatsApp Us about this order
                  </a>
                  <a
                    href={emailUrl}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-body-sm font-medium text-ink transition-colors hover:bg-cream"
                  >
                    <Icon name="info" size={16} />
                    Email Support
                  </a>
                  <a
                    href={orderService.invoiceUrl(order.id)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-body-sm font-medium text-ink transition-colors hover:bg-cream"
                  >
                    <Icon name="download" size={16} />
                    Download Invoice
                  </a>
                </div>

                <div>
                  <ButtonLink href="/shop" variant="primary">
                    Continue Shopping
                  </ButtonLink>
                </div>
              </div>
            </div>
          )}
        </Container>
      </Section>
    </Layout>
  );
}
