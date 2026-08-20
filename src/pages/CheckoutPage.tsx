import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/cart';
import { useCustomerAccount, useSeo } from '@/hooks';
import { orderService, ApiValidationError } from '@/services';
import { formatPrice } from '@/lib/format';
import { Layout } from '@/components/layout';
import {
  Button,
  ButtonLink,
  Container,
  Divider,
  Icon,
  Input,
  Section,
  Spinner,
  Textarea,
  useToast,
} from '@/components/ui';

/**
 * Checkout — Cash on Delivery.
 *
 * Three things worth knowing about this page:
 *
 *  1. It requires a signed-in customer. A guest is redirected to sign-in with
 *     a `redirect` param, and their cart survives the round trip because the
 *     cart lives in its own storage and logging in never touches it.
 *
 *  2. It sends WHAT is being bought, never WHAT IT COSTS. The totals rendered
 *     here are for the customer's benefit; the server independently prices the
 *     order from the database and its answer is the one that counts.
 *
 *  3. Submitting twice cannot create two orders. One idempotency key is minted
 *     per checkout attempt and reused for retries, so the server recognises a
 *     duplicate and returns the original order.
 */
export function CheckoutPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { items, totals, clear } = useCart();
  const { customer, isAuthenticated, initialising } = useCustomerAccount();

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    city: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [shippingFee, setShippingFee] = useState<number | null>(null);

  /**
   * One key per attempt. Kept in a ref so a re-render cannot mint a new one
   * mid-submit, which would defeat the whole purpose.
   */
  const idempotencyKey = useRef<string>(createKey());

  useSeo({
    title: 'Checkout',
    description: 'Complete your Shelina order. Cash on Delivery.',
    path: '/checkout',
    noIndex: true,
  });

  // Prefill from the account if logged in, but leave every field editable — the delivery
  // name and the account name are not always the same person.
  useEffect(() => {
    if (!customer) return;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || customer.name,
      customerEmail: current.customerEmail || customer.email,
    }));
  }, [customer]);

  /**
   * Ask the server what shipping will cost. Displaying a locally-guessed fee
   * would risk showing a number different from the one actually charged.
   */
  useEffect(() => {
    if (totals.subtotal <= 0) return;
    let active = true;
    orderService
      .shippingQuote(totals.subtotal)
      .then((quote) => {
        if (active) setShippingFee(quote.shippingFee);
      })
      .catch(() => {
        // Non-fatal: fall back to showing the fee as "calculated at checkout".
        if (active) setShippingFee(null);
      });
    return () => {
      active = false;
    };
  }, [totals.subtotal]);

  const grandTotal = useMemo(
    () => totals.subtotal + (shippingFee ?? 0),
    [totals.subtotal, shippingFee],
  );

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  /** Fast feedback only. The backend re-validates every one of these. */
  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.customerName.trim()) next.customerName = 'Enter your full name.';
    if (!form.customerEmail.trim()) next.customerEmail = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim()))
      next.customerEmail = 'Enter a valid email address.';
    if (!form.customerPhone.trim()) next.customerPhone = 'Enter your phone number.';
    else if (form.customerPhone.replace(/\D/g, '').length < 7)
      next.customerPhone = 'Enter a valid phone number.';
    if (!form.shippingAddress.trim()) next.shippingAddress = 'Enter your delivery address.';
    if (!form.city.trim()) next.city = 'Enter your city.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // The guard that actually prevents a double submit is the idempotency key;
    // this just avoids firing a pointless second request.
    if (submitting) return;
    if (items.length === 0) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const order = await orderService.place({
        ...form,
        notes: form.notes.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
        // Only identity and quantity. No prices leave the browser.
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        })),
      });

      // The cart is cleared ONLY after the server confirms the order.
      clear();
      navigate(`/order/success/${order.orderNumber}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiValidationError) {
        setErrors(error.fields);
        notify({
          title: 'Check your details',
          description: error.message,
          tone: 'error',
        });
      } else {
        notify({
          title: 'Could not place your order',
          description: error instanceof Error ? error.message : 'Please try again.',
          tone: 'error',
        });
      }
      // The cart is deliberately untouched on failure, and the form keeps
      // everything the customer typed so they can correct and retry.
      setSubmitting(false);
    }
  };

  // Resolving the session, or bouncing a guest to sign-in. Show a spinner
  // rather than flashing a checkout form that is about to disappear.
  if (initialising || !isAuthenticated) {
    return (
      <Layout>
        <Section>
          <Container className="py-16">
            <div className="flex justify-center">
              <Spinner />
            </div>
          </Container>
        </Section>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <Section>
          <Container className="py-14">
            <div className="mx-auto max-w-[520px] text-center">
              <h1 className="text-h2">Your cart is empty.</h1>
              <p className="mt-3 text-body text-ink-muted">
                Add something you love and it will appear here, ready to check out.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/shop">Continue shopping</ButtonLink>
                <ButtonLink href="/new-arrivals" variant="outline">
                  New arrivals
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
      <Section>
        <Container className="py-8 md:py-10">
          <h1 className="text-h2">Checkout</h1>
          <p className="mt-2 text-body-sm text-ink-muted">
            Cash on Delivery — pay the courier when your order arrives.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* ── Details ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-8">
              <fieldset className="flex flex-col gap-4">
                <legend className="text-h5 text-ink">Customer information</legend>

                <Input
                  label="Full name"
                  name="customerName"
                  autoComplete="name"
                  required
                  value={form.customerName}
                  onChange={(event) => set('customerName', event.target.value)}
                  error={errors.customerName}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Email"
                    name="customerEmail"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.customerEmail}
                    onChange={(event) => set('customerEmail', event.target.value)}
                    error={errors.customerEmail}
                  />
                  <Input
                    label="Phone"
                    name="customerPhone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="03001234567"
                    value={form.customerPhone}
                    onChange={(event) => set('customerPhone', event.target.value)}
                    error={errors.customerPhone}
                  />
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-4">
                <legend className="text-h5 text-ink">Shipping information</legend>

                <Textarea
                  label="Address"
                  name="shippingAddress"
                  rows={3}
                  autoComplete="street-address"
                  required
                  placeholder="House / street / area"
                  value={form.shippingAddress}
                  onChange={(event) => set('shippingAddress', event.target.value)}
                  error={errors.shippingAddress}
                />
                <Input
                  label="City"
                  name="city"
                  autoComplete="address-level2"
                  required
                  value={form.city}
                  onChange={(event) => set('city', event.target.value)}
                  error={errors.city}
                />
                <Textarea
                  label="Order notes"
                  name="notes"
                  rows={2}
                  hint="Optional — landmarks or delivery instructions."
                  value={form.notes}
                  onChange={(event) => set('notes', event.target.value)}
                  error={errors.notes}
                />
              </fieldset>
            </div>

            {/* ── Summary ─────────────────────────────────────────── */}
            <aside className="lg:sticky lg:top-[calc(var(--header-height)+20px)] lg:self-start">
              <div className="surface-card p-5">
                <h2 className="text-h5 text-ink">Order summary</h2>

                <ul className="mt-4 flex flex-col gap-3">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-3">
                      {item.image?.src ? (
                        <img
                          src={item.image.src}
                          alt=""
                          loading="lazy"
                          className="h-16 w-14 shrink-0 rounded-md bg-cream object-cover"
                        />
                      ) : (
                        <div className="h-16 w-14 shrink-0 rounded-md bg-cream" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-medium text-ink">{item.productName}</p>
                        {/* The exact free-form variant strings, as chosen. */}
                        <p className="mt-0.5 text-caption text-ink-muted">
                          {[item.size, item.color].filter(Boolean).join(' · ') || 'One option'}
                          {' · '}
                          Qty {item.quantity}
                        </p>
                      </div>
                      <p className="text-body-sm font-medium text-ink">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <Divider className="my-4" />

                <dl>
                  <div className="flex items-center justify-between py-1.5">
                    <dt className="text-body-sm text-ink-muted">Subtotal</dt>
                    <dd className="text-body-sm text-ink">{formatPrice(totals.subtotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <dt className="text-body-sm text-ink-muted">Shipping</dt>
                    <dd className="text-body-sm text-ink">
                      {shippingFee === null
                        ? 'Calculated at checkout'
                        : shippingFee === 0
                          ? 'Free'
                          : formatPrice(shippingFee)}
                    </dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                    <dt className="text-body font-semibold text-ink">Total</dt>
                    <dd className="text-h5 font-semibold text-primary-deep">
                      {formatPrice(grandTotal)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 flex items-start gap-2 rounded-md bg-cream p-3 text-caption text-ink-muted">
                  <Icon name="truck" className="mt-0.5 shrink-0 text-primary-deep" size={16} />
                  <span>
                    <strong className="font-semibold text-ink">Cash on Delivery.</strong> No online
                    payment is taken now — pay the courier when your order arrives.
                  </span>
                </p>

                <Button type="submit" fullWidth className="mt-5" loading={submitting} disabled={submitting}>
                  {submitting ? 'Placing order…' : 'Place order'}
                </Button>

                <ButtonLink href="/cart" variant="ghost" fullWidth className="mt-2">
                  Back to cart
                </ButtonLink>
              </div>
            </aside>
          </form>
        </Container>
      </Section>
    </Layout>
  );
}

/**
 * Idempotency key for this checkout attempt. `crypto.randomUUID` where
 * available, with a timestamp+random fallback for older mobile browsers.
 */
function createKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
