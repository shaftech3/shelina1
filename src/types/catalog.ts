/**
 * Catalog domain types.
 *
 * IMPORTANT ARCHITECTURAL RULE:
 * There is no global size list and no global colour list anywhere in this codebase.
 * Every product carries its own freely-authored `sizes` and `colors` arrays, exactly
 * as the admin will enter them per product in a later stage.
 */

import type { EntitySeo } from './admin';

export type ID = string;

/** A single image reference with the metadata needed to avoid layout shift. */
export interface ImageAsset {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

/** A size option authored manually per product. `value` is free-form on purpose. */
export interface ProductSize {
  /** Free-form label, e.g. "38", "UK 7", "Medium". No global enum. */
  value: string;
  available: boolean;
}

/** A colour option authored manually per product. */
export interface ProductColor {
  /** Free-form human name, e.g. "Rose Beige". No global enum. */
  name: string;
  /** Optional swatch value (any valid CSS colour) supplied by the admin. */
  swatch?: string;
  available: boolean;
  /** Optional image override shown when this colour is selected. */
  image?: ImageAsset;
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock' | 'pre-order';

/** Publication state. Draft/archived products never reach the storefront. */
export type ProductStatus = 'active' | 'draft' | 'archived';

/**
 * Optional product video.
 *
 * `src` is a plain URL so the admin can later point at an uploaded file or a
 * CDN. `poster` avoids downloading any video bytes until the customer asks for
 * it. Video is never required — products without one simply omit the field.
 */
export interface ProductVideo {
  src: string;
  poster?: string;
  /** Accessible description of the footage. */
  title: string;
}

export interface Product {
  id: ID;
  slug: string;
  name: string;
  brand?: string;
  categoryId: ID;
  /** Base price in store currency. */
  price: number;
  /** Optional discounted price; when set and lower than `price` it is the payable amount. */
  salePrice?: number | null;
  images: ImageAsset[];
  /** Per-product options — never derived from a global dictionary. */
  sizes: ProductSize[];
  colors: ProductColor[];
  stockStatus: StockStatus;
  /** Units on hand where known; caps the quantity selector. */
  stockCount?: number;
  featured?: boolean;
  isNew?: boolean;
  /** One-line summary used on cards and at the top of the detail page. */
  shortDescription?: string;
  /** Long-form copy shown on the detail page. Plain text — never raw HTML. */
  description?: string;
  sku?: string;
  /** Optional; absent for most products. */
  video?: ProductVideo;
  status?: ProductStatus;
  tags?: string[];
  /** Per-product SEO overrides authored in the admin. Falls back to name/description. */
  seo?: EntitySeo;
}

export interface Category {
  id: ID;
  slug: string;
  name: string;
  description?: string;
  image: ImageAsset;
  /** Optional grouping for future mega-menu construction. */
  group?: string;
  productCount?: number;
  featured?: boolean;
  seo?: EntitySeo;
}

export interface Brand {
  id: ID;
  slug: string;
  name: string;
  logo?: ImageAsset;
  description?: string;
  seo?: EntitySeo;
}
