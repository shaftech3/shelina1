import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/cart';
import { useCustomerAccount, useSeo } from '@/hooks';
import { orderService, ApiValidationError } from '@/services';
import { formatPrice } from '@/lib/format';
import { buildCheckoutWhatsAppUrl } from '@/lib/whatsapp';
import { Layout } from '@/components/layout';
import {
  Button,
  ButtonLink,
  Container,
  Divider,
  Icon,
  Input,
  Section,
  Select,
  Textarea,
  useToast,
} from '@/components/ui';

const PAKISTAN_PROVINCES = [
  { value: 'Punjab', label: 'Punjab' },
  { value: 'Sindh', label: 'Sindh' },
  { value: 'Khyber Pakhtunkhwa', label: 'Khyber Pakhtunkhwa (KPK)' },
  { value: 'Balochistan', label: 'Balochistan' },
  { value: 'Islamabad Capital Territory', label: 'Islamabad Capital Territory (ICT)' },
  { value: 'Azad Jammu and Kashmir', label: 'Azad Jammu & Kashmir (AJK)' },
  { value: 'Gilgit-Baltistan', label: 'Gilgit-Baltistan (GB)' },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { items, totals, clear } = useCart();
  const { customer } = useCustomerAccount();

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    province: 'Punjab',
    city: '',
    area: '',
    streetAddress: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [shippingFee, setShippingFee] = useState<number | null>(null);

  /**
   * One idempotency key per checkout attempt.
   */
  const idempotencyKey = useRef<string>(createKey());

  useSeo({
    title: 'Checkout — Cash on Delivery',
    description: 'Complete your Shelina footwear order. Cash on Delivery across Pakistan.',
    path: '/checkout',
    noIndex: true,
  });

  // Prefill from account if customer is logged in
  useEffect(() => {
    if (!customer) return;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || customer.name || '',
      customerEmail: current.customerEmail || customer.email || '',
    }));
  }, [customer]);

  // Request shipping fee quote from backend
  useEffect(() => {
    if (totals.subtotal <= 0) return;
    let active = true;
    orderService
      .shippingQuote(totals.subtotal)
      .then((quote) => {
        if (active) setShippingFee(quote.shippingFee);
      })
      .catch(() => {
        // Fallback default calculation if server quote is unreachable
        if (active) setShippingFee(totals.subtotal >= 5000 ? 0 : 250);
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
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  /** Comprehensive form validation */
  const validate = () => {
    const next: Record<string, string> = {};

    if (!form.customerName.trim()) {
      next.customerName = 'Please enter your full name.';
    } else if (form.customerName.trim().length < 2) {
      next.customerName = 'Name must be at least 2 characters.';
    }

    if (!form.customerEmail.trim()) {
      next.customerEmail = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) {
      next.customerEmail = 'Please enter a valid email address.';
    }

    const cleanPhone = form.customerPhone.replace(/[\s\-()]/g, '');
    if (!form.customerPhone.trim()) {
      next.customerPhone = 'Please enter your mobile phone number.';
    } else if (!/^((\+92)|(0092)|(0))?3[0-9]{9}$/.test(cleanPhone) && cleanPhone.length < 10) {
      next.customerPhone = 'Please enter a valid Pakistani mobile number (e.g. 0300 1234567).';
    }

    if (!form.province.trim()) {
      next.province = 'Please select your province.';
    }

    if (!form.city.trim()) {
      next.city = 'Please enter your city.';
    }

    if (!form.area.trim()) {
      next.area = 'Please enter your area, sector, or colony.';
    }

    if (!form.streetAddress.trim()) {
      next.streetAddress = 'Please enter your complete street address and house number.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) return;
    const whatsappUrl = buildCheckoutWhatsAppUrl({
      customer: form,
      items,
      subtotal: totals.subtotal,
      shippingFee: shippingFee ?? undefined,
    });
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (items.length === 0) return;
    if (!validate()) {
      notify({
        title: 'Missing information',
        description: 'Please fill in all required delivery details marked in red.',
        tone: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const fullShippingAddress = `${form.streetAddress.trim()}, ${form.area.trim()}, ${form.city.trim()}, ${form.province.trim()}`;

      const order = await orderService.place({
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        area: form.area.trim(),
        streetAddress: form.streetAddress.trim(),
        shippingAddress: fullShippingAddress,
        notes: form.notes.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        })),
      });

      // Clear cart and redirect to order confirmation
      clear();
      navigate(`/order/success/${order.orderNumber}`, { replace: true });
    } catch (error) {
      if (error instanceof ApiValidationError) {
        setErrors(error.fields);
        notify({
          title: 'Please check your details',
          description: error.message,
          tone: 'error',
        });
      } else {
        notify({
          title: 'Could not place order',
          description: error instanceof Error ? error.message : 'An error occurred. Please try again.',
          tone: 'error',
        });
      }
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <Section>
          <Container className="py-16">
            <div className="mx-auto max-w-lg text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream text-ink-muted">
                <Icon name="cart" size={28} />
              </div>
              <h1 className="mt-4 text-h2 font-serif text-ink">Your cart is empty</h1>
              <p className="mt-2 text-body text-ink-muted">
                Explore our handcrafted shoe collection and add items to your cart before checking out.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/shop">Browse Collection</ButtonLink>
                <ButtonLink href="/new-arrivals" variant="outline">
                  New Arrivals
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
        <Container className="py-8 md:py-12">
          {/* Progress / Title */}
          <div className="border-b border-border pb-6">
            <h1 className="text-h2 font-serif text-ink">Checkout</h1>
            <p className="mt-1 text-body-sm text-ink-muted">
              Fast Cash on Delivery across Pakistan. Pay securely when your parcel arrives.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* ── Form Details ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-8">
              {/* Customer Contact */}
              <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-border pb-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-deep text-caption font-semibold text-white">
                    1
                  </span>
                  <h2 className="text-h5 font-serif text-ink">Contact Information</h2>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <Input
                    label="Full Name"
                    name="customerName"
                    autoComplete="name"
                    required
                    placeholder="e.g. Fatima Ali / Muhammad Usman"
                    value={form.customerName}
                    onChange={(event) => set('customerName', event.target.value)}
                    error={errors.customerName}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Mobile Phone Number"
                      name="customerPhone"
                      type="tel"
                      autoComplete="tel"
                      required
                      placeholder="0300 1234567"
                      value={form.customerPhone}
                      onChange={(event) => set('customerPhone', event.target.value)}
                      error={errors.customerPhone}
                      hint="Required for courier delivery coordination & updates."
                    />
                    <Input
                      label="Email Address"
                      name="customerEmail"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="your.email@example.com"
                      value={form.customerEmail}
                      onChange={(event) => set('customerEmail', event.target.value)}
                      error={errors.customerEmail}
                      hint="Order confirmation and receipt will be sent here."
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-border pb-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-deep text-caption font-semibold text-white">
                    2
                  </span>
                  <h2 className="text-h5 font-serif text-ink">Delivery Address</h2>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Select
                      label="Province / Region"
                      name="province"
                      required
                      options={PAKISTAN_PROVINCES}
                      value={form.province}
                      onChange={(event) => set('province', event.target.value)}
                      error={errors.province}
                    />

                    <Input
                      label="City"
                      name="city"
                      autoComplete="address-level2"
                      required
                      placeholder="e.g. Lahore, Karachi, Islamabad"
                      value={form.city}
                      onChange={(event) => set('city', event.target.value)}
                      error={errors.city}
                    />
                  </div>

                  <Input
                    label="Area / Sector / Colony / Town"
                    name="area"
                    required
                    placeholder="e.g. DHA Phase 5 / Gulberg III / F-7/2 / PECHS"
                    value={form.area}
                    onChange={(event) => set('area', event.target.value)}
                    error={errors.area}
                    hint="Helps courier locate your neighborhood accurately."
                  />

                  <Textarea
                    label="Street Address / House No."
                    name="streetAddress"
                    rows={2}
                    autoComplete="street-address"
                    required
                    placeholder="House / Apartment #, Street #, Near Landmark"
                    value={form.streetAddress}
                    onChange={(event) => set('streetAddress', event.target.value)}
                    error={errors.streetAddress}
                  />

                  <Textarea
                    label="Order Notes / Delivery Instructions (Optional)"
                    name="notes"
                    rows={2}
                    placeholder="Any specific delivery instructions, gate code, or nearest landmark..."
                    value={form.notes}
                    onChange={(event) => set('notes', event.target.value)}
                  />
                </div>
              </div>

              {/* Payment Method — Cash on Delivery Only */}
              <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm">
                <div className="flex items-center gap-2.5 border-b border-border pb-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-deep text-caption font-semibold text-white">
                    3
                  </span>
                  <h2 className="text-h5 font-serif text-ink">Payment Method</h2>
                </div>

                <div className="mt-5">
                  <div className="flex items-start gap-4 rounded-lg border-2 border-primary-deep/60 bg-primary-deep/5 p-4.5">
                    <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-deep text-white">
                      <Icon name="check" size={14} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-body font-semibold text-ink">Cash on Delivery (COD)</span>
                        <span className="rounded bg-primary-deep/10 px-2 py-0.5 text-caption font-medium text-primary-deep">
                          Available Nationwide
                        </span>
                      </div>
                      <p className="mt-1 text-body-sm text-ink-muted">
                        Pay cash directly to the courier when your parcel is delivered to your doorstep. No prepayment or credit card required.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Order Summary ─────────────────────────────────────────── */}
            <aside className="lg:sticky lg:top-[calc(var(--header-height)+20px)] lg:self-start">
              <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm">
                <h2 className="text-h5 font-serif text-ink">Order Summary</h2>

                <ul className="mt-4 divide-y divide-border/60">
                  {items.map((item) => (
                    <li key={item.key} className="flex gap-3.5 py-3 first:pt-0 last:pb-0">
                      {item.image?.src ? (
                        <img
                          src={item.image.src}
                          alt={item.productName}
                          loading="lazy"
                          className="h-16 w-14 shrink-0 rounded-md bg-[#faf8f5] object-contain p-1 border border-border/60"
                        />
                      ) : (
                        <div className="h-16 w-14 shrink-0 rounded-md bg-[#faf8f5] border border-border/60" aria-hidden="true" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-medium text-ink line-clamp-1">{item.productName}</p>
                        <p className="mt-0.5 text-caption text-ink-muted">
                          {[item.size ? `Size: ${item.size}` : null, item.color ? `Color: ${item.color}` : null]
                            .filter(Boolean)
                            .join(' · ') || 'Standard'}
                        </p>
                        <p className="mt-0.5 text-caption text-ink-muted">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-body-sm font-semibold text-ink shrink-0">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>

                <Divider className="my-4" />

                <dl className="space-y-2">
                  <div className="flex items-center justify-between text-body-sm">
                    <dt className="text-ink-muted">Subtotal</dt>
                    <dd className="font-medium text-ink">{formatPrice(totals.subtotal)}</dd>
                  </div>
                  <div className="flex items-center justify-between text-body-sm">
                    <dt className="text-ink-muted">Delivery Charges</dt>
                    <dd className="font-medium text-ink">
                      {shippingFee === null ? (
                        <span className="text-ink-muted">Calculating...</span>
                      ) : shippingFee === 0 ? (
                        <span className="font-semibold text-success-deep">FREE</span>
                      ) : (
                        formatPrice(shippingFee)
                      )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <dt className="text-body font-semibold text-ink">Total Payable (COD)</dt>
                    <dd className="text-h4 font-serif font-bold text-primary-deep">
                      {formatPrice(grandTotal)}
                    </dd>
                  </div>
                </dl>

                {/* Trust guarantee badge */}
                <div className="mt-5 rounded-md bg-cream/80 p-3.5 text-caption text-ink-muted">
                  <div className="flex items-start gap-2.5">
                    <Icon name="truck" className="mt-0.5 shrink-0 text-primary-deep" size={16} />
                    <span>
                      <strong className="font-medium text-ink">Delivered safely via express courier.</strong> Inspect parcel upon arrival.
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  className="mt-5 text-body font-medium"
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting ? 'Placing Order…' : `Confirm Order — ${formatPrice(grandTotal)}`}
                </Button>

                <button
                  type="button"
                  onClick={handleWhatsAppCheckout}
                  disabled={submitting}
                  className="mt-2.5 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-sm border border-[#25D366]/50 bg-surface px-4 text-body font-medium text-ink shadow-2xs transition-all duration-base hover:border-[#25D366] hover:bg-[#25D366]/8 hover:text-[#128C7E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] active:scale-98"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-5 w-5 text-[#25D366]"
                    aria-hidden="true"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  Order via WhatsApp
                </button>

                <ButtonLink href="/cart" variant="ghost" fullWidth className="mt-2.5 text-caption">
                  ← Modify Cart Items
                </ButtonLink>
              </div>
            </aside>
          </form>
        </Container>
      </Section>
    </Layout>
  );
}

function createKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
