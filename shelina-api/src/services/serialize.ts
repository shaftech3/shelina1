/**
 * Database row → API response mapping.
 *
 * The Stage 1–4 frontend already has settled types (`Product`, `Category`,
 * `Brand`, `HeroSlide`, `Banner`, `SeoSettings`). Stage 5 keeps those shapes
 * exactly, so the migration is a change of data SOURCE, not of data FORMAT —
 * no storefront or admin component had to be rewritten.
 */

interface MediaRow {
  type: string;
  url: string;
  alt: string | null;
  poster: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  shortDescription: string | null;
  description: string | null;
  price: number;
  salePrice: number | null;
  deliveryCharge?: number | null;
  stock: number;
  stockStatus: string;
  status: string;
  featured: boolean;
  newArrival: boolean;
  onSale: boolean;
  sizes: unknown;
  colors: unknown;
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string;
  brandId: string | null;
  brand?: { name: string } | null;
  media?: MediaRow[];
}

/** JSON columns come back as `unknown`; coerce defensively. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function serializeProduct(row: ProductRow) {
  const media = [...(row.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const images = media
    .filter((item) => item.type === 'image')
    .map((item) => ({
      src: item.url,
      alt: item.alt ?? '',
      ...(item.width ? { width: item.width } : {}),
      ...(item.height ? { height: item.height } : {}),
    }));
  const videoRow = media.find((item) => item.type === 'video');

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand?.name ?? undefined,
    brandId: row.brandId ?? undefined,
    categoryId: row.categoryId,
    price: row.price,
    salePrice: row.salePrice,
    deliveryCharge: row.deliveryCharge ?? 0,
    images,
    // Free-form, exactly as stored. No transformation of any kind.
    sizes: asArray<{ value: string; available: boolean }>(row.sizes),
    colors: asArray<{ name: string; swatch?: string; available: boolean }>(row.colors),
    stockStatus: row.stockStatus,
    stockCount: row.stock,
    featured: row.featured,
    isNew: row.newArrival,
    onSale: row.onSale,
    shortDescription: row.shortDescription ?? undefined,
    description: row.description ?? undefined,
    sku: row.sku ?? undefined,
    ...(videoRow
      ? {
          video: {
            src: videoRow.url,
            poster: videoRow.poster ?? undefined,
            title: videoRow.alt ?? '',
          },
        }
      : {}),
    status: row.status,
    tags: row.tags,
    ...(row.seoTitle || row.seoDescription
      ? {
          seo: {
            title: row.seoTitle ?? undefined,
            description: row.seoDescription ?? undefined,
          },
        }
      : {}),
  };
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  imageAlt: string | null;
  group: string | null;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  _count?: { products: number };
}

export function serializeCategory(row: CategoryRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    image: { src: row.image ?? '', alt: row.imageAlt ?? '' },
    group: row.group ?? undefined,
    featured: row.featured,
    ...(row._count ? { productCount: row._count.products } : {}),
    ...(row.seoTitle || row.seoDescription
      ? { seo: { title: row.seoTitle ?? undefined, description: row.seoDescription ?? undefined } }
      : {}),
  };
}

interface BrandRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  logoAlt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  _count?: { products: number };
}

export function serializeBrand(row: BrandRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    ...(row.logo ? { logo: { src: row.logo, alt: row.logoAlt ?? '' } } : {}),
    ...(row._count ? { productCount: row._count.products } : {}),
    ...(row.seoTitle || row.seoDescription
      ? { seo: { title: row.seoTitle ?? undefined, description: row.seoDescription ?? undefined } }
      : {}),
  };
}

interface BannerRow {
  id: string;
  title: string;
  description: string | null;
  eyebrow: string | null;
  image: string | null;
  imageAlt: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  variant: string;
  tone: string | null;
  mediaSide: string | null;
  active: boolean;
  sortOrder: number;
}

export function serializeBanner(row: BannerRow) {
  return {
    id: row.id,
    variant: row.variant,
    tone: row.tone ?? undefined,
    eyebrow: row.eyebrow ?? undefined,
    heading: row.title,
    description: row.description ?? undefined,
    ...(row.image ? { image: { src: row.image, alt: row.imageAlt ?? '' } } : {}),
    ...(row.ctaText && row.ctaLink ? { cta: { label: row.ctaText, href: row.ctaLink } } : {}),
    mediaSide: row.mediaSide ?? undefined,
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

interface HomepageRow {
  id: string;
  eyebrow: string | null;
  heading: string;
  subheading: string | null;
  badge: string | null;
  image: string | null;
  imageAlt: string | null;
  secondaryImage: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  secondaryCtaText: string | null;
  secondaryCtaLink: string | null;
  editorialEyebrow: string | null;
  editorialHeading: string | null;
  editorialDescription: string | null;
  editorialImage: string | null;
  editorialImageAlt: string | null;
  editorialCtaText: string | null;
  editorialCtaLink: string | null;
  banners?: BannerRow[];
}

export function serializeHomepage(row: HomepageRow) {
  return {
    hero: {
      id: row.id,
      eyebrow: row.eyebrow ?? undefined,
      heading: row.heading,
      subheading: row.subheading ?? undefined,
      badge: row.badge ?? undefined,
      image: { src: row.image ?? '', alt: row.imageAlt ?? '' },
      secondaryImage: row.secondaryImage ?? undefined,
      ...(row.ctaText && row.ctaLink ? { primaryCta: { label: row.ctaText, href: row.ctaLink } } : {}),
      ...(row.secondaryCtaText && row.secondaryCtaLink
        ? { secondaryCta: { label: row.secondaryCtaText, href: row.secondaryCtaLink } }
        : {}),
    },
    editorial: row.editorialHeading
      ? {
          id: 'editorial',
          eyebrow: row.editorialEyebrow ?? undefined,
          heading: row.editorialHeading,
          description: row.editorialDescription ?? undefined,
          image: { src: row.editorialImage ?? '', alt: row.editorialImageAlt ?? '' },
          ...(row.editorialCtaText && row.editorialCtaLink
            ? { cta: { label: row.editorialCtaText, href: row.editorialCtaLink } }
            : {}),
        }
      : null,
    banners: (row.banners ?? []).map(serializeBanner),
  };
}

interface SeoRow {
  siteTitle: string;
  siteDescription: string;
  defaultImage: string | null;
  keywords: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
}

export function serializeSeo(row: SeoRow) {
  return {
    siteTitle: row.siteTitle,
    siteDescription: row.siteDescription,
    defaultImage: row.defaultImage ?? '',
    keywords: row.keywords,
    ogTitle: row.ogTitle ?? '',
    ogDescription: row.ogDescription ?? '',
    ogImage: row.ogImage ?? '',
    twitterTitle: row.twitterTitle ?? '',
    twitterDescription: row.twitterDescription ?? '',
    twitterImage: row.twitterImage ?? '',
  };
}

/* ─────────────────────────── Orders (Stage 6) ─────────────────────────── */

interface OrderItemRow {
  id: string;
  productId: string | null;
  productName: string;
  sku: string | null;
  productImage: string | null;
  productSlug: string | null;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  customerId: string | null;
  status: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  province?: string | null;
  city: string;
  area?: string | null;
  streetAddress?: string | null;
  shippingAddress: string;
  notes: string | null;
  subtotal: number;
  shippingFee: number;
  grandTotal: number;
  createdAt: Date;
  updatedAt: Date;
  items?: OrderItemRow[];
  customer?: { id: string; email: string; name: string } | null;
}

/**
 * Order → API response.
 *
 * Every product-facing value here comes from the OrderItem SNAPSHOT columns,
 * never from a live Product join. That is what keeps a historical order (and
 * its invoice) truthful after the catalogue is edited.
 */
export function serializeOrder(row: OrderRow) {
  const items = (row.items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    productImage: item.productImage,
    productSlug: item.productSlug,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  }));

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    customerId: row.customerId ?? null,
    status: row.status,
    paymentStatus: row.paymentStatus,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    province: row.province ?? undefined,
    city: row.city,
    area: row.area ?? undefined,
    streetAddress: row.streetAddress ?? undefined,
    shippingAddress: row.shippingAddress,
    notes: row.notes,
    subtotal: row.subtotal,
    shippingFee: row.shippingFee,
    grandTotal: row.grandTotal,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface StoreSettingsRow {
  id: string;
  shippingFee: number;
  freeShippingThreshold: number;
  contactPhone: string | null;
  contactEmail: string | null;
  whatsappNumber: string | null;
  updatedAt: Date;
}

export function serializeSettings(row: StoreSettingsRow) {
  return {
    id: row.id,
    shippingFee: row.shippingFee,
    freeShippingThreshold: row.freeShippingThreshold,
    contactPhone: row.contactPhone ?? '+92 300 1234567',
    contactEmail: row.contactEmail ?? 'support@shelina.pk',
    whatsappNumber: row.whatsappNumber ?? '+923001234567',
    updatedAt: row.updatedAt.toISOString(),
  };
}

