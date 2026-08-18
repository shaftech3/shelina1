import { effectivePrice } from '@/lib/format';
import type { Product, ProductStatus, StockStatus } from '@/types';
import { api, toQuery } from './apiClient';
import { ServiceError } from './http';
import { repository } from '@/data/repository';

/**
 * Product reads and writes, now backed by the Stage 5 REST API + PostgreSQL.
 *
 * The exported surface is IDENTICAL to the mock implementation it replaced —
 * `list`, `getBySlug`, `related`, `listAll`, `getById`, `create`, `update`,
 * `remove`, `stats`, `priceRange`. No page, component or hook changed: only
 * the data source did.
 */

export type ProductSort = 'featured' | 'newest' | 'price-low' | 'price-high' | 'name-asc';

export interface ProductQuery {
  categoryId?: string;
  categorySlugs?: string[];
  brands?: string[];
  featured?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: StockStatus[];
  inStockOnly?: boolean;
  sort?: ProductSort;
  limit?: number;
}

export interface AdminProductQuery {
  search?: string;
  categoryId?: string;
  brand?: string;
  status?: ProductStatus;
}

export type ProductInput = Omit<Product, 'id'>;

/**
 * Frontend product shape → API payload.
 *
 * Sizes and colours are passed through EXACTLY as the admin typed them. There
 * is no dictionary, no normalisation and no validation of their values here or
 * on the server — only a non-empty check.
 */
/**
 * The admin form works in brand NAMES (that is what the select shows and what
 * the Stage 3 `Product` type carries). The database relates products to brands
 * by id, so resolve the name to an id here rather than changing the form.
 */
async function resolveBrandId(input: ProductInput & { brandId?: string }): Promise<string> {
  if (input.brandId) return input.brandId;

  const name = input.brand?.trim();
  if (!name) {
    throw new ServiceError('Choose a brand for this product.', 400);
  }

  const brands = await api.get<Array<{ id: string; name: string }>>('/brands');
  const match = brands.find((brand) => brand.name.toLowerCase() === name.toLowerCase());
  if (!match) {
    throw new ServiceError(`Unknown brand: ${name}`, 400);
  }
  return match.id;
}

function toApiPayload(input: ProductInput & { brandId?: string }) {
  const salePrice =
    typeof input.salePrice === 'number' && input.salePrice > 0 ? input.salePrice : null;

  const media: Array<Record<string, unknown>> = input.images
    .filter((image) => image.src.trim().length > 0)
    .map((image) => ({
      type: 'image',
      url: image.src,
      alt: image.alt ?? '',
      width: image.width ?? null,
      height: image.height ?? null,
    }));

  if (input.video?.src) {
    media.push({
      type: 'video',
      url: input.video.src,
      alt: input.video.title ?? '',
      poster: input.video.poster ?? null,
    });
  }

  return {
    name: input.name.trim(),
    slug: input.slug?.trim() || undefined,
    sku: input.sku?.trim() || null,
    shortDescription: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    price: Math.round(input.price),
    salePrice: salePrice === null ? null : Math.round(salePrice),
    stock: input.stockCount ?? 0,
    stockStatus: input.stockStatus,
    status: input.status ?? 'active',
    featured: Boolean(input.featured),
    newArrival: Boolean(input.isNew),
    onSale: salePrice !== null && salePrice < input.price,
    sizes: input.sizes,
    colors: input.colors.map((color) => ({
      name: color.name,
      swatch: color.swatch ?? null,
      available: color.available,
    })),
    tags: input.tags ?? [],
    seoTitle: input.seo?.title?.trim() || null,
    seoDescription: input.seo?.description?.trim() || null,
    categoryId: input.categoryId,
    brandId: input.brandId,
    media,
  };
}

/** The API returns `brandId`; the storefront `Product` type does not carry it. */
type ApiProduct = Product & { brandId?: string };

/** Client-side refinements the API does not express as query parameters. */
function applyLocalFilters(products: ApiProduct[], query: ProductQuery): ApiProduct[] {
  let results = products;

  if (query.availability?.length) {
    const allowed = new Set(query.availability);
    results = results.filter((product) => allowed.has(product.stockStatus));
  }
  if (query.inStockOnly) {
    results = results.filter((product) => product.stockStatus !== 'out-of-stock');
  }
  // Price filters apply to what the customer actually pays.
  if (typeof query.minPrice === 'number' || typeof query.maxPrice === 'number') {
    results = results.filter((product) => {
      const paid = effectivePrice(product.price, product.salePrice);
      if (typeof query.minPrice === 'number' && paid < query.minPrice) return false;
      if (typeof query.maxPrice === 'number' && paid > query.maxPrice) return false;
      return true;
    });
  }
  return results;
}

export const productService = {
  async list(query: ProductQuery = {}): Promise<Product[]> {
    const products = await api.get<ApiProduct[]>(
      `/products${toQuery({
        search: query.search,
        categoryId: query.categoryId,
        categorySlug: query.categorySlugs,
        brand: query.brands,
        featured: query.featured ? 'true' : undefined,
        onSale: query.onSale ? 'true' : undefined,
        isNew: query.isNew ? 'true' : undefined,
        sort: query.sort,
      })}`,
    );

    const filtered = applyLocalFilters(products, query);
    return query.limit ? filtered.slice(0, query.limit) : filtered;
  },

  async getBySlug(slug: string): Promise<Product> {
    const product = await api.get<ApiProduct>(`/products/${encodeURIComponent(slug)}`);
    // The endpoint serves admins too; the storefront must not show drafts.
    if (product.status && product.status !== 'active') {
      throw new ServiceError(`Product not found: ${slug}`, 404);
    }
    return product;
  },

  async related(productId: string, limit = 4): Promise<Product[]> {
    const source = await api.get<ApiProduct>(`/products/${encodeURIComponent(productId)}`);
    const products = await api.get<ApiProduct[]>(
      `/products${toQuery({ categoryId: source.categoryId, limit: limit + 1 })}`,
    );
    return products.filter((item) => item.id !== productId).slice(0, limit);
  },

  /** ADMIN READ — includes draft and archived products. */
  async listAll(query: AdminProductQuery = {}): Promise<Product[]> {
    return api.get<ApiProduct[]>(
      `/products${toQuery({
        all: 'true',
        search: query.search,
        categoryId: query.categoryId,
        brand: query.brand,
        status: query.status,
      })}`,
    );
  },

  async getById(id: string): Promise<Product> {
    return api.get<ApiProduct>(`/products/${encodeURIComponent(id)}`);
  },

  async create(input: ProductInput & { brandId?: string }): Promise<Product> {
    const brandId = await resolveBrandId(input);
    const product = await api.post<ApiProduct>('/products', { ...toApiPayload(input), brandId });
    repository.invalidate();
    return product;
  },

  async update(id: string, input: ProductInput & { brandId?: string }): Promise<Product> {
    const brandId = await resolveBrandId(input);
    const product = await api.put<ApiProduct>(`/products/${encodeURIComponent(id)}`, {
      ...toApiPayload(input),
      brandId,
    });
    repository.invalidate();
    return product;
  },

  async remove(id: string): Promise<void> {
    await api.delete<null>(`/products/${encodeURIComponent(id)}`);
    repository.invalidate();
  },

  /** Counts for the admin dashboard cards. No analytics — just totals. */
  async stats(): Promise<{ total: number; active: number; draft: number; featured: number; onSale: number }> {
    const products = await api.get<ApiProduct[]>('/products?all=true');
    return {
      total: products.length,
      active: products.filter((p) => (p.status ?? 'active') === 'active').length,
      draft: products.filter((p) => p.status === 'draft').length,
      featured: products.filter((p) => p.featured).length,
      onSale: products.filter((p) => p.salePrice && p.salePrice < p.price).length,
    };
  },

  async priceRange(): Promise<{ min: number; max: number }> {
    const products = await api.get<ApiProduct[]>('/products');
    const prices = products.map((product) => effectivePrice(product.price, product.salePrice));
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  },
};
