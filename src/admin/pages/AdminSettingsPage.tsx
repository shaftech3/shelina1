import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Icon,
  Input,
  Spinner,
  Textarea,
  useToast,
} from '@/components/ui';
import { useSeo } from '@/hooks';
import { settingsService, type StoreSettingsData } from '@/services';
import { formatPrice } from '@/lib/format';
import { AdminLayout } from '../components/AdminLayout';
import { FormSection } from '../components/FormSection';

export function AdminSettingsPage() {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettingsData>({
    storeName: 'Shelina Footwear',
    defaultDeliveryFee: 250,
    freeShippingThreshold: 5000,
    codEnabled: true,
    contactPhone: '03247741080',
    contactEmail: 'shelinaoffical@gmail.com',
    whatsappNumber: '+923247741080',
    deliveryNote: 'Standard delivery takes 2–4 business days across Pakistan via courier with Cash on Delivery.',
  });

  useSeo({ title: 'Store & Delivery Settings', path: '/admin/settings', noIndex: true });

  useEffect(() => {
    let active = true;
    settingsService
      .getSettings()
      .then((data) => {
        if (active && data) {
          setSettings(data);
        }
      })
      .catch((err) => {
        notify({
          title: 'Could not load store settings',
          description: err instanceof Error ? err.message : 'Loading defaults',
          tone: 'error',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [notify]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    try {
      const updated = await settingsService.updateSettings({
        storeName: settings.storeName.trim(),
        defaultDeliveryFee: Number(settings.defaultDeliveryFee) || 0,
        freeShippingThreshold: Number(settings.freeShippingThreshold) || 0,
        codEnabled: Boolean(settings.codEnabled),
        contactPhone: settings.contactPhone.trim(),
        contactEmail: settings.contactEmail.trim(),
        whatsappNumber: settings.whatsappNumber.trim(),
        deliveryNote: settings.deliveryNote.trim(),
      });
      setSettings(updated);
      notify({
        title: 'Settings saved successfully',
        description: 'Delivery rates and store configurations have been updated in the database.',
        tone: 'success',
      });
    } catch (err) {
      notify({
        title: 'Failed to update settings',
        description: err instanceof Error ? err.message : 'Please check your connection and try again.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title="Store & Delivery Settings"
      description="Configure nationwide delivery charges, free shipping thresholds, Cash on Delivery options, and customer support channels."
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner />
          <p className="mt-3 text-body-sm text-ink-muted">Loading settings from database...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8 max-w-4xl">
          {/* Integrations Banner: Settings -> Integrations -> NEXORA */}
          <div className="rounded-editorial border border-border bg-surface p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-surface">
                <Icon name="link" size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-body-lg font-semibold text-ink">Integrations & API Connections</h2>
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-caption font-medium text-primary-deep">
                    NEXORA
                  </span>
                </div>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Connect to NEXORA via secure API keys to synchronize products, catalog, orders, and inventory.
                </p>
              </div>
            </div>

            <Link
              to="/admin/integrations/nexora"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-body-sm font-medium text-surface shadow-sm hover:bg-ink/90 transition-colors whitespace-nowrap"
            >
              <span>Manage NEXORA</span>
              <Icon name="chevron-right" size={16} />
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Delivery & Shipping Rates */}
          <FormSection
            title="Nationwide Shipping & Delivery Charges"
            description="Control the delivery charge calculated during checkout and applied to Cash on Delivery orders."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Standard Delivery Fee (PKR)"
                hint="Default flat delivery charge applied when subtotal is below the free threshold."
                type="number"
                min="0"
                step="10"
                value={settings.defaultDeliveryFee}
                onChange={(e) =>
                  setSettings({ ...settings, defaultDeliveryFee: Number(e.target.value) || 0 })
                }
                required
              />

              <Input
                label="Free Delivery Threshold (PKR)"
                hint="Orders with subtotal equal or above this amount receive FREE delivery (0 PKR)."
                type="number"
                min="0"
                step="100"
                value={settings.freeShippingThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, freeShippingThreshold: Number(e.target.value) || 0 })
                }
                required
              />
            </div>

            <div className="mt-4 rounded-editorial border border-border bg-cream/50 p-4 text-body-sm text-ink">
              <div className="flex items-center gap-2 font-medium text-primary-deep">
                <Icon name="truck" size={18} />
                <span>Current Customer Experience Preview</span>
              </div>
              <p className="mt-1 text-ink-muted text-caption">
                Under {formatPrice(settings.freeShippingThreshold)}, customers are charged{' '}
                <strong className="text-ink">{formatPrice(settings.defaultDeliveryFee)}</strong> delivery.{' '}
                Orders of {formatPrice(settings.freeShippingThreshold)} and above qualify for{' '}
                <strong className="text-success-deep font-semibold">Free Delivery</strong>.
              </p>
            </div>

            <div className="mt-4">
              <Textarea
                label="Delivery & Shipping Policy Notice"
                hint="Shown to customers during checkout and on product details."
                rows={3}
                value={settings.deliveryNote}
                onChange={(e) => setSettings({ ...settings, deliveryNote: e.target.value })}
              />
            </div>
          </FormSection>

          {/* Payment & Cash on Delivery */}
          <FormSection
            title="Payment & Order Methods"
            description="Manage Cash on Delivery (COD) availability across the storefront."
          >
            <div className="space-y-3">
              <Checkbox
                label="Enable Cash on Delivery (COD) Nationwide"
                hint="Allows customers to place orders without advance payment and pay upon arrival."
                checked={settings.codEnabled}
                onChange={(checked) => setSettings({ ...settings, codEnabled: checked })}
              />
            </div>
          </FormSection>

          {/* Customer Support Channels */}
          <FormSection
            title="Customer Support & WhatsApp Contact"
            description="Direct channels displayed on order confirmation, invoices, and customer assistance buttons."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Store Name"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                required
              />

              <Input
                label="WhatsApp Number (with country code)"
                hint="e.g. +923001234567 for direct 1-click WhatsApp chat."
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                required
              />

              <Input
                label="Support Phone Number"
                hint="Local display number, e.g. 0300 1234567"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                required
              />

              <Input
                label="Support Email"
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                required
              />
            </div>
          </FormSection>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-4 border-t border-border pt-6">
            <Button type="submit" loading={saving} size="lg" iconLeft={<Icon name="check" size={18} />}>
              {saving ? 'Saving Settings...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>
    )}
  </AdminLayout>
);
}
