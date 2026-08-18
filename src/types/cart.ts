import type { ID, ImageAsset } from './catalog';

/**
 * Cart domain types.
 *
 * VARIANT IDENTITY IS THE CORE RULE HERE.
 * A cart line is identified by product + size + color, never by product alone.
 * Two lines of the same product with a different size or colour are separate
 * items; only an exact match on all three merges and increments quantity.
 *
 * Size and colour are stored as the free-form strings the product itself
 * declared. Nothing in this file knows about any global size or colour list,
 * because no such list exists in this codebase.
 */

export interface CartItem {
  /** Stable composite key: product + size + colour. See `cartItemKey`. */
  key: string;
  productId: ID;
  /** Kept so the cart can link back without a lookup. */
  slug: string;
  productName: string;
  brand?: string;
  /** The exact size string chosen, or null when the product declares none. */
  size: string | null;
  /** The exact colour name chosen, or null when the product declares none. */
  color: string | null;
  quantity: number;
  /** Price actually payable per unit at the time of adding (sale-aware). */
  unitPrice: number;
  /** Original list price, retained so the cart can show the saving. */
  listPrice: number;
  image?: ImageAsset;
  /** Upper bound from product stock, when known. */
  maxQuantity?: number;
}

/** Derived cart totals. No tax, shipping, or discount engine in this stage. */
export interface CartTotals {
  /** Sum of every line quantity — this is what the header badge shows. */
  count: number;
  /** Sum of unitPrice * quantity. */
  subtotal: number;
  /** Sum of (listPrice - unitPrice) * quantity across discounted lines. */
  savings: number;
  /** Number of distinct cart lines. */
  lineCount: number;
}

export interface Cart {
  items: CartItem[];
  /** Schema version so a future shape change can migrate stored carts. */
  version: number;
  updatedAt: string;
}

/**
 * Builds the composite identity for a cart line.
 *
 * Null size/colour collapse to an empty segment so a product with no options
 * yields a stable single key. Values are lower-cased and trimmed so trivial
 * authoring differences ("Black" vs "black ") don't create duplicate lines.
 */
export function cartItemKey(productId: ID, size: string | null, color: string | null): string {
  const normalise = (value: string | null) => (value ?? '').trim().toLowerCase();
  return `${productId}::${normalise(size)}::${normalise(color)}`;
}
