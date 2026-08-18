import { useEffect, useState, type FormEvent } from 'react';
import { Button, ErrorState, Input, Skeleton, Textarea, useToast } from '@/components/ui';
import { SITE_URL } from '@/lib/constants';
import { useSeo } from '@/hooks';
import { seoService, ServiceError } from '@/services';
import type { SeoSettings } from '@/types';
import { AdminLayout } from '../components/AdminLayout';
import { FormSection } from '../components/FormSection';
import { useAdminSeo } from '../hooks/useAdminData';

interface FormState {
  siteTitle: string;
  siteDescription: string;
  defaultImage: string;
  keywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

function toForm(settings: SeoSettings): FormState {
  return {
    siteTitle: settings.siteTitle,
    siteDescription: settings.siteDescription,
    defaultImage: settings.defaultImage,
    // Keywords are edited as one comma-separated line — simpler than chips for
    // a field that is rarely touched.
    keywords: settings.keywords.join(', '),
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
    ogImage: settings.ogImage,
    twitterTitle: settings.twitterTitle,
    twitterDescription: settings.twitterDescription,
    twitterImage: settings.twitterImage,
  };
}

/**
 * A rough approximation of a search result.
 *
 * Explicitly labelled as a preview: real engines rewrite titles, truncate at
 * pixel widths that vary by device, and often ignore the description entirely.
 * Showing this without that caveat would set false expectations.
 */
function SearchPreview({ title, description }: { title: string; description: string }) {
  const shownTitle = title.trim() || 'Your site title';
  const shownDescription = description.trim() || 'Your site description will appear here.';

  return (
    <div className="rounded-md border border-border bg-cream p-4">
      <p className="mb-3 text-caption text-ink-subtle">
        Approximate search result preview — engines may show something different.
      </p>
      <div className="rounded-md bg-surface p-4">
        <p className="truncate text-caption text-ink-muted">{SITE_URL.replace(/^https?:\/\//, '')}</p>
        <p className="mt-0.5 truncate text-body-lg text-primary-deep">{shownTitle}</p>
        <p className="mt-1 line-clamp-2 text-body-sm text-ink-muted">{shownDescription}</p>
      </div>
    </div>
  );
}

export function AdminSeoPage() {
  const settings = useAdminSeo();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({ title: 'SEO settings', path: '/admin/seo', noIndex: true });

  useEffect(() => {
    if (settings.data) setForm(toForm(settings.data));
  }, [settings.data]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setError(null);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form || saving) return;

    if (!form.siteTitle.trim()) {
      setError('A site title is required.');
      return;
    }

    setSaving(true);
    try {
      await seoService.update({
        siteTitle: form.siteTitle,
        siteDescription: form.siteDescription,
        defaultImage: form.defaultImage,
        keywords: form.keywords
          .split(',')
          .map((word) => word.trim())
          .filter(Boolean),
        ogTitle: form.ogTitle,
        ogDescription: form.ogDescription,
        ogImage: form.ogImage,
        twitterTitle: form.twitterTitle,
        twitterDescription: form.twitterDescription,
        twitterImage: form.twitterImage,
      });
      notify({ title: 'SEO settings saved', tone: 'success' });
    } catch (cause) {
      notify({
        title: 'Could not save SEO settings',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      title="SEO settings"
      description="Defaults used across the site when a page does not set its own."
    >
      {settings.loading && !form && <Skeleton className="h-96 w-full rounded-lg" />}

      {settings.error && !settings.loading && (
        <ErrorState title="Could not load SEO settings" onRetry={settings.retry} />
      )}

      {form && (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <FormSection title="Site defaults">
            <div className="flex flex-col gap-4">
              <Input
                label="Site title"
                required
                value={form.siteTitle}
                onChange={(e) => set('siteTitle', e.target.value)}
                error={error ?? undefined}
                hint="Appended to every page title, e.g. “Shop all — Shelina”."
              />
              <Textarea
                label="Site description"
                rows={3}
                value={form.siteDescription}
                onChange={(e) => set('siteDescription', e.target.value)}
                hint="Used when a page has no description of its own."
              />
              <Input
                label="Default share image"
                value={form.defaultImage}
                onChange={(e) => set('defaultImage', e.target.value)}
                placeholder="/images/hero/hero-main.jpg"
              />
              <Input
                label="Keywords"
                value={form.keywords}
                onChange={(e) => set('keywords', e.target.value)}
                hint="Comma separated. Most search engines ignore these, but some tools still read them."
              />

              <SearchPreview title={form.siteTitle} description={form.siteDescription} />
            </div>
          </FormSection>

          <FormSection
            title="Social sharing"
            description="Shown when someone shares a link. Leave a field empty to fall back to the site defaults above."
          >
            <div className="flex flex-col gap-4">
              <Input label="Open Graph title" value={form.ogTitle} onChange={(e) => set('ogTitle', e.target.value)} />
              <Textarea
                label="Open Graph description"
                rows={2}
                value={form.ogDescription}
                onChange={(e) => set('ogDescription', e.target.value)}
              />
              <Input label="Open Graph image" value={form.ogImage} onChange={(e) => set('ogImage', e.target.value)} />
            </div>
          </FormSection>

          <FormSection
            title="X / Twitter"
            description="Optional. Falls back to your Open Graph values when empty."
          >
            <div className="flex flex-col gap-4">
              <Input label="Title" value={form.twitterTitle} onChange={(e) => set('twitterTitle', e.target.value)} />
              <Textarea
                label="Description"
                rows={2}
                value={form.twitterDescription}
                onChange={(e) => set('twitterDescription', e.target.value)}
              />
              <Input label="Image" value={form.twitterImage} onChange={(e) => set('twitterImage', e.target.value)} />
            </div>
          </FormSection>

          <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
            <Button type="submit" loading={saving}>
              Save SEO settings
            </Button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
