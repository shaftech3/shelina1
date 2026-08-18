/**
 * Admin + settings domain types.
 *
 * These are deliberately shaped like future database rows so Stage 5 can map
 * them onto real tables without reworking the admin UI.
 *
 * ARCHITECTURAL RULE (unchanged from Stage 3):
 * There is no global size list and no global colour list. Product variants are
 * free-form strings the admin types by hand, per product.
 */

/** Site-wide SEO settings, editable at /admin/seo. */
export interface SeoSettings {
  siteTitle: string;
  siteDescription: string;
  /** Absolute or root-relative URL used when a page supplies no image. */
  defaultImage: string;
  keywords: string[];
  /** Open Graph overrides. Empty string means "fall back to the site value". */
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  /** Twitter/X overrides. Empty string falls back to the Open Graph value. */
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
}

/** Per-entity SEO overrides stored on products, categories and brands. */
export interface EntitySeo {
  /** Falls back to the entity name when empty. */
  title?: string;
  /** Falls back to the entity description when empty. */
  description?: string;
}

/**
 * The authenticated admin, as the UI sees them.
 *
 * Deliberately minimal: no password hash, no token, no permission matrix.
 * Stage 4 has exactly one role. Anything richer would be speculative.
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

export interface AdminSession {
  user: AdminUser;
  /** ISO timestamp. The mock adapter expires sessions like a real backend would. */
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * A stored media reference.
 *
 * Only URLs and metadata are persisted — never binary blobs. `POST /api/media`
 * returns this exact shape in Stage 5, so the product form is unaffected by
 * the switch from object URLs to real uploads.
 */
export interface MediaAsset {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}
