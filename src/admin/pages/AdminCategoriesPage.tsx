import { useEffect, useState, type FormEvent } from 'react';
import { slugify } from '@/data/repository';
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
import { categoryService, ServiceError, type CategoryInput } from '@/services';
import type { Category } from '@/types';
import { AdminLayout } from '../components/AdminLayout';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { useAdminCategories } from '../hooks/useAdminData';

interface FormState {
  name: string;
  slug: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  seoTitle: string;
  seoDescription: string;
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  description: '',
  imageSrc: '',
  imageAlt: '',
  seoTitle: '',
  seoDescription: '',
};

function toForm(category: Category): FormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    imageSrc: category.image?.src ?? '',
    imageAlt: category.image?.alt ?? '',
    seoTitle: category.seo?.title ?? '',
    seoDescription: category.seo?.description ?? '',
  };
}

export function AdminCategoriesPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const { notify } = useToast();
  const categories = useAdminCategories(search.trim() || undefined);

  useSeo({ title: 'Categories', path: '/admin/categories', noIndex: true });

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
      // Suggest a slug while creating; never rewrite an existing category's
      // slug from its name, since that would break live URLs.
      if (key === 'name' && creating) next.slug = slugify(String(value));
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!form.name.trim()) {
      setErrors({ name: 'Category name is required.' });
      return;
    }

    const input: CategoryInput = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim() || undefined,
      image: {
        src: form.imageSrc.trim(),
        alt: form.imageAlt.trim() || form.name.trim(),
      },
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
        await categoryService.update(editing.id, input);
        notify({ title: 'Category updated', description: input.name, tone: 'success' });
      } else {
        await categoryService.create(input);
        notify({ title: 'Category created', description: input.name, tone: 'success' });
      }
      close();
    } catch (cause) {
      notify({
        title: 'Could not save category',
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
      await categoryService.remove(pendingDelete.id);
      notify({ title: 'Category deleted', description: pendingDelete.name, tone: 'success' });
    } catch (cause) {
      // The most likely failure is the referential-integrity guard, whose
      // message names the number of products still using this category.
      notify({
        title: 'Could not delete category',
        description: cause instanceof ServiceError ? cause.message : 'Please try again.',
        tone: 'error',
      });
    }
  }

  const list = categories.data ?? [];

  return (
    <AdminLayout
      title="Categories"
      description="Group your products. You decide what categories exist."
      actions={
        <Button iconLeft={<Icon name="plus" size={17} />} onClick={() => setCreating(true)}>
          Add category
        </Button>
      }
    >
      <div className="mb-5 rounded-lg border border-border bg-surface p-4">
        <Input
          label="Search"
          placeholder="Search categories"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          iconLeft={<Icon name="search" size={17} />}
        />
      </div>

      {categories.loading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}

      {categories.error && !categories.loading && (
        <ErrorState title="Could not load categories" onRetry={categories.retry} />
      )}

      {!categories.loading && !categories.error && list.length === 0 && (
        <EmptyState
          icon="layers"
          title={search.trim() ? 'No categories match that search' : 'No categories yet'}
          description={
            search.trim()
              ? 'Try a different search term.'
              : 'Create your first category to organise your products.'
          }
          action={
            search.trim() ? (
              <Button variant="outline" onClick={() => setSearch('')}>
                Clear search
              </Button>
            ) : (
              <Button iconLeft={<Icon name="plus" size={17} />} onClick={() => setCreating(true)}>
                Add category
              </Button>
            )
          }
        />
      )}

      {!categories.loading && !categories.error && list.length > 0 && (
        <ul className="flex flex-col gap-3">
          {list.map((category) => (
            <li
              key={category.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-cream">
                {category.image?.src ? (
                  <img src={category.image.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-subtle">
                    <Icon name="image" size={18} />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-body-sm font-medium text-ink">{category.name}</p>
                <p className="text-caption text-ink-subtle">/{category.slug}</p>
                {category.description && (
                  <p className="mt-1 line-clamp-1 text-caption text-ink-muted">{category.description}</p>
                )}
              </div>

              <div className="flex shrink-0 gap-1">
                <IconButton
                  label={`Edit ${category.name}`}
                  icon={<Icon name="edit" size={17} />}
                  size="sm"
                  onClick={() => setEditing(category)}
                />
                <IconButton
                  label={`Delete ${category.name}`}
                  icon={<Icon name="trash" size={17} />}
                  size="sm"
                  onClick={() => setPendingDelete(category)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={close}
        title={editing ? 'Edit category' : 'Add category'}
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={saving}>
              Cancel
            </Button>
            <Button form="category-form" type="submit" loading={saving}>
              {editing ? 'Save changes' : 'Create category'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Name"
            required
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            error={errors.name}
            placeholder="Ladies Chappals"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(event) => set('slug', event.target.value)}
            hint="Used in the category URL."
          />
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
          <Input
            label="Image path"
            value={form.imageSrc}
            onChange={(event) => set('imageSrc', event.target.value)}
            placeholder="/images/categories/ladies-chappals.jpg"
          />
          <Input
            label="Image alt text"
            value={form.imageAlt}
            onChange={(event) => set('imageAlt', event.target.value)}
            hint="Describes the image for screen readers. Defaults to the category name."
          />
          <Input
            label="SEO title"
            value={form.seoTitle}
            onChange={(event) => set('seoTitle', event.target.value)}
            hint="Falls back to the category name."
          />
          <Textarea
            label="SEO description"
            rows={2}
            value={form.seoDescription}
            onChange={(event) => set('seoDescription', event.target.value)}
            hint="Falls back to the category description."
          />
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete this category?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed. Categories still used by products cannot be deleted.`
            : undefined
        }
      />
    </AdminLayout>
  );
}
