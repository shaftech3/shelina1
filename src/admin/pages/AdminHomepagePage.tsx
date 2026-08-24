import { useEffect, useState, type FormEvent } from 'react';
import {
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  Input,
  Modal,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { useSeo } from '@/hooks';
import { homepageService, ServiceError, type BannerInput } from '@/services';
import type { Banner, EditorialFeature, HeroSlide } from '@/types';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { FormSection } from '../components/FormSection';
import { MediaUploadInput } from '../components/MediaUploadInput';
import { useAdminHomepage } from '../hooks/useAdminData';

/* ---------------------------------------------------------------- Hero --- */

function HeroEditor({ slide }: { slide: HeroSlide }) {
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    eyebrow: slide.eyebrow ?? '',
    heading: slide.heading,
    subheading: slide.subheading ?? '',
    badge: slide.badge ?? '',
    imageSrc: slide.image.src,
    imageAlt: slide.image.alt,
    primaryLabel: slide.primaryCta?.label ?? '',
    primaryHref: slide.primaryCta?.href ?? '',
    secondaryLabel: slide.secondaryCta?.label ?? '',
    secondaryHref: slide.secondaryCta?.href ?? '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      eyebrow: slide.eyebrow ?? '',
      heading: slide.heading,
      subheading: slide.subheading ?? '',
      badge: slide.badge ?? '',
      imageSrc: slide.image.src,
      imageAlt: slide.image.alt,
      primaryLabel: slide.primaryCta?.label ?? '',
      primaryHref: slide.primaryCta?.href ?? '',
      secondaryLabel: slide.secondaryCta?.label ?? '',
      secondaryHref: slide.secondaryCta?.href ?? '',
    });
  }, [slide]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!form.heading.trim()) {
      setError('A hero heading is required.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await homepageService.updateHero(slide.id, {
        eyebrow: form.eyebrow,
        heading: form.heading,
        subheading: form.subheading,
        badge: form.badge,
        image: { src: form.imageSrc, alt: form.imageAlt },
        primaryCta: { label: form.primaryLabel, href: form.primaryHref },
        secondaryCta: { label: form.secondaryLabel, href: form.secondaryHref },
      });
      notify({ title: 'Hero updated', tone: 'success' });
    } catch (cause) {
      notify({
        title: 'Could not update hero',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormSection
        title="Hero section"
        description="The large banner at the top of the homepage. The layout stays the same — only the content changes."
      >
        <div className="flex flex-col gap-4">
          <Input label="Eyebrow" value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} hint="Small line above the heading." />
          <Input
            label="Heading"
            required
            value={form.heading}
            onChange={(e) => set('heading', e.target.value)}
            error={error ?? undefined}
          />
          <Textarea label="Subheading" rows={2} value={form.subheading} onChange={(e) => set('subheading', e.target.value)} />
          <Input label="Badge" value={form.badge} onChange={(e) => set('badge', e.target.value)} hint="Optional pill, e.g. “New season”." />

          <div className="flex flex-col gap-3">
            <MediaUploadInput
              label="Hero Image"
              mediaType="image"
              value={form.imageSrc}
              onChange={(url) => set('imageSrc', url)}
              onRemove={() => set('imageSrc', '')}
              hint="Upload high-resolution hero showcase image (JPG, PNG, WebP)"
            />
            <Input
              label="Hero image alt text"
              value={form.imageAlt}
              onChange={(e) => set('imageAlt', e.target.value)}
              hint="Describes the image for screen readers."
            />
          </div>

          <fieldset className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
            <legend className="px-1.5 text-label font-medium text-ink">Primary button</legend>
            <Input label="Label" value={form.primaryLabel} onChange={(e) => set('primaryLabel', e.target.value)} />
            <Input label="Link" value={form.primaryHref} onChange={(e) => set('primaryHref', e.target.value)} placeholder="/shop" />
          </fieldset>

          <fieldset className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
            <legend className="px-1.5 text-label font-medium text-ink">Secondary button</legend>
            <Input label="Label" value={form.secondaryLabel} onChange={(e) => set('secondaryLabel', e.target.value)} />
            <Input label="Link" value={form.secondaryHref} onChange={(e) => set('secondaryHref', e.target.value)} placeholder="/shop" />
          </fieldset>

          <p className="text-caption text-ink-subtle">
            Leave a button’s label and link empty to hide that button.
          </p>

          <div>
            <Button type="submit" loading={saving}>
              Save hero
            </Button>
          </div>
        </div>
      </FormSection>
    </form>
  );
}

/* ----------------------------------------------------------- Editorial --- */

function EditorialEditor({ editorial }: { editorial: EditorialFeature }) {
  const { notify } = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    eyebrow: editorial.eyebrow ?? '',
    heading: editorial.heading,
    description: editorial.description ?? '',
    imageSrc: editorial.image.src,
    imageAlt: editorial.image.alt,
    ctaLabel: editorial.cta?.label ?? '',
    ctaHref: editorial.cta?.href ?? '',
  });

  useEffect(() => {
    setForm({
      eyebrow: editorial.eyebrow ?? '',
      heading: editorial.heading,
      description: editorial.description ?? '',
      imageSrc: editorial.image.src,
      imageAlt: editorial.image.alt,
      ctaLabel: editorial.cta?.label ?? '',
      ctaHref: editorial.cta?.href ?? '',
    });
  }, [editorial]);

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!form.heading.trim()) {
      setError('A heading is required.');
      return;
    }
    setSaving(true);
    try {
      await homepageService.updateEditorial({
        eyebrow: form.eyebrow,
        heading: form.heading,
        description: form.description,
        image: { src: form.imageSrc, alt: form.imageAlt },
        cta: { label: form.ctaLabel, href: form.ctaHref },
      });
      notify({ title: 'Promotional section updated', tone: 'success' });
    } catch (cause) {
      notify({
        title: 'Could not update section',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormSection
        title="Promotional section"
        description="The editorial block further down the homepage."
      >
        <div className="flex flex-col gap-4">
          <Input label="Eyebrow" value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
          <Input
            label="Heading"
            required
            value={form.heading}
            onChange={(e) => set('heading', e.target.value)}
            error={error ?? undefined}
          />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          <div className="flex flex-col gap-3">
            <MediaUploadInput
              label="Promotional Section Image"
              mediaType="image"
              value={form.imageSrc}
              onChange={(url) => set('imageSrc', url)}
              onRemove={() => set('imageSrc', '')}
              hint="Upload editorial block image (JPG, PNG, WebP)"
            />
            <Input label="Image alt text" value={form.imageAlt} onChange={(e) => set('imageAlt', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Button label" value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} />
            <Input label="Button link" value={form.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} />
          </div>
          <div>
            <Button type="submit" loading={saving}>
              Save section
            </Button>
          </div>
        </div>
      </FormSection>
    </form>
  );
}

/* ------------------------------------------------------------- Banners --- */

interface BannerFormState {
  heading: string;
  eyebrow: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
  active: boolean;
}

const EMPTY_BANNER: BannerFormState = {
  heading: '',
  eyebrow: '',
  description: '',
  imageSrc: '',
  imageAlt: '',
  ctaLabel: '',
  ctaHref: '',
  active: true,
};

function BannersEditor({ banners }: { banners: Banner[] }) {
  const { notify } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerFormState>(EMPTY_BANNER);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** Banner id whose Active toggle is mid-save; blocks a double submit. */
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const open = creating || editing !== null;

  useEffect(() => {
    if (creating) setForm(EMPTY_BANNER);
    else if (editing) {
      setForm({
        heading: editing.heading,
        eyebrow: editing.eyebrow ?? '',
        description: editing.description ?? '',
        imageSrc: editing.image?.src ?? '',
        imageAlt: editing.image?.alt ?? '',
        ctaLabel: editing.cta?.label ?? '',
        ctaHref: editing.cta?.href ?? '',
        active: editing.active !== false,
      });
    }
    setError(null);
  }, [creating, editing]);

  function close() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!form.heading.trim()) {
      setError('A banner heading is required.');
      return;
    }

    const input: BannerInput = {
      heading: form.heading,
      eyebrow: form.eyebrow,
      description: form.description,
      image: form.imageSrc.trim() ? { src: form.imageSrc, alt: form.imageAlt } : undefined,
      cta: { label: form.ctaLabel, href: form.ctaHref },
      active: form.active,
    };

    setSaving(true);
    try {
      if (editing) {
        await homepageService.updateBanner(editing.id, input);
        notify({ title: 'Banner updated', tone: 'success' });
      } else {
        await homepageService.createBanner(input);
        notify({ title: 'Banner created', tone: 'success' });
      }
      close();
    } catch (cause) {
      notify({
        title: 'Could not save banner',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    try {
      await homepageService.removeBanner(pendingDelete.id);
      notify({ title: 'Banner deleted', tone: 'success' });
    } catch (cause) {
      notify({
        title: 'Could not delete banner',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  /** Inline visibility toggle — the most common banner edit by far. */
  async function toggleActive(banner: Banner) {
    setTogglingId(banner.id);
    try {
      await homepageService.updateBanner(banner.id, {
        heading: banner.heading,
        eyebrow: banner.eyebrow,
        description: banner.description,
        image: banner.image ? { src: banner.image.src, alt: banner.image.alt } : undefined,
        cta: banner.cta,
        active: banner.active === false,
      });
    } catch {
      notify({ title: 'Could not update banner', tone: 'error' });
    } finally {
      setTogglingId(null);
    }
  }

  const set = <K extends keyof BannerFormState>(key: K, value: BannerFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  return (
    <FormSection
      title="Banners"
      description="Promotional bands on the homepage. The first two active banners are shown."
    >
      <div className="flex flex-col gap-4">
        {banners.length === 0 ? (
          <EmptyState
            icon="image"
            title="No banners yet"
            description="Add a banner to promote a collection or a story."
            action={
              <Button iconLeft={<Icon name="plus" size={17} />} onClick={() => setCreating(true)}>
                Add banner
              </Button>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {banners.map((banner, index) => (
                <li
                  key={banner.id}
                  className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center"
                >
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-cream">
                    {banner.image?.src ? (
                      <img src={banner.image.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-subtle">
                        <Icon name="image" size={16} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm font-medium text-ink">{banner.heading}</p>
                    <p className="text-caption text-ink-subtle">
                      {banner.active === false ? 'Hidden' : index < 2 ? 'Shown on homepage' : 'Active — not in a slot'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Checkbox
                      label="Active"
                      checked={banner.active !== false}
                      disabled={togglingId === banner.id}
                      onChange={() => void toggleActive(banner)}
                    />
                    <IconButton
                      label={`Edit ${banner.heading}`}
                      icon={<Icon name="edit" size={17} />}
                      size="sm"
                      onClick={() => setEditing(banner)}
                    />
                    <IconButton
                      label={`Delete ${banner.heading}`}
                      icon={<Icon name="trash" size={17} />}
                      size="sm"
                      onClick={() => setPendingDelete(banner)}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <div>
              <Button variant="outline" iconLeft={<Icon name="plus" size={17} />} onClick={() => setCreating(true)}>
                Add banner
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Edit banner' : 'Add banner'}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button form="banner-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create banner'}
            </Button>
          </>
        }
      >
        <form id="banner-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input label="Eyebrow" value={form.eyebrow} onChange={(e) => set('eyebrow', e.target.value)} />
          <Input
            label="Heading"
            required
            value={form.heading}
            onChange={(e) => set('heading', e.target.value)}
            error={error ?? undefined}
          />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          <MediaUploadInput
            label="Banner Image"
            mediaType="image"
            value={form.imageSrc}
            onChange={(url) => set('imageSrc', url)}
            onRemove={() => set('imageSrc', '')}
            hint="Upload promotional banner graphic"
          />
          <Input
            label="Image alt text"
            value={form.imageAlt}
            onChange={(e) => set('imageAlt', e.target.value)}
            hint="Describes the image for screen readers."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Button label" value={form.ctaLabel} onChange={(e) => set('ctaLabel', e.target.value)} />
            <Input label="Button link" value={form.ctaHref} onChange={(e) => set('ctaHref', e.target.value)} />
          </div>
          <Checkbox
            label="Active"
            checked={form.active}
            onChange={(e) => set('active', e.target.checked)}
            hint="Inactive banners are hidden from the homepage."
          />
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this banner?"
        description={pendingDelete ? `“${pendingDelete.heading}” will be removed from the homepage.` : undefined}
      />
    </FormSection>
  );
}

/* ---------------------------------------------------------------- Page --- */

export function AdminHomepagePage() {
  const homepage = useAdminHomepage();
  useSeo({ title: 'Homepage', path: '/admin/homepage', noIndex: true });

  const hero = homepage.data?.hero[0];

  return (
    <AdminLayout title="Homepage" description="Edit the content shown on your storefront homepage.">
      {homepage.loading && <Skeleton className="h-96 w-full rounded-lg" />}

      {homepage.error && !homepage.loading && (
        <ErrorState title="Could not load homepage content" onRetry={homepage.retry} />
      )}

      {!homepage.loading && !homepage.error && homepage.data && (
        <div className="flex flex-col gap-5">
          {hero && <HeroEditor slide={hero} />}
          <BannersEditor banners={homepage.data.banners} />
          <EditorialEditor editorial={homepage.data.editorial} />
        </div>
      )}
    </AdminLayout>
  );
}
