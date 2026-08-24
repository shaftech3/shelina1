import { useEffect, useState, type FormEvent } from 'react';
import { slugify } from '@/data/repository';
import { normalizeMediaUrl } from '@/lib/media';
import {
  Button,
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
import { brandService, ServiceError, type BrandInput } from '@/services';
import type { Brand } from '@/types';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { MediaUploadInput } from '../components/MediaUploadInput';
import { useAdminBrands } from '../hooks/useAdminData';

interface FormState {
  name: string;
  slug: string;
  description: string;
  logoSrc: string;
  logoAlt: string;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  description: '',
  logoSrc: '',
  logoAlt: '',
  seoTitle: '',
  seoDescription: '',
};

function toForm(brand: Brand): FormState {
  return {
    name: brand.name,
    slug: brand.slug,
    description: brand.description ?? '',
    logoSrc: brand.logo?.src ?? '',
    logoAlt: brand.logo?.alt ?? '',
    seoTitle: brand.seo?.title ?? '',
    seoDescription: brand.seo?.description ?? '',
  };
}

export function AdminBrandsPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Brand | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null);

  const { notify } = useToast();
  const brands = useAdminBrands(search.trim() || undefined);

  useSeo({ title: 'Brands', path: '/admin/brands', noIndex: true });

  const open = creating || editing !== null;

  useEffect(() => {
    if (creating) setForm(EMPTY);
    else if (editing) setForm(toForm(editing));
    setErrors({});
  }, [creating, editing]);

  function close() {
    setCreating(false);
    setEditing(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'name' && creating) next.slug = slugify(String(value));
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!form.name.trim()) {
      setErrors({ name: 'Brand name is required.' });
      return;
    }

    const input: BrandInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim() || undefined,
      logo: form.logoSrc.trim()
        ? { src: form.logoSrc.trim(), alt: form.logoAlt.trim() || form.name.trim() }
        : undefined,
      seo:
        form.seoTitle.trim() || form.seoDescription.trim()
          ? {
              title: form.seoTitle.trim() || undefined,
              description: form.seoDescription.trim() || undefined,
            }
          : undefined,
    };

    setSaving(true);
    try {
      if (editing) {
        // A rename cascades to every product referencing the old name; the
        // service handles that atomically.
        await brandService.update(editing.id, input);
        notify({ title: 'Brand updated', description: input.name, tone: 'success' });
      } else {
        await brandService.create(input);
        notify({ title: 'Brand created', description: input.name, tone: 'success' });
      }
      close();
    } catch (cause) {
      notify({
        title: 'Could not save brand',
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
      await brandService.remove(pendingDelete.id);
      notify({ title: 'Brand deleted', description: pendingDelete.name, tone: 'success' });
    } catch (cause) {
      notify({
        title: 'Could not delete brand',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  const list = brands.data ?? [];

  return (
    <AdminLayout
      title="Brands"
      description="The brands your products belong to. You create these yourself."
      actions={
        <Button iconLeft={<Icon name="plus" size={17} />} onClick={() => setCreating(true)}>
          Add brand
        </Button>
      }
    >
      <div className="mb-5 rounded-lg border border-border bg-surface p-4">
        <Input
          label="Search"
          placeholder="Search brands"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          iconLeft={<Icon name="search" size={17} />}
        />
      </div>

      {brands.loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {brands.error && !brands.loading && <ErrorState title="Could not load brands" onRetry={brands.retry} />}

      {!brands.loading && !brands.error && list.length === 0 && (
        <EmptyState
          icon="tag"
          title={search.trim() ? 'No brands match that search' : 'No brands yet'}
          description={
            search.trim() ? 'Try a different search term.' : 'Create your first brand to assign to products.'
          }
          action={
            search.trim() ? (
              <Button variant="outline" onClick={() => setSearch('')}>
                Clear search
              </Button>
            ) : (
              <Button iconLeft={<Icon name="plus" size={17} />} onClick={() => setCreating(true)}>
                Add brand
              </Button>
            )
          }
        />
      )}

      {!brands.loading && !brands.error && list.length > 0 && (
        <ul className="flex flex-col gap-3">
          {list.map((brand) => (
            <li
              key={brand.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-cream">
                {brand.logo?.src ? (
                  <img
                    src={normalizeMediaUrl(brand.logo.src)}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-subtle">
                    <Icon name="tag" size={18} />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-ink">{brand.name}</p>
                <p className="text-caption text-ink-subtle">/{brand.slug}</p>
                {brand.description && (
                  <p className="mt-1 line-clamp-1 text-caption text-ink-muted">{brand.description}</p>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <IconButton
                  label={`Edit ${brand.name}`}
                  icon={<Icon name="edit" size={17} />}
                  size="sm"
                  onClick={() => setEditing(brand)}
                />
                <IconButton
                  label={`Delete ${brand.name}`}
                  icon={<Icon name="trash" size={17} />}
                  size="sm"
                  onClick={() => setPendingDelete(brand)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Edit brand' : 'Add brand'}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button form="brand-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create brand'}
            </Button>
          </>
        }
      >
        <form id="brand-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Brand name"
            required
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            error={errors.name}
            placeholder="Shelina Signature"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => set('slug', event.target.value)}
            hint="Used in brand URLs."
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
          <MediaUploadInput
            label="Brand Logo"
            mediaType="image"
            value={form.logoSrc}
            onChange={(url) => set('logoSrc', url)}
            onRemove={() => set('logoSrc', '')}
            hint="Upload brand logo (PNG, JPG, WebP, SVG)"
          />
          <Input
            label="Logo alt text"
            value={form.logoAlt}
            onChange={(event) => set('logoAlt', event.target.value)}
            hint="Defaults to the brand name."
          />
          <Input
            label="SEO title"
            value={form.seoTitle}
            onChange={(event) => set('seoTitle', event.target.value)}
            hint="Falls back to the brand name."
          />
          <Textarea
            label="SEO description"
            rows={2}
            value={form.seoDescription}
            onChange={(event) => set('seoDescription', event.target.value)}
          />
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this brand?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed. Brands still used by products cannot be deleted.`
            : undefined
        }
      />
    </AdminLayout>
  );
}
