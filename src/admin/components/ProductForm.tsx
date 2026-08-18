import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { slugify } from '@/data/repository';
import { Button, ButtonLink, Checkbox, Icon, Input, Select, Textarea } from '@/components/ui';
import { mediaService, type ProductInput } from '@/services';
import type { Brand, Category, Product, ProductStatus, StockStatus } from '@/types';
import { ChipListInput } from './ChipListInput';
import { FormSection } from './FormSection';
import { ImageListInput } from './ImageListInput';

interface ProductFormProps {
  /** Undefined when creating. */
  product?: Product;
  categories: Category[];
  brands: Brand[];
  onSubmit: (input: ProductInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  submitLabel: string;
}

/** Mirrors the form controls, not the stored Product — numbers stay strings. */
interface FormState {
  name: string;
  slug: string;
  sku: string;
  brand: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  price: string;
  salePrice: string;
  stockCount: string;
  stockStatus: StockStatus;
  status: ProductStatus;
  featured: boolean;
  isNew: boolean;
  sizes: string[];
  colors: string[];
  images: { src: string; alt: string; width?: number; height?: number }[];
  videoSrc: string;
  videoPoster: string;
  videoTitle: string;
  seoTitle: string;
  seoDescription: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

const STOCK_OPTIONS = [
  { value: 'in-stock', label: 'In stock' },
  { value: 'low-stock', label: 'Low stock' },
  { value: 'out-of-stock', label: 'Out of stock' },
  { value: 'pre-order', label: 'Pre-order' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active — visible in the shop' },
  { value: 'draft', label: 'Draft — hidden from the shop' },
  { value: 'archived', label: 'Archived — hidden from the shop' },
];

function toFormState(product?: Product): FormState {
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    sku: product?.sku ?? '',
    brand: product?.brand ?? '',
    categoryId: product?.categoryId ?? '',
    shortDescription: product?.shortDescription ?? '',
    description: product?.description ?? '',
    price: product ? String(product.price) : '',
    salePrice: product?.salePrice ? String(product.salePrice) : '',
    stockCount: product?.stockCount != null ? String(product.stockCount) : '',
    stockStatus: product?.stockStatus ?? 'in-stock',
    status: product?.status ?? 'active',
    featured: product?.featured ?? false,
    isNew: product?.isNew ?? false,
    // Stored variants are objects; the editor works in plain strings and the
    // availability flag is preserved on save for values that already existed.
    sizes: product?.sizes.map((size) => size.value) ?? [],
    colors: product?.colors.map((color) => color.name) ?? [],
    images: product?.images.map((image) => ({ ...image })) ?? [],
    videoSrc: product?.video?.src ?? '',
    videoPoster: product?.video?.poster ?? '',
    videoTitle: product?.video?.title ?? '',
    seoTitle: product?.seo?.title ?? '',
    seoDescription: product?.seo?.description ?? '',
  };
}

export function ProductForm({
  product,
  categories,
  brands,
  onSubmit,
  onDirtyChange,
  submitLabel,
}: ProductFormProps) {
  const initial = useMemo(() => toFormState(product), [product]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  /**
   * Whether the admin has hand-edited the slug. Once true, the name no longer
   * overwrites it (§31) — silently rewriting a deliberate slug would break
   * links the owner may already have shared.
   */
  const slugTouched = useRef(Boolean(product?.slug));

  useEffect(() => {
    setForm(initial);
    slugTouched.current = Boolean(product?.slug);
  }, [initial, product?.slug]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      // Auto-suggest the slug from the name until the admin takes it over.
      if (key === 'name' && !slugTouched.current) {
        next.slug = slugify(String(value));
      }
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    const price = Number(form.price);
    const salePrice = form.salePrice.trim() ? Number(form.salePrice) : null;
    const stock = form.stockCount.trim() ? Number(form.stockCount) : null;

    if (!form.name.trim()) next.name = 'Product name is required.';
    if (!form.price.trim()) next.price = 'Price is required.';
    else if (!Number.isFinite(price) || price <= 0) next.price = 'Enter a price greater than zero.';

    if (!form.categoryId) next.categoryId = 'Choose a category.';
    if (!form.brand) next.brand = 'Choose a brand.';

    if (salePrice !== null) {
      if (!Number.isFinite(salePrice) || salePrice <= 0) {
        next.salePrice = 'Enter a sale price greater than zero, or leave it empty.';
      } else if (Number.isFinite(price) && salePrice >= price) {
        next.salePrice = 'Sale price must be lower than the regular price.';
      }
    }

    if (stock !== null && (!Number.isFinite(stock) || stock < 0)) {
      next.stockCount = 'Stock cannot be negative.';
    }

    // A video needs a source to exist at all; a source without a description
    // is an accessibility gap. Neither is required — but half of one is wrong.
    if (form.videoTitle.trim() && !form.videoSrc.trim()) {
      next.videoSrc = 'Add a video URL, or clear the video description.';
    }
    if (form.videoSrc.trim() && !form.videoTitle.trim()) {
      next.videoTitle = 'Describe the video for screen readers.';
    }

    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Move the admin to the summary rather than leaving them to hunt for
      // the offending field in a long form.
      errorSummaryRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const previousSizes = product?.sizes ?? [];
      const previousColors = product?.colors ?? [];

      await onSubmit({
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        sku: form.sku.trim() || undefined,
        brand: form.brand || undefined,
        categoryId: form.categoryId,
        shortDescription: form.shortDescription.trim() || undefined,
        description: form.description.trim() || undefined,
        price: Number(form.price),
        salePrice: form.salePrice.trim() ? Number(form.salePrice) : null,
        stockCount: form.stockCount.trim() ? Number(form.stockCount) : undefined,
        stockStatus: form.stockStatus,
        status: form.status,
        featured: form.featured,
        isNew: form.isNew,
        // Values are stored EXACTLY as typed. The availability flag of an
        // existing value is preserved; new values default to available.
        sizes: form.sizes.map((value) => ({
          value,
          available: previousSizes.find((size) => size.value === value)?.available ?? true,
        })),
        colors: form.colors.map((name) => {
          const existing = previousColors.find((color) => color.name === name);
          return {
            name,
            // Swatches are never inferred from the colour NAME — that would be
            // a global colour dictionary by another route. Only a swatch the
            // data already carried is kept.
            swatch: existing?.swatch,
            available: existing?.available ?? true,
            image: existing?.image,
          };
        }),
        images: form.images,
        video: form.videoSrc.trim()
          ? {
              src: form.videoSrc.trim(),
              poster: form.videoPoster.trim() || undefined,
              title: form.videoTitle.trim(),
            }
          : undefined,
        seo:
          form.seoTitle.trim() || form.seoDescription.trim()
            ? { title: form.seoTitle.trim() || undefined, description: form.seoDescription.trim() || undefined }
            : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const errorList = Object.entries(errors).filter(([, message]) => Boolean(message));

  const categoryOptions = categories.map((category) => ({ value: category.id, label: category.name }));
  const brandOptions = brands.map((brand) => ({ value: brand.name, label: brand.name }));

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {errorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-error/40 bg-error/8 p-4 outline-none"
        >
          <p className="flex items-center gap-2 text-body-sm font-medium text-ink">
            <Icon name="alert" size={17} className="text-error" />
            Please fix {errorList.length} {errorList.length === 1 ? 'field' : 'fields'} before saving
          </p>
          <ul className="mt-2 list-disc pl-9 text-body-sm text-ink-muted">
            {errorList.map(([key, message]) => (
              <li key={key}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <FormSection title="Product information">
        <div className="flex flex-col gap-4">
          <Input
            label="Product name"
            required
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            error={errors.name}
            placeholder="Classic Leather Chappal"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Slug"
              value={form.slug}
              onChange={(event) => {
                slugTouched.current = true;
                set('slug', event.target.value);
              }}
              hint="Used in the product URL. Suggested from the name — edit if you need to."
              placeholder="classic-leather-chappal"
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(event) => set('sku', event.target.value)}
              hint="Optional stock reference."
              placeholder="SHE-CLC-001"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              required
              options={categoryOptions}
              placeholder={categoryOptions.length ? 'Select a category' : 'No categories yet'}
              value={form.categoryId}
              onChange={(event) => set('categoryId', event.target.value)}
              error={errors.categoryId}
              disabled={categoryOptions.length === 0}
            />
            <Select
              label="Brand"
              required
              options={brandOptions}
              placeholder={brandOptions.length ? 'Select a brand' : 'No brands yet'}
              value={form.brand}
              onChange={(event) => set('brand', event.target.value)}
              error={errors.brand}
              disabled={brandOptions.length === 0}
            />
          </div>

          <Input
            label="Short description"
            value={form.shortDescription}
            onChange={(event) => set('shortDescription', event.target.value)}
            hint="One line shown on product cards and near the top of the product page."
          />

          <Textarea
            label="Full description"
            rows={6}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </div>
      </FormSection>

      <FormSection title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Price"
            required
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.price}
            onChange={(event) => set('price', event.target.value)}
            error={errors.price}
          />
          <Input
            label="Sale price"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.salePrice}
            onChange={(event) => set('salePrice', event.target.value)}
            error={errors.salePrice}
            hint="Leave empty if this product is not on sale."
          />
        </div>
      </FormSection>

      <FormSection title="Inventory">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Stock quantity"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.stockCount}
            onChange={(event) => set('stockCount', event.target.value)}
            error={errors.stockCount}
            hint="Optional. Caps the quantity a customer can add."
          />
          <Select
            label="Stock status"
            options={STOCK_OPTIONS}
            value={form.stockStatus}
            onChange={(event) => set('stockStatus', event.target.value as StockStatus)}
          />
        </div>
      </FormSection>

      <FormSection
        title="Variants"
        description="Type the sizes and colours this product actually comes in. There is no preset list — enter anything, exactly as you want it shown."
      >
        <div className="flex flex-col gap-6">
          <ChipListInput
            label="Available sizes"
            values={form.sizes}
            onChange={(values) => set('sizes', values)}
            placeholder="Enter size"
            hint='Anything you like — "38", "UK 7", "EU 40", "Free Size". Press Enter or click Add.'
            emptyLabel="No sizes added. Customers will not be asked to choose a size."
          />

          <ChipListInput
            label="Available colours"
            values={form.colors}
            onChange={(values) => set('colors', values)}
            placeholder="Enter colour"
            hint='Stored exactly as typed — "Coffee", "Dark Brown", "Navy Blue". Press Enter or click Add.'
            emptyLabel="No colours added. Customers will not be asked to choose a colour."
          />
        </div>
      </FormSection>

      <FormSection title="Media" description="The first image is used as the main product image.">
        <div className="flex flex-col gap-6">
          <ImageListInput images={form.images} onChange={(images) => set('images', images)} />

          <div className="border-t border-border pt-5">
            <h3 className="text-label font-medium text-ink">Product video</h3>
            <p className="mt-1 text-caption text-ink-muted">
              Optional. Leave empty and no video player is shown for this product.
            </p>
            <div className="mt-3 flex flex-col gap-4">
              <Input
                label="Video URL"
                value={form.videoSrc}
                onChange={(event) => set('videoSrc', event.target.value)}
                error={errors.videoSrc}
                placeholder="/videos/my-product.mp4"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Poster image"
                  value={form.videoPoster}
                  onChange={(event) => set('videoPoster', event.target.value)}
                  hint="Shown before the video plays."
                  placeholder="/videos/my-product-poster.jpg"
                />
                <Input
                  label="Video description"
                  value={form.videoTitle}
                  onChange={(event) => set('videoTitle', event.target.value)}
                  error={errors.videoTitle}
                  hint="Describes the footage for screen readers."
                />
              </div>
              <p className="text-caption text-ink-subtle">
                Accepted formats: {mediaService.acceptedVideoTypes.join(', ')}.
              </p>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="SEO"
        description="Leave these empty to use the product name and description automatically."
      >
        <div className="flex flex-col gap-4">
          <Input
            label="SEO title"
            value={form.seoTitle}
            onChange={(event) => set('seoTitle', event.target.value)}
            hint="Falls back to the product name."
          />
          <Textarea
            label="SEO description"
            rows={3}
            value={form.seoDescription}
            onChange={(event) => set('seoDescription', event.target.value)}
            hint="Falls back to the short description."
          />
        </div>
      </FormSection>

      <FormSection title="Visibility">
        <div className="flex flex-col gap-4">
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={form.status}
            onChange={(event) => set('status', event.target.value as ProductStatus)}
            hint="Only active products appear in the shop."
          />
          <div className="flex flex-col gap-3">
            <Checkbox
              label="Featured"
              checked={form.featured}
              onChange={(event) => set('featured', event.target.checked)}
              hint="Featured products appear on the homepage."
            />
            <Checkbox
              label="New arrival"
              checked={form.isNew}
              onChange={(event) => set('isNew', event.target.checked)}
            />
          </div>
          <p className="text-caption text-ink-subtle">
            A product is “on sale” automatically whenever it has a sale price lower than its regular price.
          </p>
        </div>
      </FormSection>

      <div
        className={cn(
          'sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 px-4 py-4',
          'backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:-mx-6 sm:px-6',
        )}
      >
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        <ButtonLink href="/admin/products" variant="ghost">
          Cancel
        </ButtonLink>

        {product && (
          <Link
            to={`/product/${product.slug}`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-body-sm text-primary-deep hover:underline focus-visible:outline-none focus-visible:shadow-focus"
          >
            View product
            <Icon name="external" size={15} />
          </Link>
        )}
      </div>
    </form>
  );
}
